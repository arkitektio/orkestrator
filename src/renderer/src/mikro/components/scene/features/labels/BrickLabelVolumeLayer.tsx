import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  createLabelVolumeNodeMaterial,
  updateLabelVolumeNodes,
} from "./labelNodeMaterials";
import { buildLabelUniformData, labelDataSignature } from "./labelUniforms";
import { useLabelColorLut } from "./useLabelColorLut";
import { buildAffineMatrix } from "../../platform/coords/worldTransform";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { useBrickLayer } from "../bricks/layers/useBrickPlaneProbe";
import { intersectLocalVolumeBox } from "../bricks/probeMath";
import { marchResidentBricks } from "../bricks/octree/brickSampling";
import { useBrushSkeletonStoreApi } from "../annotations/enhancers/brushSkeletonStore";
import { DESIGN_TOOL_GESTURES, useModeStore } from "../../platform/stores/modeStore";
import {
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "../../platform/probe/probeGating";
import { effectiveProbeLayerId, layerAnswersProbe } from "../../platform/probe/probeTargeting";
import type { ProbeOrigin, ProbeResult } from "../../platform/probe/probeTypes";
import { createRafCoalescer } from "@/core/lib/scene/perf/rafCoalesce";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useBrickMaterialBundle } from "../bricks/layers/useBrickMaterialBundle";
import {
  useStepScaleUniform,
  useVolumePassRegistration,
  useVolumeRayUniforms,
} from "../bricks/layers/useVolumeRayUniforms";
import { useBrickStore, useBrickStoreApi } from "../bricks/store/brickSlice";

/**
 * A label mask in 3D: a unit-box proxy whose fragment shader marches the brick
 * pool until it meets an object, then paints it.
 *
 * The projection is FIRST HIT and not one of the image path's four, because none
 * of them mean anything over object ids — MIP would keep the largest id, which is
 * an arbitrary object. The reasoning is stated in full on
 * `createLabelVolumeNodeMaterial`, and the card says "2D only" for `contour`,
 * which this deliberately does not implement.
 *
 * NO MERGED PASS, unlike the intensity raymarcher. Two `LabelLayer`s over one
 * lens DO share a pool (`poolKey` separates only on `valueSemantics`), so the
 * image path would raymarch them in a single pass and this one draws both at
 * full cost. Deferred rather than impossible — the merged material is the
 * channel compositor unrolled per member, so a label merge needs its own
 * unrolling, and two masks over one array is a rare enough scene to wait.
 *
 * PROBED by a FIRST-HIT march over the raw ids: with the march normalized to
 * the trivial [0, 1] window and a threshold of 0, "first sample above the
 * threshold" is exactly "first NON-BACKGROUND label along the ray" — the
 * object you see is the object you probe, since the shader's projection is
 * first-hit too. Deliberately not the intensity layer's full closure (no ROI
 * drawing, no merged-member bookkeeping): PROBE reads the id under the
 * cursor, and DESIGN's click tools (the label LIFT above all) capture here,
 * which is what makes lifting work in 3D and not only on the plane.
 */
export const BrickLabelVolumeLayer = ({ layerId }: { layerId: string }) => {
  perfMonitor.countRender("BrickLabelVolumeLayer"); // no-op unless a recording is armed

  const register = useViewerStore((s) => s.register);
  const unregister = useViewerStore((s) => s.unregister);
  // SCALAR plan subscriptions only (P9c/P17) — see BrickVolumeLayer.
  const planTargetLevel = useBrickStore((s) => s.nodePlans[layerId]?.targetLevel);
  const planMode = useBrickStore((s) => s.nodePlans[layerId]?.mode);
  useBrickStore((s) => s.poolsVersion);
  const brickSystem = useBrickStore((s) => s.brickSystem);

  const layer = useBrickLayer(layerId);

  /**
   * Registering the group is NOT optional, and its failure mode is silent.
   *
   * `trackables` → `visibilityTracker` → `computeSceneVisibility` →
   * `viewerStore.layerViewRanges` → `nodePlanTracker`'s `viewRange` argument to
   * `planLayerNodes`. Without an entry there, the planner builds no
   * `visibleBox`/`strictBox`, and `nodePlanning`'s `fetchBand` collapses: every
   * non-root node becomes band 1, so off-screen prefetch competes on equal
   * footing with the bricks actually on screen. Nothing errors — the mask just
   * streams in brick by brick instead of showing its coarse backdrop first and
   * refining what you are looking at.
   *
   * The 2D label plane gets this from `useBrickPlaneProbe`; a volume has no
   * probe yet, so it registers here.
   */
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  useEffect(() => {
    const refProxy = { kind: "layer" as const, id: layerId, ref: groupRef };
    register(refProxy);
    return () => unregister(refProxy);
  }, [layerId, register, unregister]);
  const invalidate = useThree((state) => state.invalidate);
  const viewerStoreApi = useViewerStoreApi();
  const sceneStoreApi = useSceneStoreApi();
  const brickStoreApi = useBrickStoreApi();
  const brushApi = useBrushSkeletonStoreApi();

  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  const designTool = useModeStore((s) => s.designTool);
  // The raycast gate (P20): PROBE hovers/clicks; DESIGN's click tools (LIFT)
  // arm while their key is held. ANNOTATE never probes a mask.
  const gate: ProbeGateInput = {
    interactionMode,
    probeFollowsCursor,
    drawingToolActive: false,
    annotateProbes: false,
  };
  const designClick =
    interactionMode === "DESIGN" && designTool != null && DESIGN_TOOL_GESTURES[designTool] === "volume-click";
  const hoverEnabled = hoverProbeEnabled(gate);
  const clickEnabled = clickProbeEnabled(gate) || designClick;

  // Pointermove storms coalesce to ≤1 march per frame (the BrickVolumeLayer
  // idiom): thunks close over a CLONED ray, only the newest runs.
  const probeCoalescer = useMemo(() => createRafCoalescer<() => void>((run) => run()), []);
  useEffect(() => () => probeCoalescer.cancel(), [probeCoalescer]);

  const affineMatrix = useMemo(
    () => (layer ? buildAffineMatrix(layer) : new THREE.Matrix4().identity()),
    [layer],
  );

  const pool = brickSystem?.getLayerPool(layerId) ?? null;

  const labelData = useMemo(() => buildLabelUniformData(layer), [layer]);
  const labelSignature = labelDataSignature(labelData);

  const bundle = useBrickMaterialBundle(
    pool,
    (p) => createLabelVolumeNodeMaterial(p, p, labelData),
  );

  // Every label-specific uniform in one push; the ray uniforms and the
  // camera-motion step scale are driven by the shared hooks below, which the
  // intensity raymarcher uses too.
  useEffect(() => {
    if (!bundle) return;
    updateLabelVolumeNodes(bundle.nodes, labelData);
    viewerStoreApi.getState().volumeInputs.bump("label-uniforms");
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, labelSignature, invalidate]);

  useVolumeRayUniforms(bundle?.nodes, {
    pool,
    desiredLevel: planTargetLevel,
    planTargetLevel,
    worldMatrix: affineMatrix,
  });
  // canvasPass=true: this material renders live in the canvas pass at full
  // buffer resolution, so it never gets the compositor's motion-time 0.5×
  // resolution cut and compensates with stride instead. No settleRefine for
  // the same reason — nothing amortizes a boosted budget here.
  useStepScaleUniform(bundle?.nodes, false, true);
  useVolumePassRegistration(!!bundle);

  // The picked colouring and the active filter rules, resolved into the
  // material's colour LUT. Shared with the other label mode — same table, same
  // indexing; only what a texel is USED for differs.
  useLabelColorLut(bundle?.nodes, layer);

  /**
   * First-hit over the RAW ids: normalization is the trivial [0, 1] window,
   * so any label ≥ 1 clamps to full visibility and background stays 0 — the
   * threshold-0 first-hit is exactly "first non-background voxel". Shares
   * `marchResidentBricks` with the intensity probe, so the voxel convention
   * (corner-anchored, no flip) cannot drift.
   */
  const probeFromRay = (ray: THREE.Ray, origin: ProbeOrigin): ProbeResult | null => {
    const mesh = meshRef.current;
    const plan = brickStoreApi.getState().nodePlans[layerId];
    if (!mesh || !pool || !plan || !brickSystem) return null;
    const inverseMatrix = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localOrigin = ray.origin.clone().applyMatrix4(inverseMatrix);
    const localDirection = ray.direction.clone().transformDirection(inverseMatrix).normalize();
    const bounds = intersectLocalVolumeBox(localOrigin, localDirection);
    if (!bounds) return null;
    perfMonitor.markProbe(); // no-op unless a perf recording is armed
    const baseLevel = pool.geometry.levels[0];
    const hit = marchResidentBricks({
      origin: [localOrigin.x, localOrigin.y, localOrigin.z],
      direction: [localDirection.x, localDirection.y, localDirection.z],
      bounds: [Math.max(bounds.start, 0), bounds.end],
      baseShape: baseLevel.spatialShape,
      desiredLevel: plan.targetLevel,
      channel: 0,
      minValue: 0,
      maxValue: 1,
      climMin: 0,
      climMax: 1,
      threshold: 0,
      strategy: "first-hit",
      sample: (baseVoxel, desiredLevel, channel) =>
        brickSystem.sampleResident(layerId, baseVoxel, desiredLevel, channel),
    });
    // A coverage fallback is a sample the ray never actually hit — for ids
    // that would name a wrong object, so only a true first hit answers.
    if (!hit || hit.fallback) return null;
    const shape = baseLevel.spatialShape;
    const clampIndex = (norm: number, extent: number) =>
      Math.max(0, Math.min(extent - 1, Math.floor(norm * extent)));
    const voxelIndex: [number, number, number] = [
      clampIndex(hit.position[0] + 0.5, shape[0]),
      clampIndex(hit.position[1] + 0.5, shape[1]),
      clampIndex(hit.position[2] + 0.5, shape[2]),
    ];
    const resident = brickSystem.sampleResidentEx(layerId, voxelIndex, plan.targetLevel);
    const world = new THREE.Vector3(hit.position[0], hit.position[1], hit.position[2]).applyMatrix4(
      mesh.matrixWorld,
    );
    return {
      layerId,
      localPos: [hit.position[0], hit.position[1], hit.position[2]],
      voxelIndex,
      worldPos: [world.x, world.y, world.z],
      strategy: "first-hit",
      origin,
      purpose: interactionMode === "DESIGN" ? "placement" : "readout",
      values: resident
        ? resident.values.map((value, channel) => ({ channel, value }))
        : [{ channel: 0, value: hit.rawValue }],
      provenance: resident
        ? { source: "resident", level: resident.level }
        : { source: "pending", level: plan.targetLevel },
      dtype: baseLevel.dtype,
      sliceSignature: pool.sliceSignature,
    };
  };

  const answersProbe = () =>
    layerAnswersProbe(
      effectiveProbeLayerId(viewerStoreApi.getState().probeLayerId, sceneStoreApi.getState().layers),
      layerId,
    );

  const updateProbe = (probe: ProbeResult | null) => {
    const state = viewerStoreApi.getState();
    if (!probe) {
      if (state.probedCoordinate?.layerId === layerId) state.setProbedCoordinate(null);
      return;
    }
    const cur = state.probedCoordinate;
    if (
      probe.origin === "hover" &&
      cur?.layerId === probe.layerId &&
      cur.voxelIndex.every((v, i) => v === probe.voxelIndex[i])
    ) {
      return;
    }
    state.setProbedCoordinate(probe);
  };

  if (layer?.visible === false) return null;
  if (planMode !== "3D" || !pool || !bundle) return null;

  const base = pool.geometry.levels[0];
  const volumeSize: [number, number, number] = [
    base.spatialShape[0] * base.scale[0],
    base.spatialShape[1] * base.scale[1],
    base.spatialShape[2] * base.scale[2],
  ];

  return (
    <group ref={groupRef} matrix={affineMatrix} matrixAutoUpdate={false}>
      {/* Corner-anchored: the unit box is offset by half its size so group-local
          spans [0..shape] and voxel v renders at exactly affine(v) —
          COORDINATE_SYSTEMS.md "Coordinate conventions". `renderOrder` 2 puts the
          mask above an image volume's 1, matching the 2D pair. */}
      {/* NOT tagged VOLUME_PASS_OBJECT: the compositor's offscreen target is
          an ADDITIVE-DELTA buffer (see brickNodeMaterials' blending note) and
          this material's NormalBlending cannot share it — the label raymarch
          renders live in the canvas pass, drawn AFTER the composite quad
          (renderOrder 2 > 1) exactly as it draws after image volumes today.
          Folding labels into their own cached target is a noted follow-up. */}
      <mesh
        key={pool.structureSignature}
        ref={meshRef}
        scale={volumeSize}
        position={[volumeSize[0] / 2, volumeSize[1] / 2, volumeSize[2] / 2]}
        renderOrder={2}
        onPointerMove={!hoverEnabled ? undefined : (e) => {
          if (e.buttons !== 0) return;
          if (!answersProbe()) return;
          e.stopPropagation();
          const ray = e.ray.clone();
          probeCoalescer.schedule(() => updateProbe(probeFromRay(ray, "hover")));
        }}
        onPointerOut={!hoverEnabled ? undefined : () => {
          if (!answersProbe()) return;
          probeCoalescer.cancel();
          updateProbe(null);
        }}
        onPointerDown={!clickEnabled ? undefined : (e) => {
          // ONE layer answers, always — the pinned probe target, by default
          // the first visible layer (`effectiveProbeLayerId`). Declining
          // WITHOUT stopPropagation lets the event fall through to it.
          if (!answersProbe()) return;
          if (designClick && designTool) {
            // One probed click IS the design gesture (LIFT above all): the
            // first non-background voxel seeds the tool. Decline off-object
            // clicks silently so the drag stays the camera's.
            const probe = probeFromRay(e.ray, "click");
            if (!probe?.worldPos) return;
            e.stopPropagation();
            const brush = brushApi.getState();
            brush.beginStroke(layerId, "blob", designTool);
            brush.addSample({ world: probe.worldPos, voxel: probe.voxelIndex });
            brush.endStroke();
            return;
          }
          e.stopPropagation();
          updateProbe(probeFromRay(e.ray, "click"));
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={bundle.material} attach="material" />
      </mesh>
    </group>
  );
};
