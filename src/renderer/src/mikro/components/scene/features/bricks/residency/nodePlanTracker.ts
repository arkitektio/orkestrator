import * as THREE from "three";
import type { StoreApi } from "zustand/vanilla";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { coldOpenTimeline } from "../../../platform/perf/coldOpenTimeline";
import { getInitialVolumeTextureBudgetBytes } from "../../../platform/quality/lodPlanning";
import { resolveBrickSpec } from "../octree/brickSpec";
import { atlasKindForGeometry, atlasSlotBytes } from "../octree/atlasFormat";
import { totalBrickCount } from "../octree/nodeAddress";
import {
  getDecodedChunkCacheBytes,
  resolveDecodeCacheShareBytes,
  resolvePlanBytesForAtlas,
  resolvePoolBudget,
} from "../octree/poolBudget";
import { assessPoolViability } from "../octree/poolViability";
import { buildPlanInputSignature } from "../octree/planInputSignature";
import { buildPoolKey, poolValueSemantics } from "../octree/poolKey";
import { buildSliceSignature } from "../../../platform/model/sliceSignature";
import {
  layerPlanSignature,
  layersPlanKey,
  sameLayerElements,
} from "../../../platform/model/layerPlanKey";
import { resolveLayerDataRange } from "../../../platform/model/dataRange";
import {
  buildLayerLevelGeometry,
  buildLevelSources,
  type LevelSource,
} from "../../../platform/coords/levelGeometry";
import {
  planLayerNodes,
  sameNodePlan,
  type LayerNodePlan,
  type NodeCamera,
} from "../octree/nodePlanning";
import { buildAffineMatrix, voxelWorldSizeOf } from "../../../platform/coords/worldTransform";
import type { ModeState } from "../../../platform/stores/modeStore";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import type { BrickSlice, UnplannableLayerInfo } from "../store/brickSlice";
import type { ViewState } from "../../../platform/stores/viewStore";

/** Value equality for the unplannable-layers map (skip no-op store writes). */
const sameUnplannable = (
  previous: Record<string, UnplannableLayerInfo>,
  next: Record<string, UnplannableLayerInfo>,
): boolean => {
  const previousKeys = Object.keys(previous);
  if (previousKeys.length !== Object.keys(next).length) return false;
  return previousKeys.every((key) => {
    const a = previous[key];
    const b = next[key];
    return (
      !!b &&
      a.mode === b.mode &&
      a.floorBytes === b.floorBytes &&
      a.capBytes === b.capBytes
    );
  });
};

/**
 * Store-level driver for the octree node planner (`features/bricks/octree/nodePlanning`):
 * subscribe to the planning inputs, coalesce bursts into one recompute per
 * animation frame (debounced), and write plans back only when they changed
 * (per-layer identity preserved via `sameNodePlan`).
 *
 * There is no rendered-feedback loop — the shader falls back to coarser
 * resident bricks per sample, so plans are a pure function of
 * view/z/mode/layers.
 */

type NodePlanStores = {
  viewerStore: StoreApi<ViewerState & BrickSlice>;
  sceneStore: StoreApi<SceneState>;
  viewStore: StoreApi<ViewState>;
  modeStore: StoreApi<ModeState>;
};

const scheduleFrame: (callback: () => void) => void =
  typeof requestAnimationFrame !== "undefined"
    ? (callback) => requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 0);

// Scratch objects for the per-class camera derivation (single-threaded; the
// frustum is consumed synchronously by planLayerNodes and never retained in a
// plan). Replans run ≤5×/s during a zoom — cloning three Matrix4s plus a
// Frustum and a Vector3 per LAYER per replan was pure allocation churn.
const scratchVoxelVP = new THREE.Matrix4();
const scratchVoxelInverse = new THREE.Matrix4();
const scratchFrustum = new THREE.Frustum();
const scratchCameraPosition = new THREE.Vector3();
const scratchInverseVP = new THREE.Matrix4();
const scratchAxisPoint = new THREE.Vector3();
const scratchViewDirection = new THREE.Vector3();

/**
 * Min interval between replans. During a 3D orbit the camera stream fires
 * every ~60ms; replanning (and the fetch/abort churn each new plan causes)
 * at that cadence fights the interaction for the main thread. Bricks keep
 * rendering from the previous plan meanwhile — the shader's coarse fallback
 * covers newly exposed regions until the next replan lands.
 */
const MIN_REPLAN_INTERVAL_MS = 200;

/** The previous plan's "keep" keys (nodes that were refined), built once per
 * plan object — the same representative serves every member of a merge
 * class on every replan. */
const keepKeysCache = new WeakMap<LayerNodePlan, ReadonlySet<string>>();
const keepKeysOf = (plan: LayerNodePlan): ReadonlySet<string> => {
  let keys = keepKeysCache.get(plan);
  if (!keys) {
    const set = new Set<string>();
    for (const node of plan.nodes) if (node.role === "keep") set.add(node.key);
    keys = set;
    keepKeysCache.set(plan, keys);
  }
  return keys;
};

/**
 * Min interval WHILE THE CAMERA IS MOVING. Every mid-gesture replan turns the
 * target set over — aborts, fresh fetches, worker decodes, upload-queue
 * growth — and its results land as uploads on the very frames the user is
 * dragging through. The coarsest level is always fully resident, so newly
 * exposed regions render coarse (never black) until the settle replan; the
 * cameraMoving→false edge reschedules immediately so sharpening starts the
 * moment the gesture ends.
 */
const MOTION_REPLAN_INTERVAL_MS = 500;

export function startNodePlanTracking({
  viewerStore,
  sceneStore,
  viewStore,
  modeStore,
}: NodePlanStores): () => void {
  let stopped = false;
  let scheduled = false;
  let lastRecomputeAt = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  /** Per-layer geometry/spec derivation cache, mirroring
   * `brickResidency.layerDerivationCache` (which exists because this tracker
   * used to re-derive the identical values on every replan, ≤5×/s during a
   * zoom — now neither side does). Keyed on the input identities the
   * derivation actually reads; only successes are cached, so a store that
   * opens late retries naturally. Pruned when a layer leaves the scene. */
  type DerivationEntry = {
    layer: unknown;
    dataArrays: unknown;
    mode: "2D" | "3D";
    levels: LevelSource[];
    geometry: NonNullable<ReturnType<typeof buildLayerLevelGeometry>>;
    spec: ReturnType<typeof resolveBrickSpec>;
    viability: ReturnType<typeof assessPoolViability>;
  };
  const derivationCache = new Map<string, DerivationEntry>();

  const recompute = () => {
    const viewerState = viewerStore.getState();
    const layers = sceneStore.getState().layers;
    const mode = modeStore.getState().displayMode;
    // COHERENT VIEW SNAPSHOT: the camera inputs come from viewerStore's
    // `viewSnapshot` — the very emission the CURRENT layerViewRanges were
    // computed from — never from a live viewStore read. A live read paired a
    // fresh camera with one-visibility-hop-stale visible boxes on ~1 in 4
    // mid-orbit replans (the box also solely determines rootRange), and the
    // coherence otherwise rested on listener-insertion order. Fallback to
    // the live view only BEFORE the first visibility publish (ranges are
    // empty then, so there is nothing to be incoherent with).
    const snapshot = viewerState.viewSnapshot;
    const liveView = viewStore.getState();
    const viewProjectionMatrix = snapshot?.viewProjectionMatrix ?? liveView.viewProjectionMatrix;
    const viewportSize = snapshot?.viewportSize ?? liveView.viewportSize;
    const cameraPose = snapshot ? snapshot.cameraPose : liveView.cameraPose;
    const worldLod = true;

    const prevPlans = viewerState.nodePlans;
    const nextPlans: Record<string, LayerNodePlan> = {};
    const nextUnplannable: Record<string, UnplannableLayerInfo> = {};
    let changed = false;

    const plannableLayers = layers.filter(
      (layer) => layer.visible !== false && (layer.lens.dataset.dataArrays?.length ?? 0) > 0,
    );

    // PASS 1 — derive geometry and pool identity per layer. This exists so the
    // byte budget can be divided by the number of DISTINCT POOLS rather than of
    // layers: `BrickResidencyManager` shares one atlas across every layer with
    // the same content address (one-layer-per-channel is the common case), and
    // if the two sides disagree on the divisor the planner asks for more slots
    // than the atlas holds. `buildPoolKey` is the single source of truth for
    // that grouping — both callers must use it.
    type Derived = {
      layer: (typeof plannableLayers)[number];
      levels: LevelSource[];
      geometry: NonNullable<ReturnType<typeof buildLayerLevelGeometry>>;
      spec: ReturnType<typeof resolveBrickSpec>;
      poolKey: string;
    };
    const derived: Derived[] = [];
    const poolKeys = new Set<string>();

    for (const layer of plannableLayers) {
      const cached = derivationCache.get(layer.id);
      let entry: DerivationEntry;
      if (
        cached &&
        cached.dataArrays === layer.lens.dataset.dataArrays &&
        cached.mode === mode &&
        // Identity first (free), else the plan signature: a window-only layer
        // replacement (clim drag) must not re-derive geometry on a replan some
        // OTHER input (camera, z) triggered mid-drag.
        (cached.layer === layer ||
          layerPlanSignature(cached.layer as typeof layer) === layerPlanSignature(layer))
      ) {
        entry = cached;
      } else {
        let levels: LevelSource[];
        try {
          levels = buildLevelSources(
            layer.lens.dataset.dataArrays,
            layer.lens.dataset.axisNames.length,
            viewerState.getArrayForStoreId,
          );
        } catch {
          // Arrays not opened for this layer (e.g. store still initializing).
          continue;
        }

        const geometry = buildLayerLevelGeometry(layer.lens.dataset.axisNames, layer, levels);
        if (!geometry) continue;
        const spec = resolveBrickSpec(geometry, mode);
        entry = {
          layer,
          dataArrays: layer.lens.dataset.dataArrays,
          mode,
          levels,
          geometry,
          spec,
          // Pool-viability guard (P18): a layer whose coarsest level's pinned
          // atlas floor exceeds the GPU budget (typically a single-level
          // dataset, where "coarsest" IS full resolution) must never be
          // planned — the planner would emit its entire full-res grid as
          // unconditional root targets and the pool would attempt a multi-GB
          // atlas allocation. No plan → the brick layers render nothing, no
          // pool, no fetch.
          viability: assessPoolViability(geometry, spec),
        };
        derivationCache.set(layer.id, entry);
      }

      const { levels, geometry, spec, viability } = entry;
      if (!viability.viable) {
        nextUnplannable[layer.id] = {
          mode,
          floorBytes: viability.floorBytes,
          capBytes: viability.capBytes,
        };
        continue;
      }

      const poolKey = buildPoolKey({
        mode,
        spec,
        geometry,
        levels,
        sliceSignature: buildSliceSignature(layer, viewerState.dimSelections),
        dataRange: resolveLayerDataRange(layer, geometry.levels[0].dtype),
        valueSemantics: poolValueSemantics(layer),
      });
      poolKeys.add(poolKey);
      derived.push({ layer, levels, geometry, spec, poolKey });
    }

    // PASS 2 — plan each EQUIVALENCE CLASS against its pool's slot budget.
    //
    // Pools are shared by content address but planning inputs are per layer,
    // so group by (poolKey + the per-layer inputs planLayerNodes actually
    // reads — affine, fixedLOD, view range; see buildPlanInputSignature) and
    // run the DFS once per class, handing every member THE SAME plan object.
    // The common case — one layer per channel of one image, identical
    // placement — collapses N identical traversals into one, and
    // `reconcilePool`'s member union degenerates to identical plans.
    //
    // The budget is per-POOL and `slotBytes` depends on the class's brick
    // spec and atlas kind, so it is resolved inside the loop rather than once
    // above. `resolvePoolBudget` is shared with `brickResidency.ensurePool` —
    // that shared call is what keeps the plan inside the atlas it will land
    // in, headroom included.
    const classes = new Map<string, Derived[]>();
    for (const entry of derived) {
      const signature = `${entry.poolKey}#${buildPlanInputSignature(
        entry.layer.affineMatrix,
        entry.layer.fixedLOD,
        viewerState.layerViewRanges[entry.layer.id],
      )}`;
      const bucket = classes.get(signature);
      if (bucket) bucket.push(entry);
      else classes.set(signature, [entry]);
    }

    const deviceBudgetBytes = getInitialVolumeTextureBudgetBytes();
    for (const members of classes.values()) {
      const { layer, geometry, spec } = members[0];
      const slotBytes = atlasSlotBytes(spec, atlasKindForGeometry(geometry));
      const totalBrickBytes = totalBrickCount(geometry, spec) * slotBytes;
      const resolved = resolvePoolBudget({
        deviceBudgetBytes,
        poolCount: poolKeys.size,
        slotBytes,
        totalBrickBytes,
      });
      // Clamp to the atlas that ACTUALLY exists. `maxPlanBytes` scales with the
      // pool count, so a pool allocated while 2 pools were open must not be
      // planned against the larger share a later 1-pool replan computes — the
      // plan would not fit its own atlas. Reading a static allocation size, NOT
      // a replan trigger (P7). The headroom the clamp reserves is capped by the
      // pyramid (`resolvePlanBytesForAtlas`) — a flat 64 slots subtracted from a
      // small atlas left the plan ONE slot and pinned refinement at the coarsest
      // level forever (P25).
      const liveAtlasBytes =
        viewerState.brickSystem?.poolAtlasBytes(members[0].poolKey) ?? null;
      const maxPlanBytes =
        liveAtlasBytes === null
          ? resolved.maxPlanBytes
          : resolvePlanBytesForAtlas({
              liveAtlasBytes,
              resolvedMaxPlanBytes: resolved.maxPlanBytes,
              slotBytes,
              totalBrickBytes,
            });
      // Each EQUIVALENCE CLASS runs its own plan and spends its own share of
      // the decode cache; dividing by the (possibly smaller) pool count would
      // let multiple classes on one pool exceed the shared-cache cap.
      const decodeCacheShareBytes = resolveDecodeCacheShareBytes({
        decodedChunkCacheBytes: getDecodedChunkCacheBytes(),
        poolCount: Math.max(poolKeys.size, classes.size),
      });

      let camera: NodeCamera | null = null;
      if (mode === "3D" && viewProjectionMatrix) {
        // Corner-anchored: voxel v sits at affine(v), so the frustum/camera
        // math below runs in plain voxel space.
        const voxelToWorld = buildAffineMatrix(layer);
        // World-metric LOD (`orkestrator.worldLod`, read per replan — live
        // toggle): hand the planner the per-axis world voxel size so its
        // footprint/foveation/aniso math runs in world units. Off ⇒ omit ⇒
        // the planner's identity fallback IS the legacy voxel metric.
        const voxelWorldSize = worldLod ? voxelWorldSizeOf(voxelToWorld) : undefined;
        scratchVoxelVP.copy(viewProjectionMatrix).multiply(voxelToWorld);
        // Plane extraction must match the matrix's NDC z convention —
        // WebGPU maps z to [0,1]; the WebGL default would place the near
        // plane behind its true position (see CameraPose.coordinateSystem).
        scratchFrustum.setFromProjectionMatrix(
          scratchVoxelVP,
          (cameraPose?.coordinateSystem ??
            THREE.WebGLCoordinateSystem) as THREE.CoordinateSystem,
        );
        let voxelPosition: [number, number, number] | null = null;
        let voxelViewDirection: [number, number, number] | null = null;
        let pxPerVoxelAtUnitDistance = 0;
        if (cameraPose?.isPerspective && cameraPose.fovY > 0) {
          const inverse = scratchVoxelInverse.copy(voxelToWorld).invert();
          const p = scratchCameraPosition
            .set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2])
            .applyMatrix4(inverse);
          voxelPosition = [p.x, p.y, p.z];
          pxPerVoxelAtUnitDistance =
            viewportSize.height / (2 * Math.tan(cameraPose.fovY / 2));
          // Foveation axis: `cameraPose` carries no orientation, so unproject
          // the NDC center through the inverse view-projection to a world
          // point on the view axis, take the direction from the camera, and
          // rotate it into voxel space (direction transform — no translation).
          scratchInverseVP.copy(viewProjectionMatrix).invert();
          const axisPoint = scratchAxisPoint.set(0, 0, 0.5).applyMatrix4(scratchInverseVP);
          const direction = scratchViewDirection
            .set(
              axisPoint.x - cameraPose.position[0],
              axisPoint.y - cameraPose.position[1],
              axisPoint.z - cameraPose.position[2],
            )
            .transformDirection(inverse);
          // The planner measures foveation displacements in SCORE space —
          // voxel deltas scaled per axis by voxelWorldSize. The axis must be
          // normalized in that same space: scale the voxel-space direction
          // by s and renormalize (≡ the world direction for rotation-free
          // affines; exactly the voxel direction when s is identity). A raw
          // voxel-space axis against scaled displacements misreads angles by
          // the affine's condition number.
          if (voxelWorldSize) {
            direction
              .set(
                direction.x * voxelWorldSize[0],
                direction.y * voxelWorldSize[1],
                direction.z * voxelWorldSize[2],
              )
              .normalize();
          }
          if (Number.isFinite(direction.x) && direction.lengthSq() > 1e-12) {
            voxelViewDirection = [direction.x, direction.y, direction.z];
          }
        }
        camera = {
          voxelFrustum: scratchFrustum,
          voxelPosition,
          pxPerVoxelAtUnitDistance,
          voxelWorldSize,
          voxelViewDirection,
        };
      }

      // Budget-floor hysteresis input — only meaningful while the slice stays
      // the same (a signature change means different data entirely). The class
      // representative's previous plan stands in for everyone; members only
      // ever briefly disagree right after a membership change, and converge on
      // the next replan.
      const prevRepresentative =
        members.map((m) => prevPlans[m.layer.id]).find(Boolean) ?? null;
      // A previous plan only informs this one when it planned the SAME data
      // in the same mode: a slice-signature change (t/c/z selection) is
      // different content, and its hysteresis/ceiling would be meaningless.
      const prevCompatible =
        prevRepresentative !== null &&
        prevRepresentative.mode === mode &&
        prevRepresentative.sliceSignature === buildSliceSignature(layer, viewerState.dimSelections);
      const next = planLayerNodes({
        layer,
        geometry,
        spec,
        mode,
        viewRange: viewerState.layerViewRanges[layer.id],
        camera,
        lodBias: viewerState.lodBias,
        currentZ: viewerState.currentZ,
        dimSelections: viewerState.dimSelections,
        maxPlanBytes,
        decodeCacheShareBytes,
        // COLD-OPEN gate: plan #1 (no previous plan for this class) skips
        // the sub-floor decode allowance so the initial download is exactly
        // the pre-allowance set (coarse backdrop + free-floor refinement) —
        // time-to-first-image beats early fine detail. The sub-floor region
        // unlocks from the second replan (~500 ms later / next interaction).
        // `undefined` lets the planner derive it from the cache share above.
        decodeAllowanceBytes: prevRepresentative ? undefined : 0,
        anisoLod: true,
        previousBudgetMinLevel: prevCompatible ? prevRepresentative.budgetMinLevel : undefined,
        previousKeepKeys: prevCompatible ? keepKeysOf(prevRepresentative) : undefined,
        // Motion ceiling: while the camera moves, never plan finer than the
        // last plan. The settle-edge reschedule below replans immediately
        // with the ceiling lifted, so sharpening starts ~150 ms after rest.
        refineCeilingLevel:
          prevCompatible && viewStore.getState().cameraMoving
            ? prevRepresentative.targetLevel
            : undefined,
      });

      for (const member of members) {
        const prev = prevPlans[member.layer.id] ?? null;
        if (prev && sameNodePlan(prev, next)) {
          nextPlans[member.layer.id] = prev; // keep identity → no downstream re-render
        } else {
          nextPlans[member.layer.id] = next;
          changed = true;
        }
      }
    }

    // Plan REMOVALS must publish too: a layer that turned invisible (or lost
    // its arrays, or left the scene) is filtered out of planning above, so it
    // never reaches the per-class loop — without this check its STALE plan
    // stayed in the store, residency never reconciled the pool, and a merged
    // pass kept compositing the hidden layer's channels. New keys always set
    // `changed` in the loop (prev === null), so only disappearances need it.
    if (!changed) {
      for (const layerId of Object.keys(prevPlans)) {
        if (!(layerId in nextPlans)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      viewerState.setNodePlans(nextPlans);
    }

    // Prune derivation-cache entries for layers that left the scene.
    if (derivationCache.size > layers.length) {
      const liveIds = new Set(layers.map((l) => l.id));
      for (const layerId of [...derivationCache.keys()]) {
        if (!liveIds.has(layerId)) derivationCache.delete(layerId);
      }
    }

    // Value-compared write (rarely changes — P17-clean): entries clear
    // automatically when a layer becomes viable (e.g. after a mode switch).
    if (!sameUnplannable(viewerState.unplannableLayers, nextUnplannable)) {
      viewerState.setUnplannableLayers(nextUnplannable);
    }
  };

  const schedule = () => {
    if (stopped || scheduled) return;
    const interval = viewStore.getState().cameraMoving
      ? MOTION_REPLAN_INTERVAL_MS
      : MIN_REPLAN_INTERVAL_MS;
    const sinceLast = performance.now() - lastRecomputeAt;
    if (sinceLast < interval) {
      if (pendingTimer === null) {
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          schedule();
        }, interval - sinceLast);
      }
      return;
    }
    scheduled = true;
    scheduleFrame(() => {
      scheduled = false;
      if (!stopped) {
        lastRecomputeAt = performance.now();
        perfMonitor.markReplan(); // no-op unless a perf recording is armed
        recompute();
        coldOpenTimeline.stamp("firstPlan");
      }
    });
  };

  // Trigger only on the planner's inputs; our own setNodePlans writes don't
  // touch these references and thus don't reschedule.
  // NOTE: residencyVersion is deliberately NOT a trigger — plans are a pure
  // function of view/z/mode/layers, so replanning per upload batch would just
  // churn the main thread while bricks stream in.
  const initialViewer = viewerStore.getState();
  let lastViewRanges = initialViewer.layerViewRanges;
  let lastViewSnapshot = initialViewer.viewSnapshot;
  let lastLodBias = initialViewer.lodBias;
  let lastCurrentZ = initialViewer.currentZ;
  let lastDimSelections = initialViewer.dimSelections;
  const unsubscribeViewer = viewerStore.subscribe((state) => {
    if (
      state.layerViewRanges !== lastViewRanges ||
      // A snapshot can move with UNCHANGED ranges (e.g. a view change that
      // produces the same boxes). recompute() reads the snapshot, so it must
      // reschedule then too — the viewStore matrix trigger below can fire a
      // replan BEFORE visibility publishes, which would otherwise be the
      // last word despite consuming the previous snapshot.
      state.viewSnapshot !== lastViewSnapshot ||
      state.lodBias !== lastLodBias ||
      state.currentZ !== lastCurrentZ ||
      state.dimSelections !== lastDimSelections
    ) {
      lastViewRanges = state.layerViewRanges;
      lastViewSnapshot = state.viewSnapshot;
      lastLodBias = state.lodBias;
      lastCurrentZ = state.currentZ;
      lastDimSelections = state.dimSelections;
      schedule();
    }
  });

  let lastLayers = sceneStore.getState().layers;
  let lastLayersKey = layersPlanKey(lastLayers);
  const unsubscribeScene = sceneStore.subscribe((state) => {
    if (state.layers === lastLayers) return;
    const previous = lastLayers;
    lastLayers = state.layers;
    // `touchImageLayers` republishes IDENTICAL elements in a fresh array
    // precisely to request a replan (a zarr store opened late) — that touch
    // must schedule unconditionally. A real element replacement schedules
    // only when a PLANNING input moved: a clim/gamma drag replaces the layer
    // sixty times a second and none of that is a planner read (layerPlanKey).
    if (sameLayerElements(previous, state.layers)) {
      schedule();
      return;
    }
    const key = layersPlanKey(state.layers);
    if (key !== lastLayersKey) {
      lastLayersKey = key;
      schedule();
    }
  });

  let lastMatrix = viewStore.getState().viewProjectionMatrix;
  let lastCameraMoving = viewStore.getState().cameraMoving;
  const unsubscribeView = viewStore.subscribe((state) => {
    if (state.viewProjectionMatrix !== lastMatrix) {
      lastMatrix = state.viewProjectionMatrix;
      schedule();
    }
    if (state.cameraMoving !== lastCameraMoving) {
      lastCameraMoving = state.cameraMoving;
      // Settle edge: drop any pending MOTION-interval timer and reschedule at
      // the IDLE interval so the sharp replan a throttled gesture deferred
      // lands promptly (the settle camera emission usually triggers one too —
      // this makes it robust).
      if (!lastCameraMoving) {
        if (pendingTimer !== null) {
          clearTimeout(pendingTimer);
          pendingTimer = null;
        }
        schedule();
      }
    }
  });

  let lastDisplayMode = modeStore.getState().displayMode;
  const unsubscribeMode = modeStore.subscribe((state) => {
    if (state.displayMode !== lastDisplayMode) {
      lastDisplayMode = state.displayMode;
      schedule();
    }
  });

  schedule();

  return () => {
    stopped = true;
    if (pendingTimer !== null) clearTimeout(pendingTimer);
    unsubscribeViewer();
    unsubscribeScene();
    unsubscribeView();
    unsubscribeMode();
  };
}
