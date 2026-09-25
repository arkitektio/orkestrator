import type { Chunk, DataType } from "zarrita";

/**
 * Byte-bounded LRU for decoded zarr chunks, passed as `opts.cache` to
 * `getChunkWorker`. The runner's default cache is COUNT-bounded (500), which
 * with plane-chunked datasets (33 MB decoded per chunk) can silently pin
 * many gigabytes of SharedArrayBuffers — this one evicts by actual bytes.
 */
export class ByteBudgetChunkCache {
  private readonly entries = new Map<string, Chunk<DataType>>();
  private bytes = 0;

  constructor(private readonly maxBytes: number) {}

  get(key: string): Chunk<DataType> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    // Move-to-end recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: Chunk<DataType>): void {
    const size = (value.data as { byteLength?: number }).byteLength ?? 0;
    const existing = this.entries.get(key);
    if (existing) {
      this.bytes -= (existing.data as { byteLength?: number }).byteLength ?? 0;
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    this.bytes += size;

    // Evict LRU entries, but never the one just inserted.
    for (const [candidateKey, candidate] of this.entries) {
      if (this.bytes <= this.maxBytes || candidateKey === key) break;
      this.entries.delete(candidateKey);
      this.bytes -= (candidate.data as { byteLength?: number }).byteLength ?? 0;
    }
  }

  get sizeBytes(): number {
    return this.bytes;
  }
}
