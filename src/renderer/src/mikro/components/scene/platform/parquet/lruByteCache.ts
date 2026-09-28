/**
 * Byte-bounded LRU with a protected-key set — the octree cells' analog of
 * `BrickPoolState` (Map insertion order as recency, protected keys never
 * evicted, eviction callback so owners release GPU resources). Kept generic
 * and three-free so it is trivially unit-testable.
 */
export class LruByteCache<T> {
  private entries = new Map<string, { value: T; bytes: number }>();
  private protectedKeys = new Set<string>();
  private totalBytes = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly onEvict: (key: string, value: T) => void,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Get and mark most-recently-used. */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /**
   * Insert (or replace) an entry, then evict least-recently-used unprotected
   * entries until within budget. The inserted key itself is never evicted by
   * its own insertion.
   */
  set(key: string, value: T, bytes: number): void {
    const existing = this.entries.get(key);
    if (existing) {
      this.totalBytes -= existing.bytes;
      this.entries.delete(key);
      if (existing.value !== value) this.onEvict(key, existing.value);
    }
    this.entries.set(key, { value, bytes });
    this.totalBytes += bytes;
    this.evictOver(key);
  }

  /** Replace the protected set (typically: the current plan's cell keys). */
  protect(keys: Iterable<string>): void {
    this.protectedKeys = new Set(keys);
  }

  /** Visit every entry without touching recency. */
  forEach(visit: (value: T, key: string) => void): void {
    for (const [key, entry] of this.entries) visit(entry.value, key);
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.totalBytes -= entry.bytes;
    this.onEvict(key, entry.value);
  }

  clear(): void {
    for (const [key, entry] of this.entries) this.onEvict(key, entry.value);
    this.entries.clear();
    this.protectedKeys.clear();
    this.totalBytes = 0;
  }

  private evictOver(justInserted: string): void {
    if (this.totalBytes <= this.maxBytes) return;
    for (const [key, entry] of this.entries) {
      if (this.totalBytes <= this.maxBytes) break;
      if (key === justInserted || this.protectedKeys.has(key)) continue;
      this.entries.delete(key);
      this.totalBytes -= entry.bytes;
      this.onEvict(key, entry.value);
    }
  }
}
