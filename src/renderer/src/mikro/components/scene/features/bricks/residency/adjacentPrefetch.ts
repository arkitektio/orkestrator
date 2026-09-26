import type { Vec3 } from "../../../platform/coords/levelGeometry";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import { decodedBytesPerVoxel } from "../octree/atlasFormat";
import {
  adjacentSelectionChunk,
  adjacentSlabBrickZ,
  type LayerNodePlan,
} from "../octree/nodePlanning";
import type { BrickSlice } from "../store/brickSlice";
import { enumerateBrickChunkCoords } from "./brickChunks";
import type { ChunkService } from "./chunkService";
import type { LayerBrickPool } from "./residencyTypes";

/**
 * The residency manager's idle-edge prefetch, split out of it: warms the
 * decoded-chunk cache for the neighbours of what is on screen (z±1 slabs in
 * 2D, ±1 along every collapsed dim). Owns only its per-pool "already warmed"
 * markers; reads the manager's pool map and fetches through its chunk
 * service, at priority −1 (below every visible decode).
 */
export class AdjacentPrefetcher {
  constructor(
    private readonly pools: ReadonlyMap<string, LayerBrickPool>,
    private readonly chunks: ChunkService,
    private readonly getState: () => ViewerState & BrickSlice,
  ) {}

  /** One prefetch marker per POOL (key): `sliceSignature|slabZ` last prefetched. */
  private readonly slabMarker = new Map<string, string>();
  /** One marker per POOL: the sliceSignature whose adjacent collapsed-dim
   * selections were last prefetched. A dim step changes the signature (that is
   * what flushes the pool), so a stale marker means "new selection → warm its
   * neighbors once". */
  private readonly dimMarker = new Map<string, string>();

  /**
   * Adjacent-data prefetch, run once per streaming→idle edge — decoded-chunk-
   * cache warmth ONLY (no atlas slots, no page-table writes, no residency
   * interaction, P7 intact). Both passes draw on ONE shared chunk/byte budget
   * so plane-chunked datasets can't evict the CURRENT working set out of the
   * byte-budgeted chunk cache; within the worker pool their tasks sort BELOW
   * everything visible (priority −1 vs generation-scaled priorities ≥ 1), so
   * a new plan mid-prefetch jumps the queue naturally.
   */
  run(): void {
    /** Remaining allowance, shared across both passes (decremented in place). */
    const budget = { chunks: 32, bytes: 64 * 1024 * 1024 };
    this.prefetchAdjacentSlabs(budget);
    this.prefetchAdjacentSelections(budget);
  }

  /**
   * z±1 adjacent-slab prefetch (2D mode): a later scrub to the neighbor slab
   * costs repack+upload instead of network+decode. (3D z needs no prefetch —
   * z is a brick axis there; the page table holds every slab.)
   */
  private prefetchAdjacentSlabs(budget: { chunks: number; bytes: number }): void {
    const state = this.getState();

    for (const pool of this.pools.values()) {
      if (pool.mode !== "2D" || pool.geometry.axes.zPos === -1) continue;
      // Any member's plan will do: members share a slice signature and mode, so
      // they agree on slabZ (it derives from the scene-wide currentZ). They can
      // differ in view range, which only affects WHICH nodes are planned — and
      // the prefetch reads nodes at targetLevel purely to warm the chunk cache.
      let plan: LayerNodePlan | undefined;
      for (const layerId of pool.members) {
        const candidate = state.nodePlans[layerId];
        if (candidate) {
          plan = candidate;
          break;
        }
      }
      if (!plan || plan.mode !== "2D" || plan.slabZ === null || plan.slabZ === undefined) {
        continue;
      }
      const marker = `${pool.sliceSignature}|${plan.slabZ}`;
      if (this.slabMarker.get(pool.poolKey) === marker) continue;
      this.slabMarker.set(pool.poolKey, marker);

      const baseLevel = pool.geometry.levels[0];
      const issued = new Set<string>();

      for (const node of plan.nodes) {
        if (node.level !== plan.targetLevel) continue;
        const level = pool.geometry.levels[node.level];
        // Decoded footprint per the worker's representation: uint8 1 B/voxel,
        // uint16 2 B under raw16, everything else widened to f32.
        const chunkBytes =
          level.chunks.reduce((total, extent) => total * Math.max(1, extent), 1) *
          decodedBytesPerVoxel(level.dtype);
        let arr: ReturnType<typeof state.getArrayForStoreId>;
        try {
          arr = state.getArrayForStoreId(level.storeId);
        } catch {
          continue;
        }

        for (const dz of [1, -1]) {
          const brickZ = adjacentSlabBrickZ(
            plan.slabZ,
            dz,
            baseLevel.scale[2],
            level.scale[2],
            level.spatialShape[2],
            pool.spec.payload[2],
            baseLevel.spatialShape[2],
          );
          // Same brick as the current slab = already resident; skip.
          if (brickZ === null || brickZ === node.coords[2]) continue;

          const coords: Vec3 = [node.coords[0], node.coords[1], brickZ];
          for (const { chunkCoords } of enumerateBrickChunkCoords(pool, node.level, coords)) {
            const key = `${level.storeId}:${chunkCoords.join(",")}`;
            if (issued.has(key)) continue;
            if (budget.chunks <= 0 || budget.bytes < chunkBytes) {
              return;
            }
            issued.add(key);
            budget.chunks -= 1;
            budget.bytes -= chunkBytes;
            // Fire-and-forget: results land in the chunk cache; failures
            // (abort on dispose, transient network) are non-events here.
            void this.chunks
              .fetchChunkShared(arr, level.storeId, chunkCoords, -1)
              .catch(() => {});
          }
        }
      }
    }
  }

  /**
   * Collapsed-dim (t/τ/…) ±1 prefetch: warm the decoded-chunk cache with the
   * chunks the CURRENT plan's target-level bricks would need at the adjacent
   * selection index, so a dim-slider step (which flushes the pool wholesale)
   * costs repack+upload instead of network+decode. Runs in BOTH 2D and 3D —
   * unlike z, a collapsed dim always refetches on change.
   *
   * Key parity is load-bearing: after a step, `computeFixedIndices` derives
   * `fixedChunkCoords[d]` from LEVEL-0 chunk extents and
   * `enumerateBrickChunkCoords` applies that same value at every level — so
   * the neighbor's chunk coordinate here must come from level-0 chunking too,
   * or the warmed keys are never the keys the real fetch asks for.
   */
  private prefetchAdjacentSelections(budget: { chunks: number; bytes: number }): void {
    const state = this.getState();

    for (const pool of this.pools.values()) {
      const { xPos, yPos, zPos, intensityPos, phasorPos } = pool.geometry.axes;
      const level0 = pool.geometry.levels[0];
      // Collapsed dims with anywhere to step: same predicate as
      // computeFixedIndices, minus extent-1 dims (no neighbor to warm).
      const collapsedDims: number[] = [];
      pool.geometry.dims.forEach((_, d) => {
        if (d === xPos || d === yPos || d === zPos || d === intensityPos) return;
        if (d === phasorPos && pool.geometry.phasorBins > 0) return;
        if ((level0.shape[d] ?? 1) <= 1) return;
        collapsedDims.push(d);
      });
      if (collapsedDims.length === 0) continue;
      if (this.dimMarker.get(pool.poolKey) === pool.sliceSignature) continue;

      // Any member's plan will do — same reasoning as the slab prefetch.
      let plan: LayerNodePlan | undefined;
      for (const layerId of pool.members) {
        const candidate = state.nodePlans[layerId];
        if (candidate) {
          plan = candidate;
          break;
        }
      }
      // No plan yet: leave the marker unset so a later idle edge (once a plan
      // exists) still warms this signature's neighbors.
      if (!plan) continue;
      this.dimMarker.set(pool.poolKey, pool.sliceSignature);

      const issued = new Set<string>();

      for (const node of plan.nodes) {
        if (node.level !== plan.targetLevel) continue;
        const level = pool.geometry.levels[node.level];
        // Decoded footprint per the worker's representation: uint8 1 B/voxel,
        // uint16 2 B under raw16, everything else widened to f32.
        const chunkBytes =
          level.chunks.reduce((total, extent) => total * Math.max(1, extent), 1) *
          decodedBytesPerVoxel(level.dtype);
        let arr: ReturnType<typeof state.getArrayForStoreId>;
        try {
          arr = state.getArrayForStoreId(level.storeId);
        } catch {
          continue;
        }

        for (const d of collapsedDims) {
          for (const delta of [1, -1]) {
            const neighborChunk = adjacentSelectionChunk(
              pool.fixedChunkCoords[d],
              pool.fixedOffsets[d],
              Math.max(1, level0.chunks[d] ?? 1),
              Math.max(1, level0.shape[d] ?? 1),
              delta,
            );
            if (neighborChunk === null) continue;

            for (const spec of enumerateBrickChunkCoords(pool, node.level, node.coords)) {
              const chunkCoords = [...spec.chunkCoords];
              chunkCoords[d] = neighborChunk;
              const key = `${level.storeId}:${chunkCoords.join(",")}`;
              if (issued.has(key)) continue;
              if (budget.chunks <= 0 || budget.bytes < chunkBytes) {
                return;
              }
              issued.add(key);
              budget.chunks -= 1;
              budget.bytes -= chunkBytes;
              // Fire-and-forget, exactly like the slab prefetch.
              void this.chunks
                .fetchChunkShared(arr, level.storeId, chunkCoords, -1)
                .catch(() => {});
            }
          }
        }
      }
    }
  }

  /** A pool moved to a new key: its slab marker must not suppress the next
   * warm-up (the dim marker is keyed by slice signature and self-corrects). */
  forgetSlab(poolKey: string): void {
    this.slabMarker.delete(poolKey);
  }

  /** A pool was disposed. */
  forget(poolKey: string): void {
    this.slabMarker.delete(poolKey);
    this.dimMarker.delete(poolKey);
  }
}
