/**
 * Reference counts shared chunk fetches by the bricks that need them.
 *
 * Bricks fan out to zarr chunks and chunks are shared across bricks
 * (`fetchChunkShared` dedupes the decode), so a brick abort alone must never
 * cancel a chunk another live brick still awaits — that was the measured 13×
 * refetch-amplification failure. This registry answers the one question that
 * makes cancellation safe: "did the LAST referring brick just let go?" — at
 * which point a still-QUEUED decode task can be cancelled outright (a started
 * one is left to finish into the chunk cache).
 *
 * Pure bookkeeping, no timers, no async — exhaustively unit-testable.
 */
export class ChunkRefRegistry {
  private readonly refs = new Map<string, Set<string>>();

  /** Register `ownerKey` (a brick key) as needing `chunkKey`. Idempotent. */
  acquire(chunkKey: string, ownerKey: string): void {
    let owners = this.refs.get(chunkKey);
    if (!owners) {
      owners = new Set();
      this.refs.set(chunkKey, owners);
    }
    owners.add(ownerKey);
  }

  /**
   * Drop `ownerKey`'s claim on `chunkKey`. Returns true exactly when this
   * release removed the LAST owner — the caller's signal to cancel a dead
   * queued decode. Releasing an unknown pair is a no-op returning false.
   */
  release(chunkKey: string, ownerKey: string): boolean {
    const owners = this.refs.get(chunkKey);
    if (!owners || !owners.delete(ownerKey)) return false;
    if (owners.size > 0) return false;
    this.refs.delete(chunkKey);
    return true;
  }

  referrers(chunkKey: string): number {
    return this.refs.get(chunkKey)?.size ?? 0;
  }

  clear(): void {
    this.refs.clear();
  }
}
