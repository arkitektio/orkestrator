import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Module-level scratch for the probe geometry memo (never escapes it). */
const probeGeometryScratch = {
  matrix: new THREE.Matrix4(),
  point: new THREE.Vector3(),
};

import { buildAffineMatrix } from "../../../platform/coords/worldTransform";
import {
  buildSliceMap,
  resolveSpatialSelection,
  resolveVoxelIndex,
  type AxisSelection,
} from "../../../platform/coords/selection";
import { createRafCoalescer } from "../../../platform/perf/rafCoalesce";
import { effectiveProbeLayerId, layerAnswersProbe } from "../../../platform/probe/probeTargeting";
import type { ProbeOrigin, ProbeResult } from "../../../platform/probe/probeTypes";
import {
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "../../../platform/probe/probeGating";
import { useBrushSkeletonStoreApi } from "../../annotations/enhancers/brushSkeletonStore";
import { useCreateSceneAnnotation } from "../../annotations/useCreateSceneAnnotation";
import { DESIGN_TOOL_GESTURES, useModeStore } from "../../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi, type LayerState } from "../../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../../platform/stores/viewerStore";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import type { LayerBrickPool } from "../residency/brickResidency";
import { useBrickStore } from "../store/brickSlice";

/**
 * Everything a brick-pool PLANE needs to answer the probe, extracted so the
 * layer components that own one do not each carry a copy.
 *
 * Lifted out of `BrickPlaneLayer` verbatim (no behaviour change) because a label
 * plane needs exactly this and nothing about it is intensity-specific: it maps a
 * pointer hit to a base-level voxel index and reads the value the pool already
 * has resident. What that value MEANS — an intensity to normalize, or an object
 * id to look a row up by — is the material's and the attribute plans' business,
 * not the probe's.
 *
 * Probing a label is in fact the primary interaction on one: it is what drives
 * `AttributeProbeTracker` to resolve the object's attribute row, which is the
 * same relation `colorBys` colours by.
 *
 * The hook owns the group ref because the viewer registration and the pointer
 * handlers both need it and they must not disagree about which group they mean.
 */

type ProbeGeometryContext = {
  xSelection: AxisSelection;
  ySelection: AxisSelection;
  zSelection: AxisSelection;
  volumePosition: [number, number, number];
  volumeSize: [number, number, number];
};

/**
 * The three pointer props, already gated. `undefined` rather than an
 * early-returning handler is deliberate and load-bearing: that is what keeps the
 * group out of R3F's pointermove raycast set (P20).
 */
export type BrickPlaneProbeHandlers = {
  onPointerMove?: (event: {
    buttons: number;
    point: THREE.Vector3;
    stopPropagation: () => void;
  }) => void;
  onPointerOut?: () => void;
  onPointerDown?: (event: {
    point: THREE.Vector3;
    shiftKey: boolean;
    stopPropagation: () => void;
  }) => void;
};

export const useBrickPlaneProbe = ({
  layerId,
  layer,
  pool,
}: {
  layerId: string;
  layer: LayerState | undefined;
  pool: LayerBrickPool | null;
}): { groupRef: React.MutableRefObject<THREE.Group>; handlers: BrickPlaneProbeHandlers } => {
  const groupRef = useRef<THREE.Group>(null!);

  const register = useViewerStore((s) => s.register);
  const unregister = useViewerStore((s) => s.unregister);
  const currentZ = useViewerStore((s) => s.currentZ);
  const planTargetLevel = useBrickStore((s) => s.nodePlans[layerId]?.targetLevel);
  const brickSystem = useBrickStore((s) => s.brickSystem);
  const viewerStoreApi = useViewerStoreApi();
  const sceneStoreApi = useSceneStoreApi();

  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  const designTool = useModeStore((s) => s.designTool);
  // The handler PROPS below are the raycast gate (P20), so the consuming
  // component must re-render when the gate's inputs change — which it does,
  // because these are store subscriptions read here.
  const gate: ProbeGateInput = {
    interactionMode,
    probeFollowsCursor,
    // The 2D plane never probes for ANNOTATE, so the armed tool cannot change
    // its answer — no `activeTool` subscription needed here.
    drawingToolActive: false,
    // Deliberately false: in 2D the RoiDrawer's own interaction plane drives
    // the rubber band, and a second hover probe would only fight it for the
    // event. The 3D volume is the one that must answer (no draw plane inside a
    // volume) — see platform/probe/probeGating.ts.
    annotateProbes: false,
  };
  const hoverEnabled = hoverProbeEnabled(gate);
  // DESIGN's click tools reach the 2D plane too — the label LIFT clicks here,
  // because the 3D label raymarcher answers no probe at all.
  const designClick =
    interactionMode === "DESIGN" && designTool != null && DESIGN_TOOL_GESTURES[designTool] === "volume-click";
  const clickEnabled = clickProbeEnabled(gate) || designClick;
  const { createPointAnnotation } = useCreateSceneAnnotation();
  const brushApi = useBrushSkeletonStoreApi();

  // Event-time resolution — fresh pin AND fresh layer list, no render
  // subscription: exactly one layer (the effective probe target) answers.
  const answersProbe = useCallback(
    () =>
      layerAnswersProbe(
        effectiveProbeLayerId(
          viewerStoreApi.getState().probeLayerId,
          sceneStoreApi.getState().layers,
        ),
        layerId,
      ),
    [viewerStoreApi, sceneStoreApi, layerId],
  );

  useEffect(() => {
    const refProxy = { kind: "layer" as const, id: layerId, ref: groupRef };
    register(refProxy);
    return () => unregister(refProxy);
  }, [layerId, register, unregister]);

  // Reads shapes/scales from the pool's (deduplicated) level geometry — the
  // raw dataArrays list may contain duplicate resolutions, so its indices do
  // not align with plan levels.
  // Memoized per placement/selection change: this used to run (with a
  // Matrix4 build + clone + invert) on every hover frame, twice on the
  // design path.
  const probeGeometryContext = useMemo((): ProbeGeometryContext | null => {
    if (!layer || !pool) return null;

    const levelIndex = Math.min(
      planTargetLevel ?? pool.geometry.levels.length - 1,
      pool.geometry.levels.length - 1,
    );
    const level = pool.geometry.levels[levelIndex];
    const [shapeX, shapeY, shapeZ] = level.spatialShape;
    const [scaleX, scaleY, scaleZ] = level.scale;

    const sliceMap = buildSliceMap(layer.lens.slices);
    const xSelection = resolveSpatialSelection(sliceMap[layer.xAxis ?? ""], shapeX);
    const ySelection = resolveSpatialSelection(sliceMap[layer.yAxis ?? ""], shapeY);

    let zSelection = resolveSpatialSelection(
      layer.zAxis ? sliceMap[layer.zAxis] : undefined,
      shapeZ,
    );
    if (currentZ !== undefined && Number.isFinite(currentZ)) {
      const inv = probeGeometryScratch.matrix.copy(buildAffineMatrix(layer)).invert();
      const pt = probeGeometryScratch.point.set(0, 0, currentZ).applyMatrix4(inv);
      const zIndex = Math.max(0, Math.min(shapeZ - 1, Math.round(pt.z / scaleZ)));
      zSelection = { start: zIndex, step: 1, length: 1 };
    }

    const width = xSelection.length * xSelection.step * scaleX;
    const height = ySelection.length * ySelection.step * scaleY;
    const depth = zSelection.length * zSelection.step * scaleZ;
    if (width <= 0 || height <= 0 || depth <= 0) return null;

    return {
      xSelection,
      ySelection,
      zSelection,
      // Corner-anchored group-local: the sliced box's CENTER in [0..total].
      volumePosition: [
        xSelection.start * scaleX + width / 2,
        ySelection.start * scaleY + height / 2,
        zSelection.start * scaleZ + depth / 2,
      ],
      volumeSize: [width, height, depth],
    };
  }, [planTargetLevel, currentZ, layer, pool]);

  const resolveProbeGeometryContext = useCallback(
    () => probeGeometryContext,
    [probeGeometryContext],
  );

  /** Group-local plane point → BASE (level-0) voxel, updateProbe's own math. */
  const baseVoxelAt = useCallback(
    (local: THREE.Vector3): [number, number, number] | null => {
      if (!layer || !pool) return null;
      const probeContext = resolveProbeGeometryContext();
      if (!probeContext) return null;
      const base = pool.geometry.levels[0];
      const totalX = base.spatialShape[0] * base.scale[0];
      const totalY = base.spatialShape[1] * base.scale[1];
      const u = local.x / totalX;
      const v = local.y / totalY;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      const clampedU = THREE.MathUtils.clamp(u, 0, 0.999999);
      const clampedV = THREE.MathUtils.clamp(v, 0, 0.999999);
      const levelIndex = Math.min(
        planTargetLevel ?? pool.geometry.levels.length - 1,
        pool.geometry.levels.length - 1,
      );
      const level = pool.geometry.levels[levelIndex];
      const baseShape = base.spatialShape;
      const baseZ = Math.round(resolveVoxelIndex(0.5, probeContext.zSelection) * level.scale[2]);
      return [
        Math.min(baseShape[0] - 1, Math.floor(clampedU * baseShape[0])),
        Math.min(baseShape[1] - 1, Math.floor(clampedV * baseShape[1])),
        Math.max(0, Math.min(baseShape[2] - 1, baseZ)),
      ];
    },
    [layer, pool, planTargetLevel, resolveProbeGeometryContext],
  );

  const updateProbe = useCallback(
    (
      points: { local: THREE.Vector3; world: THREE.Vector3 } | null,
      opts: { save: boolean; origin: ProbeOrigin },
    ) => {
      const { save, origin } = opts;
      const currentProbe = viewerStoreApi.getState().probedCoordinate;

      if (!points || !layer || !pool) {
        if (currentProbe?.layerId === layer?.id) {
          viewerStoreApi.getState().setProbedCoordinate(null);
        }
        return;
      }

      const probeContext = resolveProbeGeometryContext();
      if (!probeContext) return;

      // QUAD-PARITY mapping (createPlaneNodeMaterial): the rendered plane is
      // a corner-anchored totalX×totalY quad showing the FULL base array,
      // `baseVoxel = (u·shapeX, v·shapeY)` — group-local spans [0..total], so
      // uv is just the normalized group-local position.
      const base = pool.geometry.levels[0];
      const totalX = base.spatialShape[0] * base.scale[0];
      const totalY = base.spatialShape[1] * base.scale[1];
      const u = points.local.x / totalX;
      const v = points.local.y / totalY;

      if (u < 0 || u > 1 || v < 0 || v > 1) {
        if (currentProbe?.layerId === layer.id) {
          viewerStoreApi.getState().setProbedCoordinate(null);
        }
        return;
      }

      const clampedU = THREE.MathUtils.clamp(u, 0, 0.999999);
      const clampedV = THREE.MathUtils.clamp(v, 0, 0.999999);

      // Report BASE (level-0) voxels like the volume probe, so the readout
      // and downstream consumers address one coordinate system regardless of
      // the displayed LOD. The z slab still resolves through the slice /
      // currentZ selection at the displayed level.
      const levelIndex = Math.min(
        planTargetLevel ?? pool.geometry.levels.length - 1,
        pool.geometry.levels.length - 1,
      );
      const level = pool.geometry.levels[levelIndex];
      const baseShape = base.spatialShape;
      const baseZ = Math.round(
        resolveVoxelIndex(0.5, probeContext.zSelection) * level.scale[2],
      );
      // Shader lockstep with the plane material's `baseVoxel`: no flip.
      const voxelIndex: [number, number, number] = [
        Math.min(baseShape[0] - 1, Math.floor(clampedU * baseShape[0])),
        Math.min(baseShape[1] - 1, Math.floor(clampedV * baseShape[1])),
        Math.max(0, Math.min(baseShape[2] - 1, baseZ)),
      ];

      perfMonitor.markProbe(); // no-op unless a perf recording is armed
      const resident = brickSystem?.sampleResidentEx(layer.id, voxelIndex, levelIndex) ?? null;
      const channelCount = Math.max(1, pool.geometry.channelSlabCount);
      const nextProbe: ProbeResult = {
        layerId: layer.id,
        // Quad-centered normalized offset — the same ±0.5 frame the rendered
        // quad and the volume probe use (markers use `worldPos` anyway).
        localPos: [clampedU - 0.5, clampedV - 0.5, 0],
        voxelIndex,
        worldPos: [points.world.x, points.world.y, points.world.z],
        strategy: "plane",
        origin,
        // Always a measurement: the 2D plane does not answer ANNOTATE hover
        // (the RoiDrawer's own plane does) — see platform/probe/probeGating.ts.
        purpose: "readout",
        values: resident
          ? resident.values.map((value, channel) => ({ channel, value }))
          : Array.from({ length: channelCount }, (_, channel) => ({ channel, value: null })),
        provenance: resident
          ? { source: "resident", level: resident.level }
          : { source: "pending", level: levelIndex },
        dtype: pool.geometry.levels[0].dtype,
        sliceSignature: pool.sliceSignature,
      };

      // Only hover dedupes — a click must reach the store even when the hover
      // probe already sits on that voxel (it always does while follow-cursor is
      // on), because a click may re-pivot the camera or save the point.
      if (
        origin === "hover" &&
        !save &&
        currentProbe?.layerId === nextProbe.layerId &&
        currentProbe.voxelIndex.every((v, i) => v === nextProbe.voxelIndex[i])
      ) {
        return;
      }

      viewerStoreApi.getState().setProbedCoordinate(nextProbe);
      // Shift+click persists the point as a scene annotation (fire-and-forget;
      // it renders via the AnnotationLayer once the refetch lands).
      if (save && nextProbe.worldPos) createPointAnnotation(nextProbe.worldPos);
    },
    [
      layer,
      pool,
      brickSystem,
      planTargetLevel,
      resolveProbeGeometryContext,
      viewerStoreApi,
      createPointAnnotation,
    ],
  );

  // Pointermove storms coalesce to ≤1 probe per frame (see BrickVolumeLayer):
  // event-time thunks close over fresh props; only the newest runs per frame.
  const probeCoalescer = useMemo(() => createRafCoalescer<() => void>((run) => run()), []);
  useEffect(() => () => probeCoalescer.cancel(), [probeCoalescer]);

  const handlers: BrickPlaneProbeHandlers = {
    onPointerMove: !hoverEnabled
      ? undefined
      : (event) => {
          if (event.buttons !== 0) return;
          // Before stopPropagation: declining silently lets the event fall
          // through to the target layer behind this one.
          if (!answersProbe()) return;
          const group = groupRef.current;
          if (!group) return;
          event.stopPropagation();
          const world = event.point.clone();
          const local = group.worldToLocal(world.clone());
          probeCoalescer.schedule(() =>
            updateProbe({ local, world }, { save: false, origin: "hover" }),
          );
        },
    onPointerOut: !hoverEnabled
      ? undefined
      : () => {
          if (!answersProbe()) return;
          probeCoalescer.cancel();
          updateProbe(null, { save: false, origin: "hover" });
        },
    onPointerDown: !clickEnabled
      ? undefined
      : (event) => {
          if (!answersProbe()) return;
          const group = groupRef.current;
          if (!group) return;
          event.stopPropagation();
          const world = event.point.clone();
          const local = group.worldToLocal(world.clone());
          if (designClick && designTool) {
            // One probed click IS the whole design gesture on the plane
            // (lift/wand/blob/bridge): hand it to the brush store, whose
            // release runs the tool (`useBrushSkeleton.extract`).
            const voxel = baseVoxelAt(local);
            if (!voxel) return;
            const brush = brushApi.getState();
            brush.beginStroke(layerId, "blob", designTool);
            brush.addSample({ world: [world.x, world.y, world.z], voxel });
            brush.endStroke();
            return;
          }
          updateProbe({ local, world }, { save: event.shiftKey, origin: "click" });
        },
  };

  return { groupRef, handlers };
};

/**
 * The scene store's layer lookup, so a component and its probe agree on which
 * layer they are for without threading it in twice.
 *
 * Not "Plane" — the label VOLUME uses it too. `BrickVolumeLayer` deliberately
 * does not: a merged pass needs the whole `layers` array to group members, so it
 * subscribes to that and finds its own.
 */
export const useBrickLayer = (layerId: string): LayerState | undefined =>
  useSceneStore((s) => s.layers.find((l) => l.id === layerId));

/**
 * INTEGER base-voxel z of the displayed slab, for a 2D brick plane.
 *
 * One copy on purpose: the shader's slab mode applies the planner's floor chain
 * per level itself (`nodePlanning.slabLevelZ` ↔ `emitResolveBrickResidency`'s
 * `slabZ`), so there must be NO `+0.5` here. Adding one made the two disagree at
 * non-integer z scales — the planner fetched z=1 while the shader sampled z=2,
 * the lookup landed on an UNMAPPED entry, and the layer silently fell back to a
 * coarser level in a way that flipped with zoom. `planSlabZ` is in level-0
 * slices; scaling to base voxels is what `slabLevelZ` does.
 */
export const slabBaseZOf = (
  planSlabZ: number | null | undefined,
  pool: { geometry: { levels: readonly { scale: readonly number[] }[] } } | null,
): number => (planSlabZ ?? 0) * (pool?.geometry.levels[0]?.scale[2] ?? 1);
