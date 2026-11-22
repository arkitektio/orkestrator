import type { Chunk, DataType } from "zarrita";
import type { ChunkCache } from "../runner/types";

type Entry = { chunk: Chunk<DataType>; owner: object; bytes: number };

const byteLengthOf = (chunk: Chunk<DataType>): number => (chunk.data as { byteLength?: number }).byteLength ?? 0;

/**
 * One byte-bounded LRU of decoded chunks that several owners share — every
 * open scene, where each used to own a cache of the full size, so four warm
 * scene tabs could pin four times the budget.
 *
 * Each owner reads and writes through its own `view`: reads see every entry
 * (cache keys name their store object, so owners never collide), writes are
 * tagged with the owner. One budget for all, evicted least recently used: an
 * owner that stops reading (a hidden scene) is evicted first, with no
 * coordination. `release(owner)` drops what the owner wrote and refuses its
 * later writes (a decode still in flight when its scene closed).
 */
export class SharedChunkCache {
  private readonly entries = new Map<string, Entry>();
  private readonly ownerBytes = new Map<object, number>();
  private readonly released = new WeakSet<object>();
  private bytes = 0;

  constructor(private readonly maxBytes: number) {}

  /** The cache as `owner` uses it: the shape `getChunkWorker` takes as `cache`. */
  view(owner: object): ChunkCache {
    return {
      get: (key) => this.get(key),
      set: (key, value) => this.set(key, value, owner),
    };
  }

  get(key: string): Chunk<DataType> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    // Move-to-end recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.chunk;
  }

  set(key: string, chunk: Chunk<DataType>, owner: object): void {
    if (this.released.has(owner)) return;
    const existing = this.entries.get(key);
    if (existing) this.remove(key, existing);
    const entry = { chunk, owner, bytes: byteLengthOf(chunk) };
    this.entries.set(key, entry);
    this.bytes += entry.bytes;
    this.ownerBytes.set(owner, (this.ownerBytes.get(owner) ?? 0) + entry.bytes);

    // Evict least recently used, but never the entry just inserted.
    for (const [candidateKey, candidate] of this.entries) {
      if (this.bytes <= this.maxBytes || candidateKey === key) break;
      this.remove(candidateKey, candidate);
    }
  }

  /** Drop everything `owner` wrote; its later writes are ignored. */
  release(owner: object): void {
    this.released.add(owner);
    for (const [key, entry] of this.entries) {
      if (entry.owner === owner) this.remove(key, entry);
    }
    this.ownerBytes.delete(owner);
  }

  /** Bytes held for every owner together. */
  get sizeBytes(): number {
    return this.bytes;
  }

  /** Bytes `owner` wrote that are still held. */
  ownerSizeBytes(owner: object): number {
    return this.ownerBytes.get(owner) ?? 0;
  }

  private remove(key: string, entry: Entry): void {
    this.entries.delete(key);
    this.bytes -= entry.bytes;
    const left = (this.ownerBytes.get(entry.owner) ?? 0) - entry.bytes;
    if (left > 0) this.ownerBytes.set(entry.owner, left);
    else this.ownerBytes.delete(entry.owner);
  }
}
