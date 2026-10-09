import type { BrickAtlas } from "../gpu/brickAtlas";
import type { PageTableTexture } from "../gpu/pageTableTexture";
import type { EmptyValueBits } from "../octree/brickEncoding";
import type { BrickPoolState } from "../octree/brickPoolState";
import type { BrickArray, RepackChunk } from "../octree/brickRepack";
import type { BrickSpec } from "../octree/brickSpec";
import type { FetchPhase } from "../octree/nodeAddress";
import type { NodeKeyMemo } from "../octree/nodeKeyMemo";
import type { PlannedNode } from "../octree/nodePlanning";
import type {
  LayerLevelGeometry,
  LevelSource,
  Vec3,
} from "../../../platform/coords/levelGeometry";
import type { LayerState } from "../../../platform/model/layerModel";

/**
 * The residency manager's data shapes, shared by `brickResidency.ts` and the
 * modules split out of it (pool lifecycle, upload drain, GPU outcome, probes,
 * range encoding). Types only — `brickResidency.ts` re-exports the public
 * ones (`LayerBrickPool`, `ResidentBrickInfo`, `BrickSystemStats`), so
 * importers keep their paths.
 */

export type SlabRanges = readonly (readonly [number, number])[];

/** A decoded chunk plus its shared-cache key (doubles as the GPU-buffer key). */
export type GpuQueuedChunk = RepackChunk & { cacheKey: string };

export type PendingBrick = {
  key: string;
  level: number;
  coords: Vec3;
  /** CPU path: the repacked brick ready for upload. Null on the GPU path. */
  data: BrickArray | null;
  uniformValue: number | null;
  /** Raw brick [min, max] from the repack scan (occupancy sidecar). Null on
   * the GPU path — its min/max arrives with the async readback. */
  range: [number, number] | null;
  /** Per-slab [min, max] (`RepackResult.slabRanges`), normalized to the
   * pool's slab count; null on the GPU path until the readback lands. */
  slabRanges: SlabRanges | null;
  bytes: number;
  /** GPU path: raw decoded chunks; the repack runs as a compute dispatch at
   * drain time, once a slot is acquired. */
  gpu: { chunks: GpuQueuedChunk[] } | null;
  /** Which voxel box this brick was fetched with (two-phase bricks): `core`
   * = payload only, border edge-replicated → the resident brick is
   * provisional and a `full` halo refine follows; `full` = payload + border. */
  phase: FetchPhase;
  /** Drains this PLANNED brick found every slot protected (defer-retry). */
  acquireRetries?: number;
};

/** Identifies a dispatched brick across the async min/max readback; every
 * field is re-validated against the CURRENT mapping when the readback lands.
 * The pool is held by IDENTITY, not by `poolKey`: `ensurePool` rekeys a
 * movable pool in place (a dataRange move on a cold load), and a key lookup
 * then dropped every readback still in flight — failed dispatches included,
 * which left RESIDENT page entries over slots nothing ever wrote.
 * `flushEpoch` catches the opposite case: a flushed pool reuses slot indices,
 * so a pre-flush token must not validate against a post-flush occupant. */
export type GpuBrickToken = {
  pool: LayerBrickPool;
  flushEpoch: number;
  key: string;
  slotIndex: number;
};

/** Per-layer derivation feeding `ensurePool` — side-effect free, so layers can
 * be grouped by `poolKey` before anything is allocated. */
export type PoolDerivation = {
  /** The layer this was derived from. Any member of the group works for the
   * pool-wide fields (they are equal by construction — that is what the key
   * asserts); it is kept for `computeFixedIndices` and warnings. */
  layer: LayerState;
  mode: "2D" | "3D";
  levels: readonly LevelSource[];
  geometry: LayerLevelGeometry;
  spec: BrickSpec;
  structureSignature: string;
  sliceSignature: string;
  dataRange: readonly [number, number];
  /** What a slot's contents mean; decides the EMPTY code width. */
  valueSemantics: "intensity" | "labelIds";
  poolKey: string;
};

export type LayerBrickPool = {
  /** Content address (see `buildPoolKey`) — the map key. NOT a layer id: every
   * layer whose data, slicing and value range match shares this one pool. */
  poolKey: string;
  /**
   * How wide an EMPTY (uniform) brick's value is encoded in its page entry —
   * 8 bits for intensities, 24 for label ids. Derived from the pool key's
   * `valueSemantics`, so every member agrees by construction, and carried here
   * because both the write path and the probe's EMPTY decode need it.
   */
  emptyBits: EmptyValueBits;
  /** Layer ids currently backed by this pool. Refcount: the pool is disposed
   * when the last member leaves. Never empty for a live pool. */
  members: Set<string>;
  mode: "2D" | "3D";
  sliceSignature: string;
  /** Structural identity: levels + spec + slabs + mode. Distinct from
   * `poolKey`, which additionally pins the slice and the value range — a pool
   * whose structure still matches can be FLUSHED in place (atlas reused)
   * instead of rebuilt. */
  structureSignature: string;
  geometry: LayerLevelGeometry;
  spec: BrickSpec;
  atlas: BrickAtlas;
  pageTable: PageTableTexture;
  pool: BrickPoolState;
  protectedKeys: Set<string>;
  /** Resident coarsest-level keys — maintained incrementally so reconcile can
   * pin them without walking (and string-parsing) the whole pool per replan. */
  coarsestResident: Set<string>;
  inFlight: Map<string, AbortController>;
  /** Plan nodes waiting for a free fetch slot (refreshed per reconcile), in
   * REVERSE dispatch order — startNextFetches pops from the tail (O(1); a
   * shift-consumed queue was O(n²) across a large plan). */
  pendingFetch: PlannedNode[];
  /** Resident bricks uploaded from a `core` fetch whose 1-voxel border is
   * still edge-replicated (two-phase bricks). Cleared by the halo refine,
   * eviction, or flush. */
  provisionalKeys: Set<string>;
  /** Halo refines waiting for dispatch (tail = next), served only when no
   * pool has planned core work and the camera rests — see dispatchHalos. */
  pendingHalo: PlannedNode[];
  /** Bounded per-key retry counts for failed fetches of still-planned bricks
   * (self-heal without waiting for the next replan). Cleared per reconcile. */
  fetchRetries: Map<string, number>;
  queue: PendingBrick[];
  /** Keys currently in `queue` (O(1) membership for reconcile). */
  queuedKeys: Set<string>;
  /** Uniform bricks: page-mapped EMPTY, no slot; value = the uniform fill. */
  emptyValues: Map<string, number>;
  /** Bricks the GPU repacker reported as `unsupported` — it can never produce
   * them, so they must take the CPU path on every retry. Without this the
   * requeue re-dispatched them to the GPU, they failed identically, and the
   * page entry unmapped/refilled forever with no camera motion (see the
   * `unsupported` bucket in `GpuFlushOutcome`). Bounded by brick count. */
  gpuIneligibleKeys: Set<string>;
  /** Raw `[min, max]` of every RESIDENT brick (from the repack min/max scan /
   * GPU readback) — backs the occupancy sidecar's re-encode when the pool
   * range moves (quantization is relative to the range, exactly like
   * `emptyValues`). Entries are dropped on evict; bounded by slot count. */
  brickRanges: Map<string, [number, number]>;
  /** Fixed chunk coords / in-chunk offsets for non-spatial dims, `[level][dim]`. */
  fixedChunkCoords: number[][];
  fixedOffsets: number[][];
  /** Layer data range (raw value space) — shader normalization + EMPTY encode. */
  minValue: number;
  maxValue: number;
  /** Weak-proxy-dtype layers with no server value histogram would normalize
   * against a dtype fallback that does not describe the data — floats saturate
   * anything valued >1 to white, signed integers put raw 0 at mid-gray (see
   * `dtypeRangeIsWeakProxy`). When true, `minValue`/`maxValue` are instead
   * derived from a running min/max over the per-brick ranges the repack
   * pipeline already computes (auto-contrast). */
  autoRange: boolean;
  /** A range move requires re-encoding every EMPTY page entry (they store the
   * value quantized against the pool range). Marked here and applied ONCE per
   * drain frame — early float streaming can move the range several times per
   * frame, and each immediate rewrite re-uploaded page-table regions. */
  autoRangeEncodeDirty: boolean;
  /** True once a non-degenerate brick has seeded the real auto-range, so the
   * first update replaces the provisional `[0,1]` seed instead of unioning. */
  autoRangeInitialized: boolean;
  /** Occupancy OBSERVED-range encoding (`orkestrator.occObservedRange`,
   * captured at pool creation): quantize the occupancy sidecar against the
   * running union of every landed brick range instead of the pool (dtype)
   * range — on dim integer data the dtype-range encoding collapses to a few
   * codes and MIP maximum-culling never fires. `occEncodeMin/Max` is the
   * range the sidecar texels are CURRENTLY encoded against (the shader's
   * `uOccDecodeMin/Range` must always equal it — the lockstep invariant);
   * `occObserved*` is the running union that PROMOTES into it via a
   * DRAINED-EDGE two-drain protocol (the drain flush loop promotes only
   * when the pipeline is quiet AND `occPromotionWorthwhile`: blank all
   * texels + promote + bump, then `occReencodePending` → re-encode next
   * drain) so there is never a frame where texels are encoded against a
   * range the shader uniforms don't hold — blanked texels are the "never
   * skip" sentinel under ANY uniforms, and promotion happens at most ONCE
   * per stream burst (per-brick promotion cascaded 10-40 sidecar rewrites
   * + off-cadence frames per cold load). Flag off: `occEncode*` mirrors
   * the pool range (bit-identical to the legacy single-range behavior). */
  occObservedRange: boolean;
  occObservedMin: number;
  occObservedMax: number;
  occObservedInitialized: boolean;
  occEncodeMin: number;
  occEncodeMax: number;
  occReencodePending: boolean;
  /** Bumped by `flushPool`; stamps GPU repack tokens (see `GpuBrickToken`). */
  flushEpoch: number;
  /** Hierarchical occupancy (R4, `orkestrator.occHierarchy`, captured at
   * pool creation). `measuredRanges` holds every brick's raw measured
   * [min,max] (uniform bricks as [v,v]) and — unlike `brickRanges` —
   * SURVIVES EVICTION: ranges are statements about the data, invalidated
   * only by a pool flush. `aggregateRanges` holds the written level-h
   * aggregates (key = nodeKey(h, cell)) so promotions can blank/re-encode
   * them without re-checking completeness. See occupancyAggregate.ts. */
  occHierarchy: boolean;
  measuredRanges: Map<string, readonly [number, number]>;
  aggregateRanges: Map<string, readonly [number, number]>;
  /** Per-slab occupancy (`orkestrator.occPerSlab`, `octree/occupancySlabs.ts`):
   * the sidecar plane count captured at pool creation (the page table's
   * textures are sized by it, so unlike the other flags it cannot be
   * re-captured on reuse), and the per-slab twins of `brickRanges` /
   * `measuredRanges` / `aggregateRanges` — populated only when `occSlabs > 1`
   * and cleared alongside their union maps. */
  occSlabs: number;
  brickSlabRanges: Map<string, SlabRanges>;
  measuredSlabRanges: Map<string, SlabRanges>;
  aggregateSlabRanges: Map<string, SlabRanges>;
  /** Min target level across the member plans, from the last reconcile. Bricks
   * FINER than this are unreachable by the shader (its residency walk starts at
   * the desired level and moves coarser), so they are trimmed from the pool and
   * refused entry by the stale drain. */
  minTargetLevel: number;
  /** Which repack path the LAST fetched brick took, with the reason when it
   * fell back to the CPU (debug report only): "gpu", "cpu:phasor",
   * "cpu:no-repacker", "cpu:pending"/"cpu:broken", "cpu:unsupported:<kind>". */
  lastRepackPath: string | null;
  /** Per-level `nodeKey` memo for the CPU probe walk — see nodeKeyMemo.ts.
   * Garbage avoidance only; it caches no residency and needs no invalidation. */
  nodeKeys: NodeKeyMemo;
};

export type ResidentBrickInfo = {
  level: number;
  coords: Vec3;
  empty: boolean;
};

export type BrickSystemStats = {
  /** Bricks whose fetch completed AND entered the upload queue (bricks
   * discarded by the staleness checkpoint count as `staleFetches` instead). */
  bricksFetched: number;
  /** Two-phase bricks: fetches that ran payload-only (`core`), and resident
   * provisional bricks whose halo refine has since landed. */
  coreBricks: number;
  haloRefines: number;
  chunkRequests: number;
  /** Worker fetch tasks actually enqueued for brick chunks. Below
   * `chunkRequests` when inner chunks of one shard coalesced into a single
   * ranged GET (`chunkRequests / rangeRequests` = chunks per request). */
  rangeRequests: number;
  /** Bytes of FIRST-SEEN chunks only — approximates unique decode volume
   * (cache hits and shared in-flight awaits are not re-counted). */
  bytesDecoded: number;
  fetchMs: number;
  repackMs: number;
  /** GPU-repacked bricks (compute dispatch instead of worker + upload). */
  gpuBricks: number;
  /** NOT A COST. Sum over flushes of submit→min/max-readback LATENCY. One flush
   * is submitted per drainUploads (i.e. per frame) and flushes OVERLAP, so this
   * double-counts wall time and is not additive with anything. It also excludes
   * every synchronous part of the submit path — the chunk writeBuffer, params
   * packing, encoder recording and queue.submit all run before the first await
   * inside flush(), so they land in `uploadMs`. Do NOT divide it by gpuBricks:
   * a batch of one brick bills a full submit→map round trip (~1.5 vsync) and
   * reads as "24 ms per brick" when the real main-thread cost is `uploadMs`.
   * For the honest per-brick cost use uploadMs; for pipeline health use
   * timeToSharpMs; for the worst single round trip use gpuRepackLatencyMaxMs. */
  gpuRepackLatencyMsSum: number;
  /** Longest single submit→readback round trip. A real regression moves THIS. */
  gpuRepackLatencyMaxMs: number;
  /** Batch sizes seen by the GPU repacker: total dispatched bricks / flushes.
   * A mean near 1 means the 32 s-style latency sums are pure pipeline latency
   * with no batching to amortize them. */
  gpuRepackFlushes: number;
  uploadMs: number;
  /** WALL-CLOCK ms from "plan enqueued work while idle" to "pipeline drained"
   * (queue+inFlight+pendingFetch empty) — the honest time-to-sharp number.
   * fetchMs/repackMs are SUMS across concurrent bricks and overstate wall
   * time; judge streaming changes against this, not those. */
  timeToSharpMs: number;
  /** WALL-CLOCK ms from the most recent slice-signature flush (t/τ slider
   * step) to the pipeline draining — the perceived cost of a dim step. The
   * adjacent-selection prefetch exists to shrink this on ±1 scrubs. */
  lastFlushToDrainedMs: number;
  bricksUploaded: number;
  bytesUploaded: number;
  emptyBricks: number;
  evictions: number;
  /** Queued out-of-plan bricks dropped: no free slot at drain time, or
   * stale-queue cap overflow. The repack was paid for; nothing landed. */
  planDrops: number;
  /** Planned bricks that found every slot protected at drain time. */
  acquireFailures: number;
  /** Residents released because they were finer than every plan's target level
   * — slots the shader could never read, reclaimed as cache headroom. */
  trimmed: number;
  /** Bricks whose fetch completed after the plan moved on: repack and upload
   * skipped, decoded chunks retained in the cache (flip-back stays cheap). */
  staleFetches: number;
  /** Out-of-plan bricks uploaded into FREE slots on leftover budget —
   * fallback data, never under the first-brick free pass. */
  staleUploads: number;
  /** Zero-referrer chunk fetches aborted after their LAST brick let go:
   * still-queued decode tasks are cancelled outright (the win); already
   * started ones finish into the chunk cache regardless (aborting shared
   * in-progress decodes was the 13× amplification bug — never do that). */
  cancelledDecodes: number;
  fetchErrors: number;
  /** Streaming wakeups whose render was coalesced by the cadence gate — each
   * one is a whole-scene re-raymarch that no longer happened (gap 1a). */
  streamFramesCoalesced: number;
  /** Page-table flushes that uploaded something, and their bytes (page box +
   * occupancy/aggregate planes). Only in-frame drains flush; a high byte
   * count per flush means bricks land scattered over large levels. */
  pageFlushes: number;
  pageFlushBytes: number;
  /** Hierarchical-occupancy aggregate texels written (R4) — a write happens
   * when a parent cell's LAST child range lands (or on re-encode). */
  aggregateWrites: number;
};
