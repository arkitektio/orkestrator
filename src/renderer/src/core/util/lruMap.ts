/** Bounded string-keyed map with LRU recency: get() touches, set() evicts. */
export class LruMap<V> {
  private readonly map = new Map<string, V>();

  constructor(
    private readonly capacity: number,
    private readonly onEvict?: (value: V) => void,
  ) {}

  get size(): number {
    return this.map.size;
  }

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.take(oldest);
    }
  }

  /** Remove one entry, running the eviction cleanup. */
  take(key: string): void {
    const value = this.map.get(key);
    if (value === undefined) return;
    this.map.delete(key);
    this.onEvict?.(value);
  }

  /** Empty the map WITHOUT eviction cleanup; returns the values held. */
  drain(): V[] {
    const values = [...this.map.values()];
    this.map.clear();
    return values;
  }

  /** Empty the map, running the eviction cleanup on every entry. */
  clear(): void {
    for (const value of this.drain()) this.onEvict?.(value);
  }
}
