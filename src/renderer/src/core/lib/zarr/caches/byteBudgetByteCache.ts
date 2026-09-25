/**
 * Byte-bounded LRU for raw fetched bytes (metadata documents and any chunk
 * reads routed through `store.get` rather than the worker path). Same policy
 * as `ByteBudgetChunkCache`: caches over variable-size items must be bounded
 * by bytes, not entry count — a count bound is unbounded in memory.
 */
export class ByteBudgetByteCache {
  private readonly entries = new Map<string, ArrayBuffer>();
  private bytes = 0;

  constructor(private readonly maxBytes: number) {}

  get(key: string): ArrayBuffer | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    // Move-to-end recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: ArrayBuffer): void {
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
