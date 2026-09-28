import type { StoreApi } from "zustand/vanilla";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { coldOpenTimeline } from "../../../platform/perf/coldOpenTimeline";
import {
  DRAIN_PUMP_MS,
  FRAME_UPLOAD_BUDGET,
  resolveDrainPolicy,
  resolveStreamFrameAction,
  shouldDispatchFetch,
} from "../../../platform/quality/uploadBudget";
import { qualityGovernor } from "../../../platform/quality/qualityGovernor";
import type { SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import { effectiveChunkShapeOf } from "@/core/data/zarr/runner/index";
import { INTERACTIVE_FETCH_PRIORITY } from "@/core/data/zarr/pool/types";
import { selectTrimCandidates } from "../octree/brickPoolState";
import type { BrickArray } from "../octree/brickRepack";
import { getDecodedChunkCacheBytes, poolHeadroomSlots } from "../octree/poolBudget";
import { normalizeSlabRanges } from "../octree/occupancySlabs";
import type { RepackDispatcher } from "../octree/repackDispatcher";
import {
  hasPhasorSlabs,
  type LevelSource,
  type Vec3,
} from "../../../platform/coords/levelGeometry";
import {
  brickFetchBox,
  type FetchPhase,
  nodeVoxelBox,
  parseNodeKey,
} from "../octree/nodeAddress";
import { haloStillWanted, initialFetchPhase } from "./twoPhase";
import {
  compareFetchOrder,
  type LayerNodePlan,
  type PlannedNode,
} from "../octree/nodePlanning";
import { PAGE_FLAG_UNMAPPED } from "../octree/pageTableLayout";
import type { LayerState } from "../../../platform/model/layerModel";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import { atlasSlotBytes } from "../octree/atlasFormat";
import { disposeBrickAtlas } from "../gpu/brickAtlas";
import {
  createGpuRepacker,
  type GpuFlushOutcome,
  type GpuRepacker,
} from "../gpu/computeRepack";
import {
  runGpuRepackSelfTest,
  type GpuRepackSelfTestResult,
} from "../gpu/computeRepackSelfTest";
import { disposePageTable, flushPageTable, setPageEntry } from "../gpu/pageTableTexture";
import type { BrickSlice } from "../store/brickSlice";
import { AdjacentPrefetcher } from "./adjacentPrefetch";
import {
  computeFixedIndices,
  enumerateBrickChunkCoords,
  warmShardIndexes,
} from "./brickChunks";
import { ChunkService } from "./chunkService";
import {
  applyGpuOutcomeToPools,
  type GpuOutcomeContext,
} from "./gpuOutcome";
import {
  buildPoolDerivation,
  createLayerBrickPool,
  deriveLayerStructure,
  resetPoolContents,
  retargetMovedPool,
  type LayerStructure,
} from "./poolLifecycle";
import {
  blankOccupancyEntries,
  foldAutoRange,
  hasPendingEncodeWork,
  occPromotionWorthwhile,
  reencodeEmptyEntries,
  reencodeOccupancyEntries,
} from "./rangeEncoding";
import { buildResidencyDebugReport } from "./residencyDebugReport";
import { readExactVoxel, resolveResidentRead, sampleChunkCacheSync } from "./residentProbes";
import {
  laneOf,
  partitionDrainLanes,
  releaseDrainLanes,
  runDrainLanes,
  writeBackLane,
  type DrainEntryDeps,
  type DrainLane,
} from "./uploadDrain";
import type {
  BrickSystemStats,
  GpuBrickToken,
  GpuQueuedChunk,
  LayerBrickPool,
  PendingBrick,
  PoolDerivation,
  ResidentBrickInfo,
} from "./residencyTypes";

// The public surface, unchanged by the split: importers keep this path.
export type { BrickSystemStats, LayerBrickPool, ResidentBrickInfo } from "./residencyTypes";
export {
  hasPendingEncodeWork,
  occPromotionWorthwhile,
  resolveReusedAutoRange,
} from "./rangeEncoding";

/**
 * CPU-side octree residency: subscribes to `viewerStore.nodePlans`, fetches
 * the planned bricks' zarr chunks through the worker pool, repacks them into
 * stored bricks, and drains a byte-budgeted upload queue into the per-layer
 * brick atlas + page table each frame.
 *
 * Owned by `BrickSystemProvider` (needs the renderer); a plain class
 * like `CanvasContext`, referenced from the store by handle only.
 *
 * This file is the manager itself — plan reconcile, fetch dispatch and the
 * brick fetch, the per-frame drain's orchestration, streaming flags and
 * timers. Its seams live beside it: `residencyTypes` (data shapes),
 * `chunkService` (decoded-chunk cache + in-flight sharing), `brickChunks`
 * (chunk enumeration, fixed indices), `poolLifecycle`, `uploadDrain`,
 * `gpuOutcome`, `rangeEncoding`, `residentProbes`, `adjacentPrefetch`,
 * `residencyDebugReport` (OCTREE_RENDERER.md §2.8).
 */

// Per-frame texSubImage3D budget lives in ./uploadBudget (bytes + bricks +
// WALL-CLOCK cap — the time cap is what keeps integrated GPUs smooth, P19).
// In-flight fetch count, residency-bump throttle and upload time budget are
// TIER-scaled — read from the quality governor's profile at use sites (P19).

const DECODED_CHUNK_CACHE_BYTES = getDecodedChunkCacheBytes();

/**
 * Margin-only prefetch (fetchBand 2) dispatch gate — see startNextFetchesGlobal.
 * Pure so the policy is unit-testable without a manager.
 */
export function shouldDeferPrefetch(input: {
  fetchBand: PlannedNode["fetchBand"];
  inFlightOnScreen: number;
  interacting: boolean;
}): boolean {
  return input.fetchBand === 2 && (input.inFlightOnScreen > 0 || input.interacting);
}

/** All the manager needs to know about a resource built on its renderer. */
type RendererBoundResource = { dispose(): void };

/** Rate limit for auto-range `poolsVersion` bumps: during early float-layer
 * streaming, range moves can land several times per frame and each bump
 * re-renders the layer components + levels editor. */
const AUTO_RANGE_BUMP_MS = 150;

/**
 * What the governor's `streaming` flag should do this drain — hysteretic on
 * BOTH edges. Pure so the timing rules are stated once and testable, in the
 * idiom of `decideSettleRefine` / `occPromotionWorthwhile`.
 *
 * The FALSE edge waits `clearMs` of continuous quiet: the raw predicate flaps
 * between 200 ms replans during a zoom, and every flap re-rendered all volume
 * layers and snapped the raymarch step scale mid-gesture.
 *
 * The TRUE edge waits `assertMs` of continuous work. It used to fire the
 * instant `anyPipelineWork()` went true, so a SINGLE brick landing at idle
 * cost a canvas DPR realloc (`QualityAdapter` re-reads `cameraMoving ||
 * isStreaming()` every frame) plus a settle-ladder reset to stage 0
 * (`decideSettleRefine`) — the sharpness pulse, graininess pulse and block pop
 * reported as "flickering with a static camera", all from one event.
 *
 * Debouncing the true edge is safe: this is a QUALITY signal, not a
 * correctness one. A brick that actually changes the image still re-renders via
 * its `poolsVersion`/tracker bump and `invalidate()`.
 *
 *  - "assert"/"clear": apply the flag now.
 *  - "arm-assert"/"arm-clear": the edge is pending; the caller arms a timer,
 *    because under `frameloop="demand"` frames may stop before it elapses.
 *  - "hold": nothing to do.
 */
export type StreamingFlagAction = "assert" | "clear" | "arm-assert" | "arm-clear" | "hold";

export function decideStreamingFlag(input: {
  /** `anyPipelineWork()` this drain. */
  busy: boolean;
  /** The governor's flag right now. */
  streaming: boolean;
  now: number;
  /** When the pipeline last went quiet→busy; null while quiet. */
  busySinceAt: number | null;
  /** When `busy` was last true (drives the trailing clear). */
  lastStreamingTrueAt: number;
  assertMs: number;
  clearMs: number;
}): StreamingFlagAction {
  const { busy, streaming, now } = input;
  if (busy) {
    if (streaming) return "hold";
    const busySince = input.busySinceAt ?? now;
    return now - busySince >= input.assertMs ? "assert" : "arm-assert";
  }
  if (!streaming) return "hold";
  return now - input.lastStreamingTrueAt >= input.clearMs ? "clear" : "arm-clear";
}

type Deps = {
  viewerStore: StoreApi<ViewerState & BrickSlice>;
  sceneStore: StoreApi<SceneState>;
  /** Runs `repackBrick` off the UI thread (worker pool; sync in tests). */
  repack: RepackDispatcher;
  /** Live camera-gesture state (viewStore.cameraMoving) — read by the
   * streaming render-cadence gate and its off-frame pump at FIRE time, so a
   * gesture that starts after a timer was armed still drains under the
   * trickle policy. Optional: absent (tests) reads as not interacting. */
  isInteracting?: () => boolean;
};

export class BrickResidencyManager {
  /** Keyed by POOL KEY (content address), not layer id — see `buildPoolKey`. */
  private readonly pools = new Map<string, LayerBrickPool>();
  /** layer id → pool key, so the public per-layer accessors (`getLayerPool`,
   * `sampleResident`, …) keep their signatures and every consumer is unchanged. */
  private readonly layerToPoolKey = new Map<string, string>();
  /** Monotonic per-fetch owner suffix: a brick dropped and immediately
   * re-planned runs TWO overlapping fetchBrick invocations with the SAME
   * node.key — with the bare key as owner, the old invocation's finally
   * released the ref the new one had just acquired (Set semantics), fired the
   * last-ref abort and cancelled the NEW fetch's queued chunks. The brick
   * then stayed unloaded until the next replan. Owner identity must be the
   * INVOCATION, not the brick. */
  private fetchOwnerSeq = 0;
  /** In-flight bricks of fetchBand 0/1 (backdrop + on-screen) across all
   * pools. Margin prefetch (band 2) dispatches only when this is 0 and the
   * camera is at rest — see startNextFetchesGlobal. */
  private inFlightOnScreen = 0;
  private disposed = false;
  private lastResidencyBumpAt = 0;
  /** Monotonic plan generation, used as the worker-pool priority of every
   * chunk task a brick fetch enqueues: the pool serves HIGHER priorities
   * first, so a newer plan's decodes always beat stranded queued tasks from
   * earlier plans (the old `priority: node.level` scheme served the coarse
   * leftovers first — exactly backwards while zooming in). Within one
   * generation the pool is FIFO, which preserves `pendingFetch`'s near-first
   * dispatch order. Interactive fetches use INTERACTIVE_FETCH_PRIORITY,
   * above every generation; the slab prefetch stays at −1, below all of it. */
  private fetchGeneration = 1;
  /** Two-phase bricks kill switch, read once per manager (see twoPhase.ts). */
  private readonly twoPhaseBricks = true;
  /** Trailing hysteresis for the governor's streaming flag (drainUploads). */
  private lastStreamingTrueAt = 0;
  private streamingClearTimer: ReturnType<typeof setTimeout> | null = null;
  /** LEADING hysteresis: when the pipeline last went from quiet to busy, or
   * null while quiet / already streaming. See applyStreamingFlag. */
  private busySinceAt: number | null = null;
  private streamingAssertTimer: ReturnType<typeof setTimeout> | null = null;
  /** Per-layer geometry/spec derivation cache: nodePlanTracker derives the
   * identical values moments earlier in the same tick, and re-running
   * buildLevelSources + buildLayerLevelGeometry + resolveBrickSpec +
   * assessPoolViability + the JSON structure signature on every replan
   * (≤5×/s during a zoom) was pure allocation churn. Keyed on the input
   * identities the derivation actually reads; only successes are cached, so
   * a store that opens late retries naturally. */
  private readonly layerDerivationCache = new Map<string, LayerStructure>();
  /** Auto-range bump throttle (see AUTO_RANGE_BUMP_MS); the trailing timer
   * guarantees the LAST range move of a burst always publishes. */
  private lastPoolsBumpAt = 0;
  private poolsBumpTimer: ReturnType<typeof setTimeout> | null = null;
  /** False once a drain observed the whole pipeline idle: `drainUploads` then
   * returns immediately (no per-frame allocations/pool walks on idle rendered
   * frames) until new work arrives via `wakeDrain`. */
  private drainNeeded = true;
  readonly stats: BrickSystemStats = {
    bricksFetched: 0,
    coreBricks: 0,
    haloRefines: 0,
    chunkRequests: 0,
    rangeRequests: 0,
    bytesDecoded: 0,
    fetchMs: 0,
    repackMs: 0,
    gpuBricks: 0,
    gpuRepackLatencyMsSum: 0,
    gpuRepackLatencyMaxMs: 0,
    gpuRepackFlushes: 0,
    uploadMs: 0,
    timeToSharpMs: 0,
    lastFlushToDrainedMs: 0,
    bricksUploaded: 0,
    bytesUploaded: 0,
    emptyBricks: 0,
    evictions: 0,
    planDrops: 0,
    acquireFailures: 0,
    trimmed: 0,
    staleFetches: 0,
    cancelledDecodes: 0,
    staleUploads: 0,
    fetchErrors: 0,
    streamFramesCoalesced: 0,
    aggregateWrites: 0,
  };
  /** Decoded-chunk cache, in-flight sharing and referrer cancellation. */
  private readonly chunks = new ChunkService(this.stats, DECODED_CHUNK_CACHE_BYTES);
  /** Idle-edge neighbour warm-up (z±1 slabs, ±1 collapsed-dim selections). */
  private readonly prefetcher = new AdjacentPrefetcher(this.pools, this.chunks, () =>
    this.deps.viewerStore.getState(),
  );
  /** Streaming render-cadence gate (gap 1a — see resolveStreamFrameAction):
   * last actually-issued streaming invalidate, and the off-frame pump timer
   * that keeps drainUploads running between the coalesced frames. */
  private lastStreamInvalidateAt = 0;
  private drainPumpTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while at least one coalesced wakeup still awaits its frame — the
   * pump keeps re-entering the gate until the cadence window closes and the
   * frame lands, even if the upload queue drained mid-window. */
  private pendingStreamFrame = false;
  /** Layers already warned about a non-viable pool (one warning per layer). */
  private readonly warnedUnviable = new Set<string>();
  /** undefined = not yet attempted; null = unavailable (pipeline failed, or
   * disabled via the localStorage kill switch) — the CPU worker path then
   * handles every brick. */
  private gpuRepacker: GpuRepacker<GpuBrickToken> | null | undefined;
  /**
   * Resources other modules build on THIS manager's renderer, so the manager
   * stays the one sanctioned holder of it without having to know what they
   * are. Each slot is lazy like `gpuRepacker` (undefined = not yet attempted,
   * null = unavailable) and is disposed on detach, so nothing can outlive the
   * device it was built against. See `registerRendererResource`.
   */
  private readonly rendererResources = new Set<{
    instance: RendererBoundResource | null | undefined;
  }>();
  /** Wall-clock start of the current streaming burst (null = idle). Set when
   * a reconcile enqueues work while idle; NOT reset by mid-burst replans, so
   * timeToSharpMs measures interaction → fully-sharp. */
  private streamStartedAt: number | null = null;
  /** Last few timeToSharpMs values (newest last) for variance eyeballing. */
  private readonly timeToSharpRing: number[] = [];
  /** Wall-clock time of the most recent pool flush (null = none pending);
   * cleared on the drained edge into stats.lastFlushToDrainedMs. */
  private flushedAt: number | null = null;

  /**
   * The renderer is LATE-BOUND: the manager is constructed (and starts
   * fetching) outside the R3F canvas, before `renderer.init()` has resolved.
   * Null means "no device yet" — fetch, decode and repack all run regardless,
   * and their results wait in `pool.queue` for the first drain after attach.
   * See `attachRenderer`.
   */
  private renderer: SceneRenderer | null = null;
  private invalidateFn: (() => void) | null = null;

  constructor(private readonly deps: Deps) {}

  /** Request a frame. A no-op while detached — there is no frameloop to ask. */
  private invalidate(): void {
    this.invalidateFn?.();
  }

  /**
   * Bind the renderer once the canvas has one, and drain whatever accumulated
   * while there was no device.
   *
   * Pools created before this point never had their backend texture realized
   * (`initTexture` is a no-op without a renderer), so every existing atlas is
   * re-initialized here — otherwise the first `writeTexture` would race the
   * lazy creation the eager call exists to prevent.
   */
  attachRenderer(renderer: SceneRenderer, invalidate: () => void): void {
    if (this.disposed) return;
    this.renderer = renderer;
    this.invalidateFn = invalidate;
    for (const pool of this.pools.values()) {
      (
        renderer as unknown as { initTexture?: (texture: unknown) => void }
      ).initTexture?.(pool.atlas.texture);
    }
    // Anything fetched pre-attach is sitting in the upload queues.
    this.wakeDrain();
    // Re-reconcile against the CURRENT plans. Load-bearing on a canvas REMOUNT
    // (2D<->3D is not one, but a scope rebuild is): `detachRenderer` disposed
    // every pool, and the plan subscription only fires when plans CHANGE — so
    // without this the scene would sit empty until the next replan happened to
    // move something.
    this.reconcileAll(this.deps.viewerStore.getState().nodePlans);
    this.invalidate();
  }

  /**
   * Unbind the renderer — the canvas is going away.
   *
   * Every GPU resource dies with the device that made it, so this disposes the
   * pools as well. Hoisting the manager out of the canvas is about starting
   * EARLIER, not about surviving a canvas teardown; a remount re-fetches from
   * the decoded-chunk cache, which is the same cost the previous
   * unmount-the-whole-manager arrangement paid.
   */
  detachRenderer(): void {
    this.gpuRepacker?.dispose();
    // undefined, not null: null MEMOIZES "unavailable", and the next attach
    // must be free to try again.
    this.gpuRepacker = undefined;
    // undefined, not null, for the same reason as `gpuRepacker` above: the
    // next attach must be free to rebuild against the new device.
    for (const slot of this.rendererResources) {
      slot.instance?.dispose();
      slot.instance = undefined;
    }
    for (const pool of this.pools.values()) this.disposePool(pool);
    this.pools.clear();
    this.layerToPoolKey.clear();
    this.renderer = null;
    this.invalidateFn = null;
  }

  private ensureGpuRepacker(): GpuRepacker<GpuBrickToken> | null {
    // Deliberately not memoized while detached: caching `null` here would make
    // "no device yet" permanent for the whole session.
    if (this.renderer === null) return null;
    if (this.gpuRepacker === undefined) {
      this.gpuRepacker = createGpuRepacker<GpuBrickToken>(this.renderer);
    }
    return this.gpuRepacker;
  }

  /**
   * Let another module build a GPU resource on this manager's renderer without
   * the manager importing it.
   *
   * The manager stays the one sanctioned holder of the renderer — GPU
   * consumers of the atlas + page table hang off it rather than threading the
   * renderer through React — but it only ever sees `{ dispose() }`. The
   * returned accessor is a GETTER, called per use: it hands back null while
   * detached and rebuilds after the next attach, so a caller cannot cache a
   * resource built against a dead device.
   */
  registerRendererResource<T extends RendererBoundResource>(
    create: (renderer: SceneRenderer) => T | null,
  ): () => T | null {
    const slot: { instance: T | null | undefined } = { instance: undefined };
    this.rendererResources.add(slot as { instance: RendererBoundResource | null | undefined });
    return () => {
      if (this.renderer === null) return null;
      if (slot.instance === undefined) slot.instance = create(this.renderer);
      return slot.instance;
    };
  }

  /**
   * The live renderer, or null while detached. For one-shot work that builds
   * nothing to dispose (the dev-only parity self-tests); anything with a
   * lifetime must go through `registerRendererResource` instead.
   */
  getRenderer(): SceneRenderer | null {
    return this.renderer;
  }

  /** Dev-only (DebugPanel): GPU↔CPU repack parity check on the live renderer. */
  runGpuRepackSelfTest(): Promise<GpuRepackSelfTestResult> {
    if (this.renderer === null) {
      return Promise.reject(new Error("No renderer attached"));
    }
    return runGpuRepackSelfTest(this.renderer);
  }

  /**
   * Whether a level's array is `sharding_indexed` — i.e. its planning chunk
   * shape (inner chunks) differs from zarrita's `arr.chunks` (the shard).
   * Debug report only; `false` when the array is not open yet.
   */
  private levelIsSharded(storeId: string): boolean {
    try {
      const arr = this.deps.viewerStore.getState().getArrayForStoreId(storeId);
      const effective = effectiveChunkShapeOf(arr);
      return effective !== undefined && effective.some((c, i) => c !== arr.chunks[i]);
    } catch {
      return false;
    }
  }

  /**
   * Bytes a LIVE pool's atlas was actually allocated at, or null if no such
   * pool exists yet.
   *
   * The planner needs this because `maxPlanBytes` is now derived from the
   * device budget divided by the pool count, so the tracker's view of that
   * count and the count in force when the atlas was allocated can differ —
   * close a layer and the next replan sizes a plan for a share the existing
   * atlas was never built for, which is exactly the "plan bigger than its pool"
   * eviction treadmill `poolBudget.ts` exists to prevent.
   *
   * This reports a STATIC allocation capacity, not streaming state. It must
   * never be fed back into planning as a trigger — that is P7, the residency
   * feedback loop that caused replan storms.
   */
  poolAtlasBytes(poolKey: string): number | null {
    return this.pools.get(poolKey)?.atlas.byteLength ?? null;
  }

  /** Structured snapshot for the DebugPanel's copyable report. */
  buildDebugReport(): Record<string, unknown> {
    return buildResidencyDebugReport({
      pools: this.pools,
      stats: this.stats,
      chunkCacheBytes: this.chunks.sizeBytes,
      layerCount: this.layerToPoolKey.size,
      timeToSharpRing: this.timeToSharpRing,
      gpuRepack:
        this.gpuRepacker === undefined
          ? "not-attempted"
          : this.gpuRepacker === null
            ? "unavailable"
            : this.gpuRepacker.status(),
      levelIsSharded: (storeId) => this.levelIsSharded(storeId),
      sampleResident: (layerId, voxel, level, channel) =>
        this.sampleResident(layerId, voxel, level, channel),
    });
  }

  /** Subscribe to node plans; returns the unsubscribe handle. */
  start(): () => void {
    const { viewerStore } = this.deps;
    let lastPlans = viewerStore.getState().nodePlans;
    const unsubscribe = viewerStore.subscribe((state) => {
      if (state.nodePlans !== lastPlans) {
        lastPlans = state.nodePlans;
        this.reconcileAll(state.nodePlans);
      }
    });
    this.reconcileAll(viewerStore.getState().nodePlans);
    return unsubscribe;
  }

  getLayerPool(layerId: string): LayerBrickPool | null {
    return this.poolFor(layerId);
  }

  /** The pool backing a layer. Layers sharing a content address share the pool,
   * so several ids can resolve to the same object — by design. */
  private poolFor(layerId: string): LayerBrickPool | null {
    const poolKey = this.layerToPoolKey.get(layerId);
    if (poolKey === undefined) return null;
    return this.pools.get(poolKey) ?? null;
  }

  snapshotResidency(): Record<string, ResidentBrickInfo[]> {
    const result: Record<string, ResidentBrickInfo[]> = {};
    // Still keyed by LAYER id (the overlay indexes by layer). Members of one
    // shared pool report the same residency because they literally have it.
    const byPool = new Map<string, ResidentBrickInfo[]>();
    for (const [poolKey, pool] of this.pools) {
      const entries: ResidentBrickInfo[] = [];
      for (const key of pool.pool.keys()) {
        const { level, coords } = parseNodeKey(key);
        entries.push({ level, coords, empty: false });
      }
      for (const key of pool.emptyValues.keys()) {
        const { level, coords } = parseNodeKey(key);
        entries.push({ level, coords, empty: true });
      }
      byPool.set(poolKey, entries);
    }
    for (const [layerId, poolKey] of this.layerToPoolKey) {
      const entries = byPool.get(poolKey);
      if (entries) result[layerId] = entries;
    }
    return result;
  }

  /**
   * CPU twin of the shader's `sampleBrickEx`: raw value of the finest
   * resident brick at or coarser than desiredLevel — its page-table-quantized
   * EMPTY value, or the voxel read from the decoded-chunk cache (probes, CPU
   * raymarching; see residentProbes.ts). Null when nothing is resident, or
   * the chunk has been evicted.
   */
  sampleResident(
    layerId: string,
    baseVoxel: Vec3,
    desiredLevel: number,
    channel: number,
  ): number | null {
    const pool = this.poolFor(layerId);
    if (!pool) return null;
    const read = resolveResidentRead(pool, baseVoxel, desiredLevel);
    if (!read) return null;
    if (read.kind === "empty") return read.value;
    return this.sampleChunkCacheSync(pool, read.level, baseVoxel, channel);
  }

  /**
   * All-channel variant of `sampleResident` for the probe readout: one
   * address resolution, then one read per channel slab (phasor slabs are
   * excluded — they hold derived g/s/i values, not the layer's channels).
   * A uniform ("empty") brick replicates its single value across channels.
   */
  sampleResidentEx(
    layerId: string,
    baseVoxel: Vec3,
    desiredLevel: number,
  ): { values: number[]; level: number } | null {
    const pool = this.poolFor(layerId);
    if (!pool) return null;
    const read = resolveResidentRead(pool, baseVoxel, desiredLevel);
    if (!read) return null;
    const channelCount = Math.max(1, pool.geometry.channelSlabCount);
    if (read.kind === "empty") {
      return { values: Array<number>(channelCount).fill(read.value), level: read.level };
    }
    const values = new Array<number>(channelCount);
    for (let channel = 0; channel < channelCount; channel++) {
      const value = this.sampleChunkCacheSync(pool, read.level, baseVoxel, channel);
      if (value === null) return null; // chunk evicted: whole readout pends
      values[channel] = value;
    }
    return { values, level: read.level };
  }

  /**
   * The LEVEL the shader would sample at a base voxel — the finest resident
   * brick at or coarser than `desiredLevel` — without reading any value.
   * Null when nothing is resident at any level (the walk fell off the top).
   *
   * Deliberately NOT `sampleResidentEx(...)?.level`: that answers null when
   * the value is unavailable, which for a brick whose chunk was evicted from
   * the decode cache it routinely is — reporting "nothing resident" for a
   * brick that is on screen. The level is settled by the page-table walk
   * alone, so a level-only question must not be gated on a value read.
   * Consumer: `features/bricks/CenterLodReadout.tsx`.
   */
  residentLevelAt(layerId: string, baseVoxel: Vec3, desiredLevel: number): number | null {
    const pool = this.poolFor(layerId);
    if (!pool) return null;
    return resolveResidentRead(pool, baseVoxel, desiredLevel)?.level ?? null;
  }

  private sampleChunkCacheSync(
    pool: LayerBrickPool,
    levelIndex: number,
    baseVoxel: Vec3,
    channel: number,
  ): number | null {
    return sampleChunkCacheSync(
      this.chunks,
      this.getArrayForStoreId,
      pool,
      levelIndex,
      baseVoxel,
      channel,
    );
  }

  /** Store lookup for the sync probe (throws while the store is not open). */
  private readonly getArrayForStoreId = (storeId: string) =>
    this.deps.viewerStore.getState().getArrayForStoreId(storeId);

  /**
   * Exact level-0 voxel read for the probe's async value upgrade (see
   * `readExactVoxel`). Resolves null when the pool is gone or its slice
   * signature changed while awaiting (the caller re-guards on merge), and
   * for phasor layers — their slabs are derived at repack time and have no
   * per-voxel source value to read.
   */
  async fetchExactVoxel(
    layerId: string,
    baseVoxel: Vec3,
  ): Promise<{ values: number[]; sliceSignature: string } | null> {
    const pool = this.poolFor(layerId);
    if (!pool || hasPhasorSlabs(pool.geometry)) return null;
    const sliceSignature = pool.sliceSignature;
    const arr = this.getArrayForStoreId(pool.geometry.levels[0].storeId);
    const values = await readExactVoxel(pool, baseVoxel, (storeId, chunkCoords) =>
      // Interactive tier: a probe's exact-voxel read must not queue behind
      // streaming decodes (whose priorities scale with fetchGeneration).
      this.chunks.fetchChunkShared(arr, storeId, chunkCoords, INTERACTIVE_FETCH_PRIORITY),
    );

    if (this.disposed) return null;
    const current = this.poolFor(layerId);
    if (!current || current.sliceSignature !== sliceSignature) return null;
    return { values, sliceSignature };
  }

  /** New work may exist (plan change, fetch completion, GPU requeue): the next
   * `drainUploads` must run its full pass. */
  private wakeDrain(): void {
    this.drainNeeded = true;
  }

  /**
   * Streaming render-cadence gate (gap 1a): request a frame for freshly landed
   * residency work. While streaming and the camera is quiet, actual
   * `invalidate()`s are coalesced to the residencyBumpMs cadence — every
   * skipped one was a whole-scene re-raymarch that showed a single brick
   * batch — and the off-frame pump timer keeps `drainUploads` running between
   * frames so the UPLOAD pipeline never slows down (the invalidate used to do
   * both jobs). The drained edge and interacting frames bypass the gate
   * (`resolveStreamFrameAction`). The pump re-reads the interaction state at
   * fire time and re-enters this gate via the drain, so a burst that ends
   * mid-window still gets its trailing settled frame.
   */
  private scheduleStreamingFrame(interacting: boolean, streaming: boolean): void {
    const now = performance.now();
    const action = resolveStreamFrameAction({
      streaming,
      interacting,
      nowMs: now,
      lastInvalidateAtMs: this.lastStreamInvalidateAt,
      cadenceMs: qualityGovernor.getProfile().residencyBumpMs,
    });
    if (action === "invalidate") {
      this.lastStreamInvalidateAt = now;
      this.pendingStreamFrame = false;
      this.invalidate();
      return;
    }
    this.stats.streamFramesCoalesced += 1;
    this.pendingStreamFrame = true;
    if (this.drainPumpTimer !== null) return;
    this.drainPumpTimer = setTimeout(() => {
      this.drainPumpTimer = null;
      if (this.disposed) return;
      this.drainUploads(this.deps.isInteracting?.() ?? false);
      // The drain re-enters this gate itself when it uploaded or left work
      // queued. If it did neither (queue drained mid-window, fetches still in
      // flight) the coalesced batches still owe a frame — keep knocking until
      // the cadence window closes and the invalidate branch clears the flag.
      if (this.pendingStreamFrame && !this.disposed) {
        this.scheduleStreamingFrame(
          this.deps.isInteracting?.() ?? false,
          this.anyPipelineWork(),
        );
      }
    }, DRAIN_PUMP_MS);
  }

  /**
   * Three passes, because pools are shared across layers:
   *
   *  1. DERIVE — per layer, resolve geometry/spec/viability and its pool key.
   *     Nothing is created; layers that group onto one key are collected.
   *  2. MATERIALIZE — get-or-create one pool per distinct key (the byte budget
   *     divides by the DISTINCT POOL count, not the layer count), reconcile
   *     membership, dispose pools nobody claims.
   *  3. RECONCILE — once per pool, against the UNION of its members' plans.
   *
   * The union matters: members' plans are not identical (each layer has its own
   * view range and voxel→world transform), so reconciling per layer against one
   * shared pool would have each member clobber the previous one's protected set
   * and pending fetches. A union is a superset of every member plan, so no
   * member is ever starved of a brick it planned.
   */
  private reconcileAll(plans: Record<string, LayerNodePlan>): void {
    if (this.disposed) return;
    this.wakeDrain();
    // New plan generation: chunk tasks dispatched from here on outrank any
    // still-queued tasks of previous plans in the worker pool.
    this.fetchGeneration += 1;
    const layers = this.deps.sceneStore.getState().layers;

    // --- Pass 1: derive ---------------------------------------------------
    type Group = {
      derivation: PoolDerivation;
      layers: LayerState[];
      plans: LayerNodePlan[];
      /** Every member's own derivation, for the dev-only join assertion. */
      derivations: PoolDerivation[];
    };
    const groups = new Map<string, Group>();
    // O(1) lookups — `layers.find` per plan (and again per cached derivation
    // below) was O(plans × layers) per reconcile.
    const layerById = new Map(layers.map((l) => [l.id, l]));
    for (const [layerId, plan] of Object.entries(plans)) {
      const layer = layerById.get(layerId);
      if (!layer) continue;
      try {
        const derivation = this.derivePool(layer, plan);
        if (!derivation) continue;
        const group = groups.get(derivation.poolKey);
        if (group) {
          group.layers.push(layer);
          group.plans.push(plan);
          group.derivations.push(derivation);
        } else {
          groups.set(derivation.poolKey, {
            derivation,
            layers: [layer],
            plans: [plan],
            derivations: [derivation],
          });
        }
      } catch (error) {
        // Contain per-layer failures: one bad layer must not abort the rest.
        console.warn(`[bricks] derivation failed for ${layerId}`, error);
      }
    }

    // Derivation caches for layers that vanished entirely.
    for (const layerId of [...this.layerDerivationCache.keys()]) {
      if (!plans[layerId] || !layerById.has(layerId)) {
        this.layerDerivationCache.delete(layerId);
      }
    }
    // --- Pass 2: materialize ---------------------------------------------
    const planCount = Math.max(1, groups.size);
    const live = new Set<string>();
    for (const [poolKey, group] of groups) {
      try {
        const pool = this.ensurePool(group.derivation, group.layers, planCount);
        if (!pool) continue;
        live.add(pool.poolKey);
        pool.members = new Set(group.layers.map((l) => l.id));
        if (import.meta.env?.DEV) {
          for (const derivation of group.derivations) {
            this.assertFixedIndicesMatch(pool, derivation);
          }
        }
      } catch (error) {
        console.warn(`[bricks] pool creation failed for ${poolKey}`, error);
      }
    }

    // Pools nobody claims any more (layer removed, or its key moved and the
    // pool could not be flushed in place).
    for (const [poolKey, pool] of [...this.pools]) {
      if (live.has(poolKey)) continue;
      this.disposePool(pool);
      this.pools.delete(poolKey);
    }

    // Rebuild the layer→pool index from what actually exists, rather than
    // patching it per group: a layer whose pool failed to materialize (store
    // not open yet, unviable geometry) must resolve to null, not to whatever
    // pool it had last reconcile.
    this.layerToPoolKey.clear();
    for (const pool of this.pools.values()) {
      for (const layerId of pool.members) this.layerToPoolKey.set(layerId, pool.poolKey);
    }

    // --- Pass 3: reconcile each pool once --------------------------------
    for (const group of groups.values()) {
      const pool = this.pools.get(group.derivation.poolKey);
      if (!pool) continue;
      try {
        this.reconcilePool(pool, group.plans);
      } catch (error) {
        console.warn(`[bricks] reconcile failed for pool ${pool.poolKey}`, error);
      }
    }

    // --- Pass 4: dispatch globally ----------------------------------------
    // One scene-wide k-way merge over every pool's sorted queue, so the
    // in-flight set holds the best-ranked bricks ACROSS pools (R6a).
    this.startNextFetchesGlobal();

    // Time-to-sharp: start the wall clock when a reconcile enqueues work
    // while the pipeline is idle (drainUploads stops it on the drained edge).
    if (this.streamStartedAt === null && this.anyPipelineWork()) {
      this.streamStartedAt = performance.now();
      // Same edge, same meaning, for React consumers: the image is about to
      // change, so anything that wants the FINAL picture (the auto-snapshot)
      // must wait for the drained edge below.
      this.deps.viewerStore.getState().setSharp(false);
    }
  }

  /** Work anywhere in the pipeline? (Allocation-free — runs per drain frame.) */
  private anyPipelineWork(): boolean {
    for (const pool of this.pools.values()) {
      if (
        pool.queue.length > 0 ||
        pool.inFlight.size > 0 ||
        pool.pendingFetch.length > 0 ||
        pool.pendingHalo.length > 0
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Dev-only invariant: a layer joining an existing pool must agree on the
   * collapsed non-spatial indices. The key does not carry them directly — it
   * carries `sliceSignature` plus each level's chunking, which are exactly the
   * inputs of `computeFixedIndices`, so agreement is implied. This turns that
   * inference into something that fails loudly if either side ever changes.
   */
  private assertFixedIndicesMatch(pool: LayerBrickPool, derivation: PoolDerivation): void {
    const { fixedChunkCoords, fixedOffsets } = computeFixedIndices(
      derivation.layer,
      derivation.geometry,
      derivation.levels as LevelSource[],
      this.deps.viewerStore.getState().dimSelections,
    );
    const same =
      fixedChunkCoords.length === pool.fixedChunkCoords.length &&
      fixedOffsets.length === pool.fixedOffsets.length &&
      fixedChunkCoords.every((v, i) => v === pool.fixedChunkCoords[i]) &&
      fixedOffsets.every((v, i) => v === pool.fixedOffsets[i]);
    if (!same) {
      console.error(
        `[bricks] pool key collision: layer ${derivation.layer.id} joined pool ` +
          `${pool.poolKey} but resolves different fixed indices ` +
          `(${JSON.stringify({ fixedChunkCoords, fixedOffsets })} vs ` +
          `${JSON.stringify({
            fixedChunkCoords: pool.fixedChunkCoords,
            fixedOffsets: pool.fixedOffsets,
          })}). The key is missing a field.`,
      );
    }
  }

  /** Reconcile one pool against the union of its members' plans. */
  private reconcilePool(pool: LayerBrickPool, plans: readonly LayerNodePlan[]): void {
    // UNION across members: a brick planned by any member must be fetched and
    // protected, because they all read the same atlas.
    const planKeys = new Set<string>();
    for (const plan of plans) {
      for (const node of plan.nodes) planKeys.add(node.key);
    }

    // Everything in the plan is protected; the coarsest level stays pinned so
    // the shader's fallback of last resort survives any eviction pressure.
    // `coarsestResident` is maintained incrementally at acquire/release — the
    // old per-replan walk parsed every resident key (O(pool) allocations,
    // ≤5×/s during a zoom).
    const protectedKeys = new Set(planKeys);
    for (const key of pool.coarsestResident) protectedKeys.add(key);
    pool.protectedKeys = protectedKeys;
    pool.pool.touch(planKeys);

    // CHUNK decodes of out-of-plan bricks are still never aborted — aborting
    // shared decodes used to refetch the same bricks over and over under plan
    // oscillation (observed 13× amplification), and a completed decode lands
    // in the shared cache so a flip-back is a cache hit. What IS released
    // eagerly is the brick-level CONCURRENCY slot: aborting the per-brick
    // controller makes fetchBrick's race resolve immediately, freeing its
    // inFlight slot for a newly planned brick instead of holding it until the
    // stale decodes (now at a lower generation priority) finally finish.
    // Already-repacked stale bricks still upload only on leftover budget into
    // FREE slots. Content is keyed by (level, coords) under an unchanged
    // sliceSignature, so a kept brick is never wrong — only possibly unneeded.
    // In-flight COARSEST bricks are exempt, mirroring the staleness
    // checkpoint: an in-flight coarsest brick is the shader's fallback of
    // last resort and must land regardless of plan churn.
    const coarsestLevel = pool.geometry.levels.length - 1;
    for (const [key, controller] of pool.inFlight) {
      if (!protectedKeys.has(key) && parseNodeKey(key).level !== coarsestLevel) {
        controller.abort();
      }
    }

    // Fetch every planned node that isn't resident yet, in band/score order
    // (see compareFetchOrder): rootLevel backdrop first, then on-screen nodes
    // by distance to the view focus with coarse-first ties, margin prefetch
    // last. Only the tier profile's maxInflightBricks run concurrently; the
    // rest wait in pendingFetch.
    // Reversed: the global dispatch (peekLiveFetch) pops from the tail.
    // Deduped by key across members — two layers planning the same brick must
    // enqueue one fetch, not two (the second would be dropped by the guards in
    // peekLiveFetch anyway, but only after occupying a queue slot).
    const seen = new Set<string>();
    const pending: PlannedNode[] = [];
    for (const plan of plans) {
      for (const node of plan.nodes) {
        if (seen.has(node.key)) continue;
        seen.add(node.key);
        if (
          pool.pool.has(node.key) ||
          pool.emptyValues.has(node.key) ||
          pool.inFlight.has(node.key) ||
          pool.queuedKeys.has(node.key)
        ) {
          continue;
        }
        pending.push(node);
      }
    }
    // fetchScore units are each member layer's base voxels, so cross-layer
    // ordering is approximate (already true of the per-plan emission index).
    pool.pendingFetch = pending.sort(compareFetchOrder).reverse();
    // Halo refines of bricks that left the plan are moot (dispatch re-checks
    // too; this just keeps the queue bounded by the plan).
    if (pool.pendingHalo.length > 0) {
      pool.pendingHalo = pool.pendingHalo.filter((node) => protectedKeys.has(node.key));
    }
    // Sharded levels: warm the shard indexes the first fetches will need, so
    // the index round trip overlaps the queue wait instead of preceding the
    // first inner-chunk read of every shard.
    warmShardIndexes(
      pool,
      pool.pendingFetch,
      this.initialPhase(pool),
      this.chunks,
      this.getArrayForStoreId,
    );
    // Fresh plan → fresh retry allowance (see the fetchBrick catch).
    pool.fetchRetries.clear();

    // Reclaim headroom BEFORE dispatching, so this reconcile's fetches land in
    // free slots instead of evicting each other. Dispatch itself happens ONCE,
    // globally, after every pool has reconciled (reconcileAll) — per-pool
    // dispatch here let the first pool fill the global in-flight cap before
    // later pools' better-ranked bricks were even queued.
    this.trimUnreachableResidents(pool, plans);
  }

  /**
   * Release residents the shader provably cannot sample — bricks finer than
   * every member plan's target level (see `selectTrimCandidates`).
   *
   * Headroom-triggered, not unconditional: trimming costs a refetch if the plan
   * zooms back in, so it only fires once the pool's deliberate cache headroom
   * is actually gone. The 512 MB decoded-chunk cache means a flip-back is a
   * repack rather than a network round trip, which bounds the downside.
   */
  private trimUnreachableResidents(
    pool: LayerBrickPool,
    plans: readonly LayerNodePlan[],
  ): void {
    let minTargetLevel = Number.POSITIVE_INFINITY;
    for (const plan of plans) minTargetLevel = Math.min(minTargetLevel, plan.targetLevel);
    if (!Number.isFinite(minTargetLevel)) minTargetLevel = 0;
    // Also gates the stale drain (partitionUploadQueue), so it is recorded even
    // when no trimming is needed this pass.
    pool.minTargetLevel = minTargetLevel;
    if (minTargetLevel <= 0) return;

    // Capped by the pool: a small pyramid's atlas can be smaller than the
    // headroom TARGET, and comparing against the raw constant is then
    // unconditionally true — every reconcile trimmed every unprotected brick
    // of a 9-slot pool, refetching the whole pyramid on each zoom-out (P25).
    const headroomSlots = poolHeadroomSlots(pool.pool.capacity);
    const free = pool.pool.capacity - pool.pool.size;
    if (free >= headroomSlots) return;

    const victims = selectTrimCandidates({
      keys: pool.pool.keys(),
      protectedKeys: pool.protectedKeys,
      levelOf: (key) => parseNodeKey(key).level,
      minTargetLevel,
      needed: headroomSlots - free,
    });

    for (const key of victims) {
      const { level, coords } = parseNodeKey(key);
      pool.pool.release(key);
      setPageEntry(pool.pageTable, level, coords, null, PAGE_FLAG_UNMAPPED);
      pool.provisionalKeys.delete(key);
      pool.coarsestResident.delete(key);
      // Same bookkeeping as eviction: brickRanges is bounded by slot count
      // only if released keys leave it (measuredRanges deliberately stays).
      pool.brickRanges.delete(key);
      pool.brickSlabRanges.delete(key);
      this.stats.trimmed += 1;
    }
    // The page writes land in the dirty region; drainUploads flushes every
    // pool's page table and reconcileAll has already called wakeDrain().
  }

  /** Concurrent brick fetches across ALL pools. The per-pool ceiling alone
   * made total decode pressure LINEAR in layer count (N pools × 16 in-flight
   * on HIGH) — the many-layers fetch-storm half of the linear-cost problem.
   * 2× one pool's allowance keeps cross-pool parallelism without the blowup. */
  private globalInFlightLimit(): number {
    return qualityGovernor.getProfile().maxInflightBricks * 2;
  }

  private totalInFlight(): number {
    let total = 0;
    for (const pool of this.pools.values()) total += pool.inFlight.size;
    return total;
  }

  /** The live head of a pool's fetch queue (tail of the reversed array),
   * dropping entries the guards would skip — dead entries must not win a
   * cross-pool comparison. */
  private peekLiveFetch(pool: LayerBrickPool): PlannedNode | null {
    while (pool.pendingFetch.length > 0) {
      const node = pool.pendingFetch[pool.pendingFetch.length - 1];
      if (
        !pool.protectedKeys.has(node.key) ||
        pool.pool.has(node.key) ||
        pool.emptyValues.has(node.key) ||
        pool.inFlight.has(node.key) ||
        pool.queuedKeys.has(node.key)
      ) {
        pool.pendingFetch.pop();
        continue;
      }
      return node;
    }
    return null;
  }

  /**
   * GLOBAL fetch dispatch (roadmap R6a): a k-way merge over the per-pool
   * sorted queues, so the scene-wide dispatch order IS `compareFetchOrder` —
   * backdrop bands first, then on-screen bricks by foveated distance ACROSS
   * pools. Per-pool dispatch filled the global in-flight cap arrival-order:
   * on a multi-layer scene the first pool's screen-edge bricks starved every
   * other pool's screen-center bricks, so the fovea sharpened layer by layer
   * instead of scene-wide. (`fetchScore` units are each layer's base voxels,
   * so cross-POOL ordering is approximate — already true across the members
   * of one merged pool.) Ordering-only: the same guards, the same per-pool
   * ceiling (it protects a pool's decode-cache share) and the same global cap
   * admit exactly the bricks the per-pool loops admitted.
   *
   * Called after a full reconcile, from every fetch's `finally` (a completed
   * fetch in pool A frees a global slot pool B may be waiting on), and from
   * the GPU-repack retry requeue. Cheap: pools are few, empty queues no-op.
   */
  private startNextFetchesGlobal(): void {
    if (this.disposed) return;
    const maxInflight = qualityGovernor.getProfile().maxInflightBricks;
    const globalLimit = this.globalInFlightLimit();
    let globalInFlight = this.totalInFlight();
    while (globalInFlight < globalLimit) {
      let bestPool: LayerBrickPool | null = null;
      let bestNode: PlannedNode | null = null;
      for (const pool of this.pools.values()) {
        if (pool.inFlight.size >= maxInflight) continue;
        if (
          // Pre-attach there is no drain, so the queue only grows — hold it
          // at the in-flight ceiling until a renderer arrives to consume it.
          !shouldDispatchFetch({
            detached: this.renderer === null,
            queuedBricks: pool.queue.length,
            cap: maxInflight,
          })
        ) {
          continue;
        }
        const node = this.peekLiveFetch(pool);
        if (!node) continue;
        if (!bestNode || compareFetchOrder(node, bestNode) < 0) {
          bestPool = pool;
          bestNode = node;
        }
      }
      if (!bestPool || !bestNode) break;
      // Margin-only prefetch (band 2) waits for BOTH a resting camera and an
      // empty on-screen pipeline. It used to be merely ordered last, so every
      // gesture still paid its fetches, decodes (never aborted) and uploads
      // for bricks that were never on screen — and a quick zoom's settle plan
      // found the workers busy with them. compareFetchOrder sorts band first,
      // so a band-2 winner here means no pool has band-0/1 work pending; the
      // settle replan and every on-screen fetch's `finally` re-run this
      // dispatch, which is when the deferred entries get their turn.
      if (
        shouldDeferPrefetch({
          fetchBand: bestNode.fetchBand,
          inFlightOnScreen: this.inFlightOnScreen,
          interacting: this.deps.isInteracting?.() ?? false,
        })
      ) {
        return;
      }
      bestPool.pendingFetch.pop();
      globalInFlight += 1;
      coldOpenTimeline.stamp("firstBrickRequested");
      void this.fetchBrick(bestPool, bestNode);
    }
    this.dispatchHalos(globalInFlight, globalLimit, maxInflight);
  }

  /**
   * Halo refines (two-phase bricks) run only once every pool's planned queue
   * is empty — the loop above `break`s here in exactly that state — and under
   * the band-2 gate (resting camera, no on-screen fetch in flight), so a rind
   * refine never competes with a brick the user is waiting for. Arrival
   * order across pools; a refine that no longer matches a provisional
   * resident is dropped (the guards mirror `fetchBrick`'s halo checkpoint).
   */
  private dispatchHalos(globalInFlight: number, globalLimit: number, maxInflight: number): void {
    if (
      shouldDeferPrefetch({
        fetchBand: 2,
        inFlightOnScreen: this.inFlightOnScreen,
        interacting: this.deps.isInteracting?.() ?? false,
      })
    ) {
      return;
    }
    for (const pool of this.pools.values()) {
      while (globalInFlight < globalLimit && pool.inFlight.size < maxInflight) {
        const node = pool.pendingHalo.pop();
        if (!node) break;
        if (
          !haloStillWanted({
            planned: pool.protectedKeys.has(node.key),
            resident: pool.pool.has(node.key),
            provisional: pool.provisionalKeys.has(node.key),
            inFlight: pool.inFlight.has(node.key),
            queued: pool.queuedKeys.has(node.key),
          })
        ) {
          continue;
        }
        globalInFlight += 1;
        void this.fetchBrick(pool, node, "full", true);
      }
    }
  }

  /**
   * Everything needed to key and build a pool for one layer, with no side
   * effects beyond the derivation cache. Returns null when the layer cannot
   * back a pool (store not resolvable yet, no usable geometry, or unviable).
   */
  private derivePool(layer: LayerState, plan: LayerNodePlan): PoolDerivation | null {
    const viewerState = this.deps.viewerStore.getState();

    const structure = deriveLayerStructure(
      layer,
      plan.mode,
      this.layerDerivationCache,
      viewerState.getArrayForStoreId,
    );
    if (!structure) return null;
    const { viability } = structure;

    // Hard stop (defense in depth — nodePlanTracker refuses such layers before
    // any plan exists): the coarsest-grid slot floor below OVERRIDES the byte
    // budget by design (P16), so a no-pyramid layer would otherwise attempt a
    // multi-GB atlas allocation here (an uncaught RangeError that also aborts
    // reconciliation of the remaining layers). See P18.
    if (!viability.viable) {
      if (!this.warnedUnviable.has(layer.id)) {
        this.warnedUnviable.add(layer.id);
        console.warn(
          `[bricks] refusing pool for ${layer.id}: coarsest-level floor ` +
            `${(viability.floorBytes / (1024 * 1024)).toFixed(0)} MB exceeds ` +
            `${(viability.capBytes / (1024 * 1024)).toFixed(0)} MB budget (no usable pyramid?)`,
        );
      }
      const state = this.deps.viewerStore.getState();
      if (!state.unplannableLayers[layer.id]) {
        state.setUnplannableLayers({
          ...state.unplannableLayers,
          [layer.id]: {
            mode: plan.mode,
            floorBytes: viability.floorBytes,
            capBytes: viability.capBytes,
          },
        });
      }
      return null;
    }

    return buildPoolDerivation(layer, plan, structure);
  }

  /**
   * Get-or-create the pool for one derivation group.
   *
   * `planCount` is the number of DISTINCT POOLS, not layers — it divides the
   * volume-texture budget, and `nodePlanTracker` must count the same way or
   * plans will request more slots than the atlas holds.
   */
  private ensurePool(
    derivation: PoolDerivation,
    members: readonly LayerState[],
    planCount: number,
  ): LayerBrickPool | null {
    const viewerState = this.deps.viewerStore.getState();
    const { levels, geometry, structureSignature, poolKey } = derivation;
    const layer = derivation.layer;

    const existing = this.pools.get(poolKey);
    if (existing) return existing;

    // The key moved but the STRUCTURE did not — a slice change (dim slider, new
    // lens slice) or a value-range change. Reuse the allocation: flushing costs
    // a refetch, reallocating costs a refetch AND a fresh multi-hundred-MB
    // atlas. Only valid when the whole membership moves together; a partial
    // move means some layers still need the old contents, so that pool stays
    // and this group gets a new one.
    const movable = [...this.pools.values()].find(
      (pool) =>
        pool.structureSignature === structureSignature &&
        pool.members.size === members.length &&
        members.every((m) => pool.members.has(m.id)),
    );
    if (movable) {
      this.pools.delete(movable.poolKey);
      this.prefetcher.forgetSlab(movable.poolKey);
      const flushed = movable.sliceSignature !== derivation.sliceSignature;
      if (flushed) {
        this.flushPool(movable, derivation.sliceSignature, layer, levels as LevelSource[]);
      }
      if (retargetMovedPool(movable, derivation, flushed)) this.wakeDrain();
      this.pools.set(poolKey, movable);
      // The decode uniforms (minValue/maxValue, uEmptyDecode*, uOccDecode*)
      // ride poolsVersion — without this bump a moved range left EMPTY
      // bricks decoding at wrong intensities indefinitely.
      this.deps.viewerStore.getState().bumpPoolsVersion();
      this.invalidate();
      return movable;
    }

    let allocatedAtlasBytes = 0;
    for (const pool of this.pools.values()) {
      allocatedAtlasBytes += pool.atlas.byteLength;
    }
    const pool = createLayerBrickPool({
      derivation,
      members,
      planCount,
      renderer: this.renderer,
      allocatedAtlasBytes,
      // Called for its side effect only — build the repacker now, while we
      // are already off the hot path.
      ensureGpuRepacker: () => {
        this.ensureGpuRepacker();
      },
      dimSelections: () => this.deps.viewerStore.getState().dimSelections,
    });
    if (!pool) return null;
    this.pools.set(poolKey, pool);
    // Warm the sync-probe chunk-key encoders for every level now — the debug
    // report's channel-slab probe runs synchronously and cannot await the
    // metadata (see warmChunkKeyEncoder).
    for (const level of geometry.levels) {
      try {
        this.chunks.warmChunkKeyEncoder(
          level.storeId,
          viewerState.getArrayForStoreId(level.storeId),
        );
      } catch {
        // Store not resolvable yet — the sampleChunkCacheSync fallback retries.
      }
    }
    // Pool LIFECYCLE event (not streaming progress): this is what layer
    // components re-render on — see viewerStore.poolsVersion.
    this.deps.viewerStore.getState().bumpPoolsVersion();
    coldOpenTimeline.stamp("poolCreated");
    return pool;
  }

  /** The phase a brick's FIRST fetch runs in for this pool (two-phase bricks). */
  private initialPhase(pool: LayerBrickPool): FetchPhase {
    return initialFetchPhase({ enabled: this.twoPhaseBricks, border: pool.spec.border });
  }

  /**
   * @param phase `core` / `full` for a brick's first fetch (see
   *   `initialPhase`); `full` with `halo` set for the deferred border refine
   *   of an already-resident provisional brick.
   */
  private async fetchBrick(
    pool: LayerBrickPool,
    node: PlannedNode,
    phase: FetchPhase = this.initialPhase(pool),
    halo = false,
  ): Promise<void> {
    const controller = new AbortController();
    pool.inFlight.set(node.key, controller);
    // A halo refine is background work: it must never hold band-2 prefetch
    // back, and its decodes sort below every planned fetch in the pool.
    const onScreen = !halo && node.fetchBand <= 1;
    if (onScreen) this.inFlightOnScreen += 1;
    const fetchStartedAt = performance.now();
    // Generation priority: this plan's decodes outrank stranded queued tasks
    // of earlier plans in the worker pool (see fetchGeneration).
    const fetchPriority = halo ? -1 : this.fetchGeneration;
    /** Chunk keys this brick registered as a referrer for (released in finally). */
    const acquiredChunkKeys: string[] = [];
    /** Unique per INVOCATION — see fetchOwnerSeq: the same brick key can have
     * two overlapping fetches during a plan flip, and the old one's release
     * must never strip the new one's reference. */
    const ownerToken = `${node.key}#${++this.fetchOwnerSeq}`;
    /** Set by the catch when a still-planned brick's fetch failed and has
     * retry budget left; consumed in the finally (after inFlight clears). */
    let retryNode = false;

    try {
      const level = pool.geometry.levels[node.level];
      const arr = this.deps.viewerStore.getState().getArrayForStoreId(level.storeId);

      const chunkSpecs = enumerateBrickChunkCoords(pool, node.level, node.coords, phase);
      for (const { chunkCoords } of chunkSpecs) {
        const chunkKey = `${level.storeId}:${chunkCoords.join(",")}`;
        acquiredChunkKeys.push(chunkKey);
        this.chunks.acquireRef(chunkKey, ownerToken);
      }

      // One grouped call: inner chunks of the same shard that sit close in
      // the object coalesce into one ranged GET (sharded arrays only; the
      // group degenerates to per-chunk fetches otherwise).
      const chunkPromises = this.chunks.fetchChunksShared(
        arr,
        level.storeId,
        chunkSpecs.map((spec) => spec.chunkCoords),
        fetchPriority,
      );
      const fetches: Promise<GpuQueuedChunk>[] = chunkSpecs.map(
        ({ spatial, channelChunk, phasorChunk, chunkCoords }, index) =>
          chunkPromises[index].then((chunk) => ({
            coords: spatial,
            channelChunk,
            phasorChunk,
            data: chunk.data as BrickArray,
            shape: chunk.shape,
            stride: chunk.stride,
            // Same key as fetchChunkShared — the GPU chunk-buffer cache
            // mirrors the decoded-chunk cache's identity.
            cacheKey: `${level.storeId}:${chunkCoords.join(",")}`,
          })),
      );
      // Race the chunk await against the per-brick abort: a replan that drops
      // this brick (reconcileLayer aborts its controller) releases the
      // inFlight concurrency slot IMMEDIATELY — the shared chunk decodes
      // themselves keep running in the background and land in the cache.
      const allChunks = Promise.all(fetches);
      allChunks.catch(() => {}); // may settle after being abandoned below
      const chunks = await Promise.race([
        allChunks,
        new Promise<null>((resolve) => {
          if (controller.signal.aborted) resolve(null);
          else controller.signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
      ]);
      if (chunks === null) {
        this.stats.staleFetches += 1;
        return; // finally: inFlight release + startNextFetches
      }
      if (controller.signal.aborted || this.disposed) return;

      this.stats.chunkRequests += fetches.length;
      this.stats.fetchMs += performance.now() - fetchStartedAt;

      // Halo refine: the brick must still be the provisional resident it was
      // when queued (a replan, eviction or flush in between makes the rind
      // moot — a fresh core fetch will schedule its own halo).
      if (
        halo &&
        !haloStillWanted({
          planned: pool.protectedKeys.has(node.key),
          resident: pool.pool.has(node.key),
          provisional: pool.provisionalKeys.has(node.key),
          inFlight: false,
          queued: pool.queuedKeys.has(node.key),
        })
      ) {
        this.stats.staleFetches += 1;
        return;
      }

      // Staleness checkpoint: the plan moved on while fetching (2D pan — the
      // node set turns over as bricks scroll). The decoded chunks stay in the
      // shared cache, so a flip-back refetches at cache-hit cost plus one
      // repack; spending a repack worker + queue slot on an out-of-plan brick
      // here would delay newly visible bricks instead. Coarsest-level bricks
      // are exempt — protectedKeys only pins coarsest bricks already RESIDENT,
      // and an in-flight one is the shader's fallback of last resort.
      if (
        !halo &&
        node.level !== pool.geometry.levels.length - 1 &&
        !pool.protectedKeys.has(node.key)
      ) {
        this.stats.staleFetches += 1;
        return; // finally: inFlight release + startNextFetches
      }

      const stored = pool.spec.stored;
      const elementCount = stored[0] * stored[1] * stored[2] * pool.spec.channelCount;

      let pending: PendingBrick;
      const gpuRepacker = this.ensureGpuRepacker();
      // The GPU repack kernel is a strided COPY — it cannot reduce a phasor
      // axis. A layer with a phasor node therefore always takes the CPU worker
      // path (a follow-up can teach the compute kernel the DFT).
      const reducesPhasor = hasPhasorSlabs(pool.geometry);
      const gpuIneligible = pool.gpuIneligibleKeys.has(node.key);
      const useGpu =
        !reducesPhasor &&
        !gpuIneligible &&
        !!gpuRepacker?.ready() &&
        gpuRepacker.supports(pool.atlas, chunks);
      pool.lastRepackPath = useGpu
        ? "gpu"
        : gpuIneligible
          ? "cpu:gpu-ineligible"
          : reducesPhasor
            ? "cpu:phasor"
            : this.renderer === null
              ? // Pre-attach bricks legitimately take the CPU path; keep it
                // distinguishable from a genuinely unavailable repacker so the
                // debug report cannot be misread as the `computeStorage` trap.
                "cpu:no-renderer"
              : gpuRepacker === null
                ? "cpu:no-repacker"
                : !gpuRepacker.ready()
                  ? `cpu:${gpuRepacker.status()}`
                  : `cpu:unsupported:${pool.atlas.kind}`;
      if (useGpu) {
        // GPU path: the repack IS the upload (a compute dispatch straight
        // into the atlas slot at drain time) — only chunk handles queue here.
        pending = {
          key: node.key,
          level: node.level,
          coords: node.coords,
          data: null,
          uniformValue: null,
          range: null,
          slabRanges: null,
          bytes: atlasSlotBytes(pool.spec, pool.atlas.kind),
          gpu: { chunks },
          phase,
        };
      } else {
        // Repack runs OFF the UI thread (worker pool); SAB-backed chunks travel
        // zero-copy, the output brick comes back as a transferable. repackMs is
        // wall time (queue + worker), not main-thread time.
        const repackStartedAt = performance.now();
        const result = await this.deps.repack.repack({
          kind: pool.atlas.kind,
          elementCount,
          input: {
            spec: pool.spec,
            level,
            axes: pool.geometry.axes,
            slabs: pool.geometry.slabs,
            phasorBins: pool.geometry.phasorBins,
            brickBox: nodeVoxelBox(pool.geometry, pool.spec, node.level, node.coords),
            // Core phase: the payload box — `replicateEdges` fills the rind
            // from the payload's edge, exactly as for level-edge bricks.
            fetchBox: brickFetchBox(pool.geometry, pool.spec, node.level, node.coords, phase),
            fixedOffsets: pool.fixedOffsets,
            chunks,
          },
          // A brick cancelled while its repack is still queued behind other
          // jobs is dropped from the dispatcher instead of being posted; the
          // rejection lands in the catch below, which is silent once aborted.
          signal: controller.signal,
        });
        this.stats.repackMs += performance.now() - repackStartedAt;
        if (controller.signal.aborted || this.disposed) return;
        this.accumulateAutoRange(pool, result.min, result.max);
        pending = {
          key: node.key,
          level: node.level,
          coords: node.coords,
          data: result.data,
          uniformValue: result.uniformValue,
          range: [result.min, result.max],
          slabRanges:
            pool.occSlabs > 1 ? normalizeSlabRanges(result.slabRanges, pool.spec.channelCount) : null,
          bytes: result.data.byteLength,
          gpu: null,
          phase,
        };
      }
      this.stats.bricksFetched += 1;
      if (phase === "core") this.stats.coreBricks += 1;
      coldOpenTimeline.stamp("firstBrickDecoded");

      this.wakeDrain();
      pool.queue.push(pending);
      pool.queuedKeys.add(node.key);
      // Gated (gap 1a): a fetch completes up to maxInflight×pools times per
      // second — each used to force a full-scene frame just to run the drain;
      // the gate pumps the drain off-frame and renders at the bump cadence.
      this.scheduleStreamingFrame(this.deps.isInteracting?.() ?? false, true);
    } catch (error) {
      if (!controller.signal.aborted) {
        this.stats.fetchErrors += 1;
        console.warn(`[bricks] fetch failed for pool ${pool.poolKey} ${node.key}`, error);
        // Bounded self-heal: a failed fetch of a STILL-PLANNED brick used to
        // wait for the next replan (a camera move) to retry — on an idle
        // camera that is a visible hole for seconds. Two retries per plan,
        // reset each reconcile; the actual requeue happens in the finally
        // below, after our own inFlight entry is gone.
        if (!halo && !this.disposed && pool.protectedKeys.has(node.key)) {
          const retries = pool.fetchRetries.get(node.key) ?? 0;
          if (retries < 2) {
            pool.fetchRetries.set(node.key, retries + 1);
            retryNode = true;
          }
        }
      }
    } finally {
      // Dead-queue cancellation: this brick no longer needs its chunks (see
      // ChunkService.releaseRef — never aborts a started shared decode).
      for (const chunkKey of acquiredChunkKeys) this.chunks.releaseRef(chunkKey, ownerToken);
      pool.inFlight.delete(node.key);
      if (
        retryNode &&
        !this.disposed &&
        !pool.inFlight.has(node.key) &&
        !pool.queuedKeys.has(node.key) &&
        !pool.pendingFetch.some((pendingNode) => pendingNode.key === node.key)
      ) {
        pool.pendingFetch.push(node); // tail = dispatched next
      }
      if (onScreen) this.inFlightOnScreen -= 1;
      // ALL pools, not just this one: the freed global in-flight slot may be
      // what another pool's queue is blocked on (see startNextFetchesGlobal).
      if (!this.disposed) this.startNextFetchesGlobal();
    }
  }

  /** Reusable progress snapshot for `drainUploads` (see `progressOf`). */
  private readonly drainProgressScratch = { bytes: 0, bricks: 0, elapsedMs: 0 };
  /** Per-pool drain lanes, reused across drains (see `DrainLane`). */
  private readonly drainLanes: DrainLane[] = [];

  /** Called from the provider's useFrame: bounded texture uploads per frame.
   * `interacting` (the camera is mid-gesture) switches to the trickle policy —
   * no free pass, no stale drain, no GPU-repack dispatch (see
   * `resolveDrainPolicy`) — so uploads stop colliding with gesture frames;
   * the deferred backlog drains at full budget on the first settled frame. */
  drainUploads(interacting = false): void {
    if (this.disposed) return;
    // No device, no uploads. Belt-and-braces — the only caller is the canvas
    // frame driver, which by construction has a renderer — but every GPU write
    // below dereferences `this.renderer` non-null on the strength of it.
    if (this.renderer === null) return;
    // Idle fast path: a previous drain saw the whole pipeline empty and no
    // GPU flush in flight — skip the pool walks and per-frame allocations
    // until wakeDrain() signals new work.
    if (!this.drainNeeded) return;
    const drainStartedAt = performance.now();
    const profile = qualityGovernor.getProfile();
    const policy = resolveDrainPolicy(
      { ...FRAME_UPLOAD_BUDGET, maxMs: profile.uploadBudgetMs },
      interacting,
    );
    const progress = { bytes: 0, bricks: 0, uploadedAny: false };
    // Evaluated in the drain loops' conditions, i.e. once per brick
    // considered per frame while streaming: fill one reusable view instead of
    // allocating a progress object per evaluation.
    const progressView = this.drainProgressScratch;
    const progressOf = () => {
      progressView.bytes = progress.bytes;
      progressView.bricks = progress.bricks;
      progressView.elapsedMs = performance.now() - drainStartedAt;
      return progressView;
    };

    // Planned-first two-pass drain over every pool's partitioned queue
    // (uploadDrain.ts: planned bricks from every pool spend the budget first,
    // stale ones only leftover budget into FREE slots).
    const drainDeps: DrainEntryDeps = {
      stats: this.stats,
      repack: this.deps.repack,
      renderer: this.renderer,
      gpuRepacker: this.gpuRepacker,
    };
    const lanes = this.drainLanes;
    const laneCount = partitionDrainLanes(this.pools.values(), lanes, drainDeps);
    runDrainLanes(drainDeps, lanes, laneCount, policy, progress, progressOf);

    // Write the undrained remainder back (feeds the streaming predicate and
    // the budget-exhausted invalidate below), apply any coalesced auto-range
    // EMPTY re-encode (one pass per frame, however many range moves landed —
    // see accumulateAutoRange), and flush dirty page tables.
    //
    // Drained-edge gate for the occupancy-range promotion: promoting while
    // bricks still stream cascaded — the growing union re-promoted on nearly
    // every drain (each one blanking the whole sidecar, starving the
    // re-encode, and injecting off-cadence frames that defeated the
    // streaming coalescer). At the drained edge the union is final for this
    // burst, so promotion happens at most ONCE per burst.
    const pipelineQuiet = !this.anyPipelineWork();
    for (const pool of this.pools.values()) {
      const lane = laneOf(lanes, laneCount, pool);
      if (lane) writeBackLane(lane);
      if (pool.autoRangeEncodeDirty) {
        pool.autoRangeEncodeDirty = false;
        reencodeEmptyEntries(pool);
        reencodeOccupancyEntries(pool);
      }
      // Occupancy range promotion, two drains (see the occObservedRange
      // field doc): the promote drain blanks every texel to the
      // conservative sentinel, promotes the encode range and bumps
      // poolsVersion (the decode uniforms ride it); the NEXT drain — after
      // the uniforms had a frame to land — writes the real texels.
      // RE-ENCODE FIRST: a pending re-encode always completes before a new
      // promotion can be considered, so promotion can never starve it.
      if (pool.occReencodePending) {
        pool.occReencodePending = false;
        reencodeOccupancyEntries(pool);
      } else if (
        pipelineQuiet &&
        pool.occObservedRange &&
        occPromotionWorthwhile(pool)
      ) {
        pool.occEncodeMin = pool.occObservedMin;
        pool.occEncodeMax = pool.occObservedMax;
        blankOccupancyEntries(pool);
        pool.occReencodePending = true;
        this.wakeDrain();
        // Once per burst, so the unthrottled bump is cheap. The re-encode
        // needs a NEXT drain, and drains only run inside frames — request
        // one explicitly (the demand loop may otherwise go idle right
        // here). The intervening render is sentinel-safe under any decode
        // uniforms.
        this.lastPoolsBumpAt = performance.now();
        this.deps.viewerStore.getState().bumpPoolsVersion();
        this.invalidate();
      }
      flushPageTable(this.renderer!, pool.pageTable);
    }
    // Only a pool that left the map mid-drain skips its write-back; its
    // partition dies with it (as the old per-drain Map's did).
    releaseDrainLanes(lanes, laneCount);

    // Submit this frame's compute-repack batch (before R3F renders, so the
    // page entries flushed above and the brick contents land in the same
    // frame). The min/max readback resolves asynchronously.
    const gpuFlush = this.gpuRepacker ? this.gpuRepacker.flush() : null;
    if (gpuFlush) {
      // The clock starts AFTER flush() returns, so what follows is post-submit
      // latency only — see the gpuRepackLatencyMsSum doc on why the sum is not
      // a cost. The max and the flush count are the numbers worth reading.
      const flushStartedAt = performance.now();
      this.stats.gpuRepackFlushes += 1;
      void gpuFlush.then((outcome) => {
        const latency = performance.now() - flushStartedAt;
        this.stats.gpuRepackLatencyMsSum += latency;
        if (latency > this.stats.gpuRepackLatencyMaxMs) {
          this.stats.gpuRepackLatencyMaxMs = latency;
        }
        this.applyGpuOutcome(outcome);
      });
    }

    if (progress.uploadedAny) this.stats.uploadMs += performance.now() - drainStartedAt;
    if (progress.bricks > 0) perfMonitor.markUpload(progress.bricks, progress.bytes); // no-op unless recording

    // "Streaming" (work anywhere in the pipeline) counts as ACTIVITY for the
    // quality governor: frames rendered while bricks load use the tier's
    // cheaper profile, and the edge back to false snaps quality up (P19).
    // The false edge is HYSTERETIC (applyStreamingFlag): the raw predicate
    // flaps between 200 ms replans during a zoom (drained → next plan's
    // fetches), and every flap re-rendered all volume layers and visibly
    // snapped the raymarch step scale mid-gesture.
    const streaming = this.anyPipelineWork();
    this.applyStreamingFlag(streaming);

    // Pipeline drained: stop the time-to-sharp clock started by reconcileAll,
    // then use the idle workers to warm the chunk cache for adjacent z slabs
    // and adjacent collapsed-dim (t/τ) selections.
    if (!streaming && this.streamStartedAt !== null) {
      const drainedAt = performance.now();
      this.stats.timeToSharpMs = drainedAt - this.streamStartedAt;
      this.streamStartedAt = null;
      // The picture is now final. Published unthrottled (unlike
      // residencyVersion): this is an EDGE, it fires once per stream, and a
      // consumer that misses it waits forever.
      this.deps.viewerStore.getState().setSharp(true);
      this.timeToSharpRing.push(this.stats.timeToSharpMs);
      if (this.timeToSharpRing.length > 5) this.timeToSharpRing.shift();
      if (this.flushedAt !== null) {
        this.stats.lastFlushToDrainedMs = drainedAt - this.flushedAt;
        this.flushedAt = null;
      }
      this.prefetcher.run();
    }

    if (progress.uploadedAny) {
      // Throttle version bumps while streaming — every bump re-renders the
      // React consumers (layer components, overlay, DebugPanel). The final
      // batch always bumps so consumers settle on the complete state.
      const now = performance.now();
      if (!streaming || now - this.lastResidencyBumpAt > profile.residencyBumpMs) {
        this.lastResidencyBumpAt = now;
        this.deps.viewerStore.getState().bumpResidencyVersion();
      }
      // Gated (gap 1a): while streaming + camera quiet, RENDERED frames land
      // at the bump cadence; the pump keeps this drain running off-frame.
      this.scheduleStreamingFrame(interacting, streaming);
    } else {
      // Budget exhausted with work left: keep the pipeline pumping.
      let queued = false;
      for (const pool of this.pools.values()) {
        if (pool.queue.length > 0) {
          queued = true;
          break;
        }
      }
      if (queued) this.scheduleStreamingFrame(interacting, streaming);
    }

    // Fully idle: nothing queued/in-flight/pending anywhere, nothing uploaded
    // this pass, and no GPU flush submitted (dispatches only happen inside
    // this method, so gpuFlush === null proves none are in flight; the
    // min/max readback continuation does its own page-table flush and bumps).
    // The streaming→idle edge above already ran in this same pass.
    //
    // MUST also respect PENDING ENCODE WORK: the occupancy-range promotion
    // is a TWO-drain protocol (blank this pass, re-encode next pass). The
    // promote branch above may have just set `occReencodePending` — clearing
    // the latch here would strand every occupancy/aggregate texel at the
    // "never skip" sentinel for the whole idle period (Phase A/D silently
    // dead exactly when settled). See hasPendingEncodeWork.
    if (
      !streaming &&
      !progress.uploadedAny &&
      gpuFlush === null &&
      ![...this.pools.values()].some(hasPendingEncodeWork)
    ) {
      this.drainNeeded = false;
    }
  }

  /** How long the pipeline must stay drained before the governor's streaming
   * flag clears — long enough to bridge the gap between 200 ms replans. */
  private static readonly STREAMING_CLEAR_MS = 300;

  /** Leading edge: work must persist this long before it counts as streaming.
   * Longer than a few frames (so a single brick landing at idle is swallowed),
   * far shorter than `ACTIVE_DPR_DELAY_MS` (250 ms), so real streaming still
   * drops quality on time. */
  private static readonly STREAMING_ASSERT_MS = 120;

  private clearStreamingAssertTimer(): void {
    if (this.streamingAssertTimer !== null) {
      clearTimeout(this.streamingAssertTimer);
      this.streamingAssertTimer = null;
    }
  }

  /**
   * Governor streaming flag, hysteretic on BOTH edges.
   *
   * False only after STREAMING_CLEAR_MS of continuous quiet. The demand
   * frameloop may render no further frame once the pipeline drains, so the
   * trailing clear is timer-driven and re-checks the pipeline when it fires.
   *
   * True only after work has PERSISTED for STREAMING_ASSERT_MS. The true edge
   * used to fire the instant `anyPipelineWork()` went true, which made every
   * consumer of "active" react to a single brick landing at idle:
   * `QualityAdapter` re-evaluates `cameraMoving || isStreaming()` per frame and
   * drops/restores DPR (a render-target realloc), and `decideSettleRefine`
   * slams the settle ladder back to stage 0 for a two-stage re-climb. So one
   * stray brick cost a canvas resolution change plus a raymarch-quality restart
   * — three unrelated-looking symptoms (sharpness pulse, graininess pulse,
   * block pop) from one event, on a completely stationary camera.
   *
   * Debouncing the true edge is safe because this flag is a QUALITY signal, not
   * a correctness one: a brick that actually changes the image still re-renders
   * through its `poolsVersion`/tracker bump and `invalidate()`. A burst that
   * drains inside the window never reaches the ladders; genuine streaming still
   * asserts well before `ACTIVE_DPR_DELAY_MS` (250 ms) would act on it.
   */
  private applyStreamingFlag(busy: boolean): void {
    const now = performance.now();
    if (busy) this.lastStreamingTrueAt = now;
    const action = decideStreamingFlag({
      busy,
      streaming: qualityGovernor.isStreaming(),
      now,
      busySinceAt: this.busySinceAt,
      lastStreamingTrueAt: this.lastStreamingTrueAt,
      assertMs: BrickResidencyManager.STREAMING_ASSERT_MS,
      clearMs: BrickResidencyManager.STREAMING_CLEAR_MS,
    });

    if (busy) {
      if (this.busySinceAt === null) this.busySinceAt = now;
      // A busy drain cancels any pending clear.
      if (this.streamingClearTimer !== null) {
        clearTimeout(this.streamingClearTimer);
        this.streamingClearTimer = null;
      }
    } else {
      // Quiet: whatever work there was never persisted long enough to count.
      this.busySinceAt = null;
      this.clearStreamingAssertTimer();
    }

    switch (action) {
      case "assert":
        this.clearStreamingAssertTimer();
        qualityGovernor.setStreaming(true);
        return;
      case "clear":
        qualityGovernor.setStreaming(false);
        return;
      case "arm-assert": {
        // Drains run per FRAME; under `frameloop="demand"` frames can stop
        // while work is outstanding, so the assert needs a timer of its own.
        if (this.streamingAssertTimer !== null) return;
        const busySince = this.busySinceAt ?? now;
        this.streamingAssertTimer = setTimeout(
          () => {
            this.streamingAssertTimer = null;
            if (this.disposed) return;
            if (this.anyPipelineWork()) qualityGovernor.setStreaming(true);
            else this.busySinceAt = null;
          },
          Math.max(0, BrickResidencyManager.STREAMING_ASSERT_MS - (now - busySince)),
        );
        return;
      }
      case "arm-clear": {
        if (this.streamingClearTimer !== null) return;
        this.streamingClearTimer = setTimeout(() => {
          this.streamingClearTimer = null;
          if (this.disposed) return;
          if (!this.anyPipelineWork()) {
            qualityGovernor.setStreaming(false);
            this.invalidate(); // render one settled-quality frame
          }
        }, BrickResidencyManager.STREAMING_CLEAR_MS);
        return;
      }
      case "hold":
        return;
    }
  }

  /**
   * Fold one brick's raw min/max into the layer's auto-contrast range
   * (`foldAutoRange`, rangeEncoding.ts) and schedule what a move implies: a
   * drain for the coalesced EMPTY re-encode, and the rate-limited
   * `poolsVersion` bump — with a trailing timer, so the LAST range move of a
   * burst always publishes (the drain's idle edge is not a safe trailing
   * site — applyGpuOutcome can fold ranges in after the pipeline already
   * went idle).
   */
  private accumulateAutoRange(pool: LayerBrickPool, brickMin: number, brickMax: number): void {
    const moved = foldAutoRange(pool, brickMin, brickMax);
    if (moved === "unchanged") return;
    if (moved === "moved-reencode") this.wakeDrain();
    this.schedulePoolsBump();
  }

  /**
   * Min/max-readback continuation for a GPU repack batch. The per-brick
   * bookkeeping (token validation, EMPTY demotion, unmap + requeue of failed
   * dispatches) is `applyGpuOutcomeToPools`; this adds the scheduling.
   */
  private applyGpuOutcome(outcome: GpuFlushOutcome<GpuBrickToken>): void {
    if (this.disposed) return;
    if (applyGpuOutcomeToPools(outcome, this.gpuOutcomeContext)) {
      // The page-table flush and the invalidate are the correctness half and
      // stay unconditional. The store bump is throttled exactly as the drain
      // path throttles it (see drainUploads) — this continuation runs once per
      // GPU flush, i.e. up to once per frame, and every bump re-renders the
      // residencyVersion consumers. The `!streaming` clause guarantees the
      // drained edge always lands, so consumers settle on the complete state.
      const now = performance.now();
      const streaming = this.anyPipelineWork();
      if (
        !streaming ||
        now - this.lastResidencyBumpAt > qualityGovernor.getProfile().residencyBumpMs
      ) {
        this.lastResidencyBumpAt = now;
        this.deps.viewerStore.getState().bumpResidencyVersion();
      }
      // Gated (gap 1a), same as the drain path — the drained edge
      // (!streaming) still invalidates unconditionally through the gate.
      this.scheduleStreamingFrame(this.deps.isInteracting?.() ?? false, streaming);
    }
  }

  private readonly gpuOutcomeContext: GpuOutcomeContext = {
    pools: this.pools,
    stats: this.stats,
    accumulateAutoRange: (pool, brickMin, brickMax) =>
      this.accumulateAutoRange(pool, brickMin, brickMax),
    requeueFetch: (pool, node) => {
      this.wakeDrain();
      pool.pendingFetch.push(node);
      this.startNextFetchesGlobal();
    },
  };

  /** Throttled `poolsVersion` bump + invalidate with a trailing timer, so
   * the LAST event of a burst always publishes. Shared by the auto-range
   * and occupancy-range paths. */
  private schedulePoolsBump(): void {
    const now = performance.now();
    if (now - this.lastPoolsBumpAt > AUTO_RANGE_BUMP_MS) {
      this.lastPoolsBumpAt = now;
      this.deps.viewerStore.getState().bumpPoolsVersion();
      this.invalidate();
    } else if (this.poolsBumpTimer === null) {
      this.poolsBumpTimer = setTimeout(
        () => {
          this.poolsBumpTimer = null;
          if (this.disposed) return;
          this.lastPoolsBumpAt = performance.now();
          this.deps.viewerStore.getState().bumpPoolsVersion();
          this.invalidate();
        },
        Math.max(0, AUTO_RANGE_BUMP_MS - (now - this.lastPoolsBumpAt)),
      );
    }
  }

  private flushPool(
    pool: LayerBrickPool,
    nextSliceSignature: string,
    layer: LayerState,
    levels: LevelSource[],
  ): void {
    // The signature changed because the SELECTION changed (slices or a dim
    // slider) — the collapsed indices must follow, or the refetch reproduces
    // the flushed data.
    resetPoolContents(
      pool,
      nextSliceSignature,
      computeFixedIndices(
        layer,
        pool.geometry,
        levels,
        this.deps.viewerStore.getState().dimSelections,
      ),
    );
    this.flushedAt = performance.now();
    // A flush changes what the volume LOOKS like (the previous slice's
    // bricks are gone) but moves none of the compositor's cache-key
    // counters — without this bump a t/z-slider change kept serving the
    // PREVIOUS timepoint from the cached composite until streaming
    // happened to emit (or forever, if the refetch fails).
    this.deps.viewerStore.getState().volumeInputs.bump("pool-flush");
    this.invalidate();
  }

  private disposePool(pool: LayerBrickPool): void {
    for (const controller of pool.inFlight.values()) controller.abort();
    pool.inFlight.clear();
    this.prefetcher.forget(pool.poolKey);
    disposeBrickAtlas(pool.atlas);
    disposePageTable(pool.pageTable);
    // Pool lifecycle event — layer components must drop their pool handle.
    this.deps.viewerStore.getState().bumpPoolsVersion();
  }

  dispose(): void {
    this.disposed = true;
    this.chunks.dispose();
    if (this.poolsBumpTimer !== null) {
      clearTimeout(this.poolsBumpTimer);
      this.poolsBumpTimer = null;
    }
    if (this.streamingClearTimer !== null) {
      clearTimeout(this.streamingClearTimer);
      this.streamingClearTimer = null;
    }
    if (this.drainPumpTimer !== null) {
      clearTimeout(this.drainPumpTimer);
      this.drainPumpTimer = null;
    }
    this.gpuRepacker?.dispose();
    this.gpuRepacker = null;
    for (const slot of this.rendererResources) {
      slot.instance?.dispose();
      slot.instance = null;
    }
    for (const pool of this.pools.values()) this.disposePool(pool);
    this.pools.clear();
    this.renderer = null;
    this.invalidateFn = null;
    // Don't leave the governor thinking a torn-down scene is still streaming,
    // and don't let a pending assert re-raise the flag after teardown.
    this.clearStreamingAssertTimer();
    this.busySinceAt = null;
    qualityGovernor.setStreaming(false);
  }
}
