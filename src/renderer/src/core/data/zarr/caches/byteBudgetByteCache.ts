import { IdleRelease, ZARR_IDLE_RELEASE_MS } from "./idleRelease";

/**
 * Byte-bounded LRU for raw fetched bytes (metadata documents and any chunk
 * reads routed through `store.get` rather than the worker path). Same policy
 * as `ByteBudgetChunkCache`: caches over variable-size items must be bounded
 * by bytes, not entry count — a count bound is unbounded in memory.
 */
export class ByteBudgetByteCache {
  private readonly entries = new Map<string, ArrayBuffer>();
  private bytes = 0;

  private readonly idle: IdleRelease | undefined;

  /**
   * `idleClearMs`: empty the cache once nothing has read or written it for
   * that long (`null` = never). These caches are module-level, so without it
   * they hold their full budget for the rest of the session.
   */
  constructor(
    private readonly maxBytes: number,
    idleClearMs: number | null = ZARR_IDLE_RELEASE_MS,
  ) {
    this.idle = idleClearMs === null ? undefined : new IdleRelease(() => this.clear(), idleClearMs);
  }

  get(key: string): ArrayBuffer | undefined {
    this.idle?.touch();
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    // Move-to-end recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: ArrayBuffer): void {
    this.idle?.touch();
    const existing = this.entries.get(key);
    if (existing) {
      this.bytes -= existing.byteLength;
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    this.bytes += value.byteLength;

    // Evict LRU entries, but never the one just inserted.
    for (const [candidateKey, candidate] of this.entries) {
      if (this.bytes <= this.maxBytes || candidateKey === key) break;
      this.entries.delete(candidateKey);
      this.bytes -= candidate.byteLength;
    }
  }

  clear(): void {
    this.entries.clear();
    this.bytes = 0;
  }

  get sizeBytes(): number {
    return this.bytes;
  }
}
