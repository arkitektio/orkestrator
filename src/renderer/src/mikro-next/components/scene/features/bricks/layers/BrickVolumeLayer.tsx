import { useCallback, useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { voxelWorldSizeOf } from "../../../platform/coords/worldTransform";

import { ProjectionMode } from "@/mikro-next/api/graphql";
import { marchResidentBricks } from "../octree/brickSampling";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { coldOpenTimeline } from "../../../platform/perf/coldOpenTimeline";
import { climToUnit } from "../../../platform/model/dataRange";
import { identityOf } from "../../../platform/model/objectIdentity";
import { layerIndexOf, layerPlanSignature } from "../../../platform/model/layerPlanKey";
import { intersectLocalVolumeBox } from "../probeMath";
import { resolveProbeStrategy } from "../../../platform/probe/probeModes";
import {
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "../../../platform/probe/probeGating";
import { createRafCoalescer } from "../../../platform/perf/rafCoalesce";
import {
  effectiveProbeLayerId,
  layerAnswersProbe,
} from "../../../platform/probe/probeTargeting";
import type { ProbeOrigin, ProbeResult } from "../../../platform/probe/probeTypes";
import { buildAffineMatrix } from "../../../platform/coords/worldTransform";
import { VOLUME_PASS_OBJECT } from "../../../platform/visibility/passVisibility";
import { DRAG_THRESHOLD_PX } from "../../annotations/drawGesture";
import { useCreateSceneAnnotation } from "../../annotations/useCreateSceneAnnotation";
import { DESIGN_TOOL_GESTURES, useModeStore } from "../../../platform/stores/modeStore";
import {
  isDrawingTool,
  isProbeDerivedTool,
  useRoiDrawingStore,
  useRoiDrawingStoreApi,
} from "../../annotations/roiDrawingStore";
import { useBrushSkeletonStoreApi } from "../../annotations/enhancers/brushSkeletonStore";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import {
  createVolumeNodeMaterial,
  updateChannelNodes,
  updateChannelWindows,
  updateMergedMemberNodes,
  updateCinematicNodes,
} from "../gpu/brickNodeMaterials";
import {
  buildChannelDataSignature,
  buildChannelWindowSignature,
} from "../gpu/channelDataSignature";
import { buildMergeMembers } from "../gpu/mergeMembers";
import {
  useStepScaleUniform,
  useVolumePassRegistration,
  useVolumeRayUniforms,
} from "./useVolumeRayUniforms";
import {
  buildMergedChannelUniformData,
  buildMergedChannelWindows,
  fixedMemberUniforms,
} from "../gpu/mergedChannelUniforms";
import {
  findMergeGroup,
  planVolumeMergeGroups,
} from "../gpu/volumeMergeGroups";
import { useBrickStore, useBrickStoreApi } from "../store/brickSlice";

/**
 * Brick-pool replacement for the monolithic `VolumeLayer`/`VolumeTextureMesh`
 * path: a single unit-box raymarcher whose samples walk the page table
 * (`sampleBrickEx`), so the volume streams view-dependently — fine bricks
 * near the camera, coarser fallback everywhere else — with bounded GPU
 * memory by construction.
 *
 * Marching happens in BASE VOXEL space (not the unit box): per-level
 * coordinates, per-sample LOD-by-distance and brick-granular empty-space
 * skipping all become simple axis-aligned math there. Multi-channel
 * compositing (per-sample, ChunkPlane semantics) feeds the projection
 * accumulators lifted from VolumeTextureMesh (MIP / AttenuatedMIP / Volume /
 * Isosurface) plus the picking pass.
 */

/**
 * The material a NON-PRIMARY merge member's mesh carries. The mesh must exist
 * (three raycasts invisible objects — probing/annotation/selection depend on
 * it, and the planner measures the layer's box through it) but it draws
 * nothing, so one shared, never-disposed material serves every such member
 * instead of one `MeshBasicMaterial` allocated and disposed per member.
 */
const HIDDEN_RAYCAST_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

const projectionModeToInt = (mode: ProjectionMode | undefined): number => {
  switch (mode) {
    case ProjectionMode.AttenuatedMip:
      return 1;
    case ProjectionMode.Volume:
      return 2;
    case ProjectionMode.Isosurface:
      return 3;
    default:
      return 0; // MIP
  }
};

/**
 * Scratch for `probeFromRay`, shared across layer instances.
 *
 * Safe because the march is synchronous, non-reentrant, and copies every value
 * out before returning — the same discipline as `brickSampling`'s
 * `baseVoxelScratch`. It runs up to once per frame per hovered volume, so the
 * Matrix4 + three Vector3s it replaces were a steady per-frame allocation.
 */
const probeScratch = {
  inverse: new THREE.Matrix4(),
  origin: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  world: new THREE.Vector3(),
};

// Stable integer per layer-object IDENTITY (layers are replaced immutably on
// edit, so identity IS the edit signal): `identityOf`, promoted to
// `platform/model/objectIdentity.ts` — the P9c/P17 scalar-key idiom this
// component pioneered, now shared by every bridge that needs it.

export const BrickVolumeLayer = ({ layerId }: { layerId: string }) => {
  perfMonitor.countRender("BrickVolumeLayer"); // no-op unless a perf recording is armed
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const viewerStoreApi = useBrickStoreApi();
  const roiDrawingApi = useRoiDrawingStoreApi();
  const brushApi = useBrushSkeletonStoreApi();
  const { createPointAnnotation } = useCreateSceneAnnotation();

  const register = useViewerStore((s) => s.register);
  const unregister = useViewerStore((s) => s.unregister);
  const isDebug = useViewerStore((s) => s.debug);
  // SCALAR plan subscriptions only (P9c/P17): the plan OBJECT gets a new
  // identity on every replan (≤5/s during a pan — its node list changes), but
  // this component consumes only targetLevel/mode. Subscribing to the scalars
  // means re-rendering only when those actually change (zoom-level crossings).
  // Anything needing the full plan (the probe closure) reads it via
  // viewerStoreApi.getState() at call time.
  const planTargetLevel = useBrickStore((s) => s.nodePlans[layerId]?.targetLevel);
  const planMode = useBrickStore((s) => s.nodePlans[layerId]?.mode);
  // Pool appears/rebuilds/disposes → re-render. NOT residencyVersion: that
  // bumps per upload batch while streaming and would re-render this component
  // continuously during a pan for nothing (texture updates are imperative).
  // The VALUE feeds the decode-uniform effect below: range moves (auto-range,
  // occupancy promotions) bump poolsVersion and the shader's decode uniforms
  // must follow the pool's ranges.
  const poolsVersion = useBrickStore((s) => s.poolsVersion);
  const brickSystem = useBrickStore((s) => s.brickSystem);

  // Scalar selectors ONLY: cameraPose/viewportSize are new objects on every
  // camera write (~16/s during an orbit) and would re-render all volume
  // layers continuously. The footprint scale depends on fov + viewport
  // height alone (both constant while orbiting); the camera position reaches
  // the shader through vOrigin.
  // `cameraMoving` is deliberately NOT a React subscription. It flips true on
  // every leading camera emission and false on every settle (~23 flips over a
  // 10 s orbit), and it feeds exactly ONE uniform — uStepScale. Subscribing
  // re-rendered every volume layer on each flip and re-ran the uniform effect
  // below, rebuilding all the pointer-handler closures and re-diffing the
  // group/mesh tree, for a single float. The dedicated effect further down
  // writes it imperatively instead. (4df81eea decoupled cameraPose,
  // viewportSize, the plan object and layerViewRanges; this was the one left.)
  // Quality tier / streaming flips are rare (P17-clean); re-runs the uniform
  // push below so uStepScale tracks the governor's profile.

  const sceneStoreApi = useSceneStoreApi();
  const pool = brickSystem?.getLayerPool(layerId) ?? null;
  // `pool.members` is replaced wholesale (a fresh Set) on each reconcile
  // without bumping poolsVersion, and a swap like {a,b,c,d} → {a,b,c,e}
  // changes neither the pool identity nor the Set size — so the Set's own
  // identity is the one safe memo key. memberIds below re-keys on CONTENT, so
  // an equal-contents replacement still yields a stable array downstream.
  const memberSet = pool?.members;
  const memberKey = useMemo(
    () => (memberSet ? [...memberSet].sort().join(",") : ""),
    [memberSet],
  );
  const memberIds = useMemo(
    () => (memberKey === "" ? [] : memberKey.split(",")),
    [memberKey],
  );

  // P9c/P17: subscribing to the whole `layers` ARRAY re-rendered every volume
  // layer on ANY layer edit — a contrast drag on one image re-rendered all N
  // volume components per tick. The merged pass genuinely needs the array
  // (member grouping + scene positions for the primary tie-break), so
  // subscribe to a SCALAR key over exactly what grouping reads — each
  // relevant layer's position and object identity — and read the array itself
  // through the store api only when the key says something relevant changed.
  // Unrelated structural changes (insert/remove elsewhere) shift the indices
  // in the key, so scene-order changes still re-render.
  const layersKey = useSceneStore((s) => {
    // Runs on EVERY scene-store write, per volume layer: the id→index map is
    // memoized per `layers` array so this is O(members), not O(members×layers).
    const indexOf = layerIndexOf(s.layers);
    let key = "";
    for (const id of memberIds) {
      const index = indexOf.get(id) ?? -1;
      key += `${index}:${identityOf(index >= 0 ? s.layers[index] : undefined)},`;
    }
    if (!memberIds.includes(layerId)) {
      const index = indexOf.get(layerId) ?? -1;
      key += `${index}:${identityOf(index >= 0 ? s.layers[index] : undefined)}`;
    }
    return key;
  });
  const layers = useMemo(
    () => sceneStoreApi.getState().layers,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layersKey, sceneStoreApi],
  );
  const layer = useMemo(() => layers.find((l) => l.id === layerId), [layers, layerId]);
  const interactionMode = useModeStore((s) => s.interactionMode);
  const designTool = useModeStore((s) => s.designTool);
  // Rare-cadence scalars: a deliberate slider drag and a deliberate toggle.
  const isoThreshold = useModeStore((s) => s.isoThreshold);
  const lightRig = useModeStore((s) => s.lightRig);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  // A RENDER subscription, unlike the event-time `roiDrawingApi.getState()`
  // reads it replaces: the handler PROPS below are the raycast gate (P20), so
  // this component has to re-render when the armed tool changes. Legal under
  // P17 — arming a tool is a toolbar click, not a render-cadence fact.
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const gate: ProbeGateInput = {
    interactionMode,
    probeFollowsCursor,
    drawingToolActive: isDrawingTool(activeTool),
    // The skeleton brush and the smooth blob both work THROUGH this volume's
    // probe march, so the volume is the one layer that arms for them.
    brushToolActive: activeTool === "BRUSH" || activeTool === "BLOB",
    designArmed: designTool !== null,
    // The volume answers ANNOTATE hover: inside a volume there is no draw
    // plane, so the probe IS the placement for every shape tool.
    annotateProbes: true,
  };
  const hoverEnabled = hoverProbeEnabled(gate);
  const clickEnabled = clickProbeEnabled(gate);

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

  // VALUE-stable (the NetworkCollectionLayer idiom): a per-tick layer
  // replacement recomputes, but an unchanged placement returns the SAME
  // Matrix4 — the ray-uniform and cinematic effects keyed on it, and R3F's
  // group-matrix apply, all stay quiet during a contrast drag.
  // `buildAffineMatrix` reads ONLY `layer.affineMatrix` (worldTransform.ts).
  const affineRef = useRef<THREE.Matrix4 | null>(null);
  const affineMatrix = useMemo(() => {
    const next = layer ? buildAffineMatrix(layer) : new THREE.Matrix4().identity();
    if (affineRef.current?.equals(next)) return affineRef.current;
    affineRef.current = next;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer?.affineMatrix]);

  // --- Merged pass ------------------------------------------------------
  //
  // Layers sharing a pool share the atlas, page table, geometry and value
  // range, so they can be raymarched in ONE pass instead of N. Each member
  // component independently derives the same grouping from the same store
  // snapshot (planVolumeMergeGroups is pure), then the group's PRIMARY carries
  // the merged material and the rest render nothing. No provider, no shared
  // state, no cross-component messaging. (`pool` / `memberIds` are derived
  // above, before the layers-key subscription that depends on them.)
  // Scalar selector: a joined string only changes identity when a member's
  // target level actually moves, so this does not re-render per replan.
  const memberLevelsKey = useBrickStore((s) => {
    // Per brick-store write (streaming cadence): a string concat, no array.
    let key = "";
    for (const id of memberIds) key += (s.nodePlans[id]?.targetLevel ?? -1) + ",";
    return key;
  });

  // STRUCTURAL member key: `buildMergeMembers` reads each member's scene
  // order, typename (label guard), visibility, placement and target level —
  // never a window field — so grouping must not re-derive on a contrast
  // drag's per-tick layer replacement. `layerPlanSignature` covers exactly
  // those reads (WeakMap-cached per layer object).
  const memberStructureKey = useMemo(
    () =>
      memberIds
        .map((id) => {
          const index = layers.findIndex((l) => l.id === id);
          return `${index}:${index >= 0 ? layerPlanSignature(layers[index]) : ""}`;
        })
        .join("|"),
    [memberIds, layers],
  );

  const mergeGroup = useMemo(() => {
    if (!pool) return null;
    const members = buildMergeMembers({
      memberIds,
      layers,
      targetLevelOf: (id) => viewerStoreApi.getState().nodePlans[id]?.targetLevel,
    });
    return findMergeGroup(planVolumeMergeGroups(members), layerId);
    // `memberStructureKey` stands for every layer field the grouping reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, memberIds, memberStructureKey, memberLevelsKey, layerId, viewerStoreApi]);

  /** Non-primary members of a merged group draw nothing — the primary does. */
  const isPrimary = mergeGroup === null || mergeGroup.primaryId === layerId;
  const groupMemberIds = useMemo(
    () => mergeGroup?.memberIds ?? [layerId],
    [mergeGroup, layerId],
  );
  const groupKey = groupMemberIds.join(",");

  /**
   * Atlas slab this LAYER's first source taps, for the CPU probe march.
   *
   * Deliberately derived from the layer rather than read out of `channelData`:
   * under a merged pass that array holds every member's slots, and a
   * non-primary member has no `channelData` at all — but probing must still
   * work on it. Mirrors slot 0 of `buildChannelUniformData`.
   */
  const probeChannelIndex = useMemo(() => {
    const source = (layer?.sources ?? layer?.channels ?? [])[0];
    if (!source) return 0;
    const maxIndex = Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1);
    if (source.type === "channel") {
      return Math.min(maxIndex, Math.max(0, source.intensityIndex ?? 0));
    }
    // A phasor's intensity tap is its mean-photon-count slab.
    const iSlab = (pool?.geometry.slabs ?? []).findIndex(
      (slab) => slab.kind === "phasor" && slab.node === 0 && slab.component === "i",
    );
    return iSlab === -1 ? 0 : iSlab;
  }, [layer?.sources, layer?.channels, pool?.geometry]);

  // Value signature over exactly the member fields the uniform builders read.
  // Keying the memo below on this instead of the `layers` ARRAY means an edit
  // to an unrelated layer (or to a field the builders never read) no longer
  // pays the per-member texture allocations. Memoized on `layers` identity so
  // renders triggered by plan/quality changes (the ones that happen during a
  // gesture) skip the per-member JSON.stringify entirely.
  const channelDataKey = useMemo(
    () =>
      isPrimary
        ? groupMemberIds
            .map((id) => buildChannelDataSignature(layers.find((l) => l.id === id)))
            .join("|")
        : "",
    [isPrimary, groupMemberIds, layers],
  );

  // Only the PRIMARY builds this: it allocates two DataTextures and a colormap
  // atlas per call, so having all N members build the identical merged data
  // would trade N raymarch passes for N allocations on every channel edit.
  const channelData = useMemo(
    () =>
      !isPrimary
        ? null
        : buildMergedChannelUniformData(
        groupMemberIds.map((id, index) => ({
          layerId: id,
          layer: layers.find((l) => l.id === id),
          slotOffset: index,
        })),
        Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1),
        pool?.minValue ?? 0,
        pool?.maxValue ?? 1,
        pool?.geometry,
        (l) => projectionModeToInt(l?.projection),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isPrimary,
      groupKey,
      channelDataKey,
      pool?.geometry,
      pool?.spec.channelCount,
      pool?.minValue,
      pool?.maxValue,
    ],
  );

  // NOTE: the colormap atlas is NOT disposed per channelData change — the
  // material stays bound to one long-lived texture whose contents
  // `updateChannelNodes` refreshes in place (disposing a still-bound texture
  // made WebGPU sample its default white texture → gray composites). The
  // bound texture is disposed with the bundle below.

  // Step sizing from the plan's finest requested level: half a voxel of that
  // level. The actual per-sample step adapts to the LOD sampled at that point
  // (see stepLen in the shader); the in-shader rayLen/MAX_STEPS floor
  // guarantees every ray reaches its exit within the loop bound.
  // The per-member COMPILE-TIME specializations, as one key. The material omits
  // the phasor branch for a member without phasor sources, and emits a simple
  // member's contribution as straight-line code instead of a slot loop — so
  // either flipping must REBUILD the material, unlike ordinary channel edits,
  // which flow through the uniform nodes.
  //
  // `isSimpleIntensity` flips on an ordinary-looking edit: adding a transfer
  // curve or an invert demotes a layer's `renderKind` from "intensity" to
  // "graph", and the compiled shader cannot express the new shape. That is the
  // whole reason this is a key and not a uniform.
  const specializationKey = channelData
    ? channelData.members
        .map(
          (m) =>
            `${m.hasPhasorSources ? "p" : "-"}${m.isSimpleIntensity ? "s" : "-"}${m.isRgb ? "r" : "-"}`,
        )
        .join("")
    : "";

  // TSL node material. Recreated only when
  // the pool is rebuilt (mesh remounts on that key); everything dynamic flows
  // through the uniform NODES below.
  // NOT `useBrickMaterialBundle`, unlike the other three brick layers: this
  // material rebuilds on more than the pool's structure — membership changes
  // (the shader unrolls per member) and phasor gain/loss (compile-time
  // specialization) — which the shared hook's fixed dependency list cannot
  // express. Folding it in would have to either drop those triggers or hand the
  // hook a dep array, and a hook that takes its own deps is not an abstraction.
  const bundle = useMemo(() => {
    if (!pool || !channelData) return null;
    // TSL node-graph construction is real JS work (per-member unrolled
    // emission) and runs inside this commit; the WGSL pipeline compile then
    // lands in the next render frame. Both show up as "[Violation] rAF
    // handler took Nms" with no attribution — name it here when it is big.
    const buildStartedAt = performance.now();
    const created = createVolumeNodeMaterial(pool, pool, channelData, groupMemberIds.length);
    const buildMs = performance.now() - buildStartedAt;
    coldOpenTimeline.stamp("materialBuilt");
    if (buildMs >= 40) {
      console.warn(
        `[scene-perf] volume material build (${groupMemberIds.length} member(s)) took ${buildMs.toFixed(0)} ms`,
      );
    }
    created.nodes.uBaseShape.value.set(
      pool.geometry.levels[0].spatialShape[0],
      pool.geometry.levels[0].spatialShape[1],
      pool.geometry.levels[0].spatialShape[2],
    );
    return created;
    // Rebuilt on MEMBERSHIP change (the shader unrolls per member) and on a
    // member gaining/losing phasor sources (compile-time specialization), not
    // on channel edits — those flow through the uniform nodes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pool?.structureSignature, groupMemberIds.length, channelData === null, specializationKey]);

  /**
   * A non-primary member still needs a mounted mesh — three raycasts invisible
   * objects, so probing/annotation/selection depend on it, and the planner
   * measures this layer's box through it. It does NOT need the raymarcher: the
   * primary's merged pass already draws its channels.
   */
  const hiddenMaterial = isPrimary ? null : HIDDEN_RAYCAST_MATERIAL;

  useEffect(() => {
    const material = bundle?.material;
    return () => {
      material?.dispose();
      // Whatever textures are bound at teardown (adoption keeps them long-lived).
      bundle?.nodes.colormapAtlas.value?.dispose();
      // Absent on a SLIM (all-fixed-shape) material.
      bundle?.nodes.sourceParams?.value?.dispose();
      bundle?.nodes.cursorParams?.value?.dispose();
    };
  }, [bundle]);

  // Dynamic uniform-node pushes (no material rebuild).
  useEffect(() => {
    if (!bundle || !channelData || planTargetLevel === undefined) return;
    const n = bundle.nodes;
    updateChannelNodes(n, channelData);
    n.minValue.value = pool?.minValue ?? 0;
    n.maxValue.value = pool?.maxValue ?? 1;
    // The five RAY uniforms are pushed by `useVolumeRayUniforms` below —
    // shared with the label raymarcher, and kept next to the shader half in
    // `volumeRayNodes.ts` that they must stay in lockstep with.
    // Per-member projection/blend/slot range. For a lone layer this is the one
    // member and behaves exactly as the old single `projectionMode` write.
    updateMergedMemberNodes(
      n,
      channelData.members.map((m) => ({
        slotFirst: m.slotFirst,
        slotCount: m.slotCount,
        blendMode: m.blendMode,
        projectionMode: m.projectionMode,
        // Scene-wide, session-only (`modeStore.isoThreshold`): ProjectionNode
        // has no threshold field to persist to. Per-member because the shader
        // reads it per member, not because it varies per layer today.
        isoThreshold,
        // The fixed-shape arms read these instead of the slot arrays.
        fixed: fixedMemberUniforms(channelData, m),
      })),
    );
    viewerStoreApi.getState().volumeInputs.bump("channel-uniforms");
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, channelData, planTargetLevel, layer?.projection, isoThreshold, invalidate]);

  // WINDOW fast path: a clim/gamma/opacity drag moves only the window
  // signature (buildChannelWindowSignature), which the structure-keyed
  // `channelData` memo deliberately ignores — so the full rebuild above
  // (colormap atlas + two DataTextures per member per tick) never runs for a
  // drag. This effect writes the fresh scalars straight into the existing
  // uniform nodes instead. Runs redundantly after a structural rebuild (both
  // keys move) — a harmless double write of identical values.
  const channelWindowKey = useMemo(
    () =>
      isPrimary
        ? groupMemberIds
            .map((id) => buildChannelWindowSignature(layers.find((l) => l.id === id)))
            .join("|")
        : "",
    [isPrimary, groupMemberIds, layers],
  );
  useEffect(() => {
    if (!bundle || !channelData) return;
    const windows = buildMergedChannelWindows(
      groupMemberIds.map((id, index) => ({
        layerId: id,
        layer: layers.find((l) => l.id === id),
        slotOffset: index,
      })),
      channelData.members,
      pool?.minValue ?? 0,
      pool?.maxValue ?? 1,
    );
    updateChannelWindows(bundle.nodes, windows, channelData.members);
    // Same contract as every uniform write: the compositor cache key must
    // move or the cached composite serves the stale window (R1).
    viewerStoreApi.getState().volumeInputs.bump("channel-window");
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bundle,
    channelData,
    channelWindowKey,
    pool?.minValue,
    pool?.maxValue,
    invalidate,
  ]);

  // Range-decode uniforms, tracked on every poolsVersion bump: the pool's
  // ranges MOVE at runtime (float auto-contrast; occupancy observed-range
  // promotions) and the encode↔decode lockstep requires the uniforms to
  // follow. Deliberately its own effect: the channel-uniform effect above
  // keys on layer settings and would not re-run on a pure range move.
  useEffect(() => {
    if (!bundle || !pool) return;
    /* eslint-disable react-hooks/immutability --
     * Uniform nodes are deliberately mutable handles into a compiled shader
     * graph (see useVolumeRayUniforms' module header). */
    const n = bundle.nodes;
    n.minValue.value = pool.minValue;
    n.maxValue.value = pool.maxValue;
    n.uEmptyDecodeMin.value = pool.minValue;
    n.uEmptyDecodeRange.value = pool.maxValue - pool.minValue;
    n.uOccDecodeMin.value = pool.occEncodeMin;
    n.uOccDecodeRange.value = pool.occEncodeMax - pool.occEncodeMin;
    /* eslint-enable react-hooks/immutability */
    // MUST bump the compositor tracker, not just invalidate: the frame that
    // consumed the new poolsVersion in its cache key ran BEFORE this effect
    // committed (priority-0 drain bumps, priority-1 compositor renders, in
    // the same rAF) — without a tracker delta the stale-uniform composite
    // would be served from cache indefinitely.
    viewerStoreApi.getState().volumeInputs.bump("pool-range");
    invalidate();
  }, [bundle, pool, poolsVersion, invalidate, viewerStoreApi]);

  useVolumeRayUniforms(bundle?.nodes, {
    pool,
    // The FINEST level any member planned: residency is shared and the walk goes
    // coarser from here, so this is the finest data actually resident.
    desiredLevel: mergeGroup?.targetLevel ?? planTargetLevel,
    planTargetLevel,
    // Merged groups share one affine by construction (quantized affine keys
    // in the merge grouping), so the primary's matrix speaks for the group.
    worldMatrix: affineMatrix,
  });

  // The CINEMATIC light rig. Six scalar writes, no rebuild — and `uBaseScale`
  // rides along because the shading normal is meaningless without it (C3): the
  // gradient is taken in level voxels, and microscopy z-steps are routinely 5×
  // the lateral pitch, so an uncorrected normal visibly tilts toward z.
  //
  // NOTE this uses the layer's true voxel→world scale unconditionally, unlike
  // `uVoxelWorldSize` above, which the `orkestrator.worldLod` flag can pin to
  // (1,1,1): that flag is an LOD-metric policy, while anisotropy correction is
  // a geometric fact about the data.
  useEffect(() => {
    const nodes = bundle?.nodes;
    if (!nodes) return;
    const worldSize = affineMatrix ? voxelWorldSizeOf(affineMatrix) : null;
    updateCinematicNodes(nodes, {
      baseScale: new THREE.Vector3(
        worldSize?.[0] ?? 1,
        worldSize?.[1] ?? 1,
        worldSize?.[2] ?? 1,
      ),
      ...lightRig,
    });
    viewerStoreApi.getState().volumeInputs.bump("cinematic");
    invalidate();
  }, [bundle, lightRig, affineMatrix, invalidate, viewerStoreApi]);

  useStepScaleUniform(bundle?.nodes, /* settleRefine — image material */ true);
  useVolumePassRegistration(!!bundle);

  // --- Probing: CPU march over the resident bricks (shader lockstep) -------
  const probeFromRay = (ray: THREE.Ray, origin: ProbeOrigin): ProbeResult | null => {
    const mesh = meshRef.current;
    // Event-time read of the full plan — no render subscription needed for it.
    const state = viewerStoreApi.getState();
    const plan = state.nodePlans[layerId];
    if (!mesh || !pool || !plan || !brickSystem) return null;
    const inverseMatrix = probeScratch.inverse.copy(mesh.matrixWorld).invert();
    const localOrigin = probeScratch.origin.copy(ray.origin).applyMatrix4(inverseMatrix);
    const localDirection = probeScratch.direction
      .copy(ray.direction)
      .transformDirection(inverseMatrix)
      .normalize();
    const bounds = intersectLocalVolumeBox(localOrigin, localDirection);
    if (!bounds) return null;
    perfMonitor.markProbe(); // no-op unless a perf recording is armed

    // "Auto" picks the strategy matching what the projection shows on screen.
    const { strategy, threshold } = resolveProbeStrategy(
      state.probeMode,
      layer?.projection,
      state.probeThreshold,
    );
    const baseLevel = pool.geometry.levels[0];
    const hit = marchResidentBricks({
      origin: [localOrigin.x, localOrigin.y, localOrigin.z],
      direction: [localDirection.x, localDirection.y, localDirection.z],
      bounds: [Math.max(bounds.start, 0), bounds.end],
      baseShape: baseLevel.spatialShape,
      desiredLevel: plan.targetLevel,
      channel: probeChannelIndex,
      minValue: pool.minValue,
      maxValue: pool.maxValue,
      // layer.climMin/climMax are absolute base-native; marchResidentBricks works
      // in the shader's normalized [0,1] space.
      climMin: climToUnit(layer?.climMin, pool.minValue, pool.maxValue, 0),
      climMax: climToUnit(layer?.climMax, pool.minValue, pool.maxValue, 1),
      gamma: layer?.gamma ?? 1,
      threshold,
      strategy,
      sample: (baseVoxel, desiredLevel, channel) =>
        brickSystem.sampleResident(layerId, baseVoxel, desiredLevel, channel),
    });
    if (!hit) return null;

    const localPos = [hit.position[0], hit.position[1], hit.position[2]] as [
      number,
      number,
      number,
    ];
    const shape = baseLevel.spatialShape;
    const clampIndex = (norm: number, extent: number) =>
      Math.max(0, Math.min(extent - 1, Math.floor(norm * extent)));
    // Shader lockstep with `toBaseVoxel`: unit-box local → corner-anchored
    // voxel, no flip.
    const voxelIndex: [number, number, number] = [
      clampIndex(localPos[0] + 0.5, shape[0]),
      clampIndex(localPos[1] + 0.5, shape[1]),
      clampIndex(localPos[2] + 0.5, shape[2]),
    ];
    // One all-channels read at the hit voxel (per hit, not per march step).
    const resident = brickSystem.sampleResidentEx(layerId, voxelIndex, plan.targetLevel);
    const channelCount = Math.max(1, pool.geometry.channelSlabCount);
    const world = probeScratch.world
      .set(localPos[0], localPos[1], localPos[2])
      .applyMatrix4(mesh.matrixWorld);
    return {
      layerId,
      localPos,
      voxelIndex,
      worldPos: [world.x, world.y, world.z],
      strategy,
      origin,
      // In ANNOTATE the probe is the drawer's cursor, not a measurement — the
      // HUD and the attribute plans skip it (platform/probe/probeTypes.ts).
      purpose: interactionMode === "ANNOTATE" || interactionMode === "DESIGN" ? "placement" : "readout",
      values: resident
        ? resident.values.map((value, channel) => ({ channel, value }))
        : Array.from({ length: channelCount }, (_, channel) => ({ channel, value: null })),
      provenance: resident
        ? { source: "resident", level: resident.level }
        : { source: "pending", level: plan.targetLevel },
      dtype: baseLevel.dtype,
      sliceSignature: pool.sliceSignature,
    };
  };

  const updateProbe = (probe: ProbeResult | null, save: boolean) => {
    const state = viewerStoreApi.getState();
    if (!probe) {
      if (state.probedCoordinate?.layerId === layerId) state.setProbedCoordinate(null);
      return;
    }

    // Hover fires per frame; only voxel-crossings (or strategy flips) reach the
    // store. Values are the resident-LOD read — good enough for hover by design
    // (no per-hover chunk fetches).
    //
    // Only hover dedupes. A click is a deliberate act — it may re-pivot the
    // camera or save the point — so it must reach the store even when the hover
    // probe is already sitting on that exact voxel, which it always is while
    // follow-cursor is on.
    const cur = state.probedCoordinate;
    if (
      probe.origin === "hover" &&
      !save &&
      cur?.layerId === probe.layerId &&
      cur.strategy === probe.strategy &&
      cur.voxelIndex.every((v, i) => v === probe.voxelIndex[i])
    ) {
      return;
    }
    state.setProbedCoordinate(probe);
    // Shift+click persists the point as a scene annotation (fire-and-forget;
    // it renders via the AnnotationLayer once the refetch lands).
    if (save && probe.worldPos) createPointAnnotation(probe.worldPos);
  };

  // Pointermove storms coalesce to ≤1 march per frame: the handler schedules
  // a thunk (built at event time, so it closes over fresh props and a cloned
  // ray — R3F mutates the event's ray in place) and only the newest runs.
  const probeCoalescer = useMemo(() => createRafCoalescer<() => void>((run) => run()), []);
  useEffect(() => () => probeCoalescer.cancel(), [probeCoalescer]);

  if (layer?.visible === false) return null;
  if (planMode !== "3D" || !pool) return null;
  // The primary must have its material before it can draw; a non-primary
  // renders the invisible placeholder and keeps its interaction surface.
  const meshMaterial = isPrimary ? bundle?.material : hiddenMaterial;
  if (!meshMaterial) return null;

  const base = pool.geometry.levels[0];
  const volumeSize: [number, number, number] = [
    base.spatialShape[0] * base.scale[0],
    base.spatialShape[1] * base.scale[1],
    base.spatialShape[2] * base.scale[2],
  ];

  return (
    <group
      ref={groupRef}
      matrix={affineMatrix}
      matrixAutoUpdate={false}
      // `undefined` when hover probing is off, NOT a handler that early-returns:
      // that is what takes this group out of R3F's pointermove raycast set
      // entirely (platform/probe/probeGating.ts, P20). ANNOTATE arms for EVERY
      // shape tool — in 3D the probe IS the placement, for a path's next vertex
      // exactly as much as for a sphere's center, and the drawer's rubber band
      // follows the published probe.
      onPointerMove={!hoverEnabled ? undefined : (e) => {
        // A live brush stroke owns the drag: paint through the probe march
        // instead of bailing to OrbitControls (which the stroke session has
        // disabled for the stroke's duration).
        const brush = brushApi.getState();
        if (brush.status === "painting" && brush.strokeLayerId === layerId) {
          e.stopPropagation();
          const ray = e.ray.clone();
          probeCoalescer.schedule(() => {
            const probe = probeFromRay(ray, "hover");
            // Off-data moves paint nothing; the corridor tolerates gaps.
            if (probe?.worldPos) {
              brushApi.getState().addSample({
                world: probe.worldPos,
                voxel: probe.voxelIndex,
              });
            }
          });
          return;
        }
        if (e.buttons !== 0) return;
        // A primitive being SIZED owns the pointer: the drawer rubber-bands
        // the radius on the world plane through its anchor and never reads the
        // hover probe for it. Claiming the move here would swallow the sizing
        // event whenever this box raycasts nearer than the drawer's capture
        // quad — which its `side` and the camera's pivot decide. Declined
        // WITHOUT stopPropagation, so the drawer sees the move either way;
        // the same flag already makes the COMMIT click order-independent.
        if (
          interactionMode === "ANNOTATE" &&
          roiDrawingApi.getState().primitiveSessionActive
        ) {
          return;
        }
        // Declined BEFORE stopPropagation, so the event falls through to the
        // target layer behind this one instead of being swallowed here.
        if (!answersProbe()) return;
        // The event already raycast this volume's box, so the front-most
        // volume claims the hover; the march itself is deferred to the frame.
        e.stopPropagation();
        const ray = e.ray.clone();
        probeCoalescer.schedule(() => updateProbe(probeFromRay(ray, "hover"), false));
      }}
      onPointerOut={!hoverEnabled ? undefined : () => {
        // Clearing the probe on the way out is what tells the drawer the
        // pointer left the data: a click out there marks nothing.
        if (!answersProbe()) return;
        probeCoalescer.cancel();
        updateProbe(null, false);
      }}
      onPointerDown={!clickEnabled ? undefined : (e) => {
        if (interactionMode === "PROBE" && !answersProbe()) {
          return;
        }
        if (interactionMode === "PROBE") {
          e.stopPropagation();
          // Synchronous: click latency matters, click storms don't.
          updateProbe(probeFromRay(e.ray, "click"), e.shiftKey);
          return;
        }
        // DESIGN captures only while a tool key is held; the tool's GESTURE
        // class says which branch owns the pointer (`DESIGN_TOOL_GESTURES`).
        // A bare drag is the camera's, as in NAVIGATE.
        const designGesture =
          interactionMode === "DESIGN" && designTool ? DESIGN_TOOL_GESTURES[designTool] : null;
        if (
          (interactionMode === "ANNOTATE" && roiDrawingApi.getState().activeTool === "BLOB") ||
          designGesture === "volume-click"
        ) {
          // The smooth blob: one probed point IS the whole gesture — the
          // grow loop takes it from here. Same single-layer decline rule.
          if (!answersProbe()) return;
          const probe = probeFromRay(e.ray, "click");
          if (!probe?.worldPos) return;
          e.stopPropagation();
          const brush = brushApi.getState();
          brush.beginStroke(layerId, "blob", designTool ?? "blob");
          brush.addSample({ world: probe.worldPos, voxel: probe.voxelIndex });
          brush.endStroke();
          return;
        }
        if (
          (interactionMode === "ANNOTATE" && roiDrawingApi.getState().activeTool === "BRUSH") ||
          designGesture === "volume-stroke"
        ) {
          // The brush stroke: capture the pointer so the paint keeps landing
          // here even when the ray leaves the volume box mid-stroke, and so
          // the release always reaches onPointerUp below. Same single-layer
          // rule as placement — decline WITHOUT stopPropagation so the event
          // falls through to the probe target behind this one.
          if (!answersProbe()) return;
          const probe = probeFromRay(e.ray, "click");
          // The stroke must START on the data — its first probed voxel seeds
          // the geodesic.
          if (!probe?.worldPos) return;
          e.stopPropagation();
          (e.target as { setPointerCapture?: (id: number) => void })
            .setPointerCapture?.(e.pointerId);
          const brush = brushApi.getState();
          brush.beginStroke(layerId, "stroke", designTool ?? "brush");
          brush.addSample({ world: probe.worldPos, voxel: probe.voxelIndex });
          return;
        }
        if (
          interactionMode === "ANNOTATE" &&
          isDrawingTool(roiDrawingApi.getState().activeTool)
        ) {
          // The probe target must answer annotation placement too — every 3D
          // vertex comes from the probe, so placement follows the same
          // single-layer rule. Declined WITHOUT stopPropagation so the event
          // falls through to the target layer's mesh behind this one (same
          // pattern as the hover probe above).
          if (!answersProbe()) return;
          // Feedback only, and the point the drawer will read: the marker and
          // axis guides land on it before the click event arrives. What gets
          // created happens in onClick (here, or in the drawer's), which R3F
          // drag-guards via e.delta.
          updateProbe(probeFromRay(e.ray, "click"), false);
        }
      }}
      onPointerUp={!clickEnabled ? undefined : (e) => {
        // The stroke's release: extraction is triggered by the store's
        // painting → extracting transition (`BrushStrokeSession`). Guarded on
        // OUR live stroke so an unrelated pointerup is ignored.
        const brush = brushApi.getState();
        if (brush.status !== "painting" || brush.strokeLayerId !== layerId) return;
        e.stopPropagation();
        (e.target as { releasePointerCapture?: (id: number) => void })
          .releasePointerCapture?.(e.pointerId);
        probeCoalescer.cancel();
        brush.endStroke();
      }}
      onLostPointerCapture={!clickEnabled ? undefined : () => {
        // Belt-and-braces: a cancelled pointer (tab switch, OS gesture) must
        // not leave a stroke painting forever. After a normal release this is
        // a no-op — endStroke() already moved the status on.
        const brush = brushApi.getState();
        if (brush.status !== "painting" || brush.strokeLayerId !== layerId) return;
        probeCoalescer.cancel();
        brush.endStroke();
      }}
      onClick={!clickEnabled ? undefined : (e) => {
        if (interactionMode === "ANNOTATE") {
          // Same rule as onPointerDown: only the probe target places
          // annotations; others let the click fall through to it.
          if (!answersProbe()) return;
          // An orbit-drag release is not an anchor.
          if (e.delta > DRAG_THRESHOLD_PX) return;
          const drawing = roiDrawingApi.getState();
          if (!isProbeDerivedTool(drawing.activeTool)) return;
          const probe = probeFromRay(e.ray, "click");
          if (!probe?.worldPos) return;
          if (drawing.activeTool === "POINT") {
            e.stopPropagation();
            createPointAnnotation(probe.worldPos);
            return;
          }
          // Seed the primitive center — unless a session is already sizing:
          // the commit click may hit this mesh too, and this guard (plus the
          // plane's stopPropagation on commit) makes the outcome independent
          // of which mesh the event reaches first.
          if (
            !drawing.primitiveSessionActive &&
            drawing.pendingPrimitiveAnchor === null
          ) {
            e.stopPropagation();
            drawing.setPendingPrimitiveAnchor(probe.worldPos);
          }
        }
        // NO click-to-select: volumes routinely overlay each other, so a
        // raycast pick is ambiguous — the front-most box would claim clicks
        // meant for the layer behind it. Layer selection lives in the layers
        // panel, where every layer is individually addressable.
      }}
    >
      {/* Non-primary members of a merged group keep their mesh MOUNTED but
          invisible: the primary's single pass already draws them, while three
          skips invisible objects when rendering and NOT when raycasting — so
          probing, annotation placement and selection keep working, and
          `computeSceneVisibility` still measures this layer's own box for the
          planner. Only the rasterization is dropped, which is the whole point. */}
      {/* Corner-anchored: the unit box is offset by half its size so group-
          local spans [0..shape] and voxel v renders at exactly affine(v) —
          COORDINATE_SYSTEMS.md "Coordinate conventions". */}
      <mesh
        key={pool.structureSignature}
        ref={meshRef}
        scale={volumeSize}
        position={[volumeSize[0] / 2, volumeSize[1] / 2, volumeSize[2] / 2]}
        renderOrder={1}
        visible={isPrimary}
        userData={{ [VOLUME_PASS_OBJECT]: true }}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* TSL node raymarcher — see brickNodeMaterials.ts (WGSL + GLSL). */}
        <primitive object={meshMaterial} attach="material" />
      </mesh>

      {isDebug && (
        <mesh
          scale={volumeSize}
          position={[volumeSize[0] / 2, volumeSize[1] / 2, volumeSize[2] / 2]}
          renderOrder={2}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#155e75" opacity={0.06} transparent={true} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};
