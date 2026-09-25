/**
 * What a level-of-detail Parquet prefix needs of the thing that fetches its
 * bytes — and nothing more.
 *
 * Two calls, because the two access patterns are genuinely different: a whole
 * object for the manifest and the catalogs (small, read once at open), and a
 * byte RANGE for a Parquet footer or one row group (the streaming path, where
 * fetching a whole level part to read one cell would be the bug).
 *
 * Format-agnostic on purpose. fabriks (surfaces) and konnektion (graphs) are
 * different formats with different blob contracts, but they lay their prefixes
 * out identically — manifest at the root, two catalogs, one file per level part
 * — so they are one transport contract, not two.
 */

/** A whole object, by path relative to the prefix. */
export type ObjectReader = (path: string) => Promise<Uint8Array>;

/** A byte span, `end` EXCLUSIVE. Half-open throughout; the HTTP `Range` header's
 *  inclusive end is converted at the one place that writes it. */
export type RangeReader = (path: string, start: number, end: number) => Promise<Uint8Array>;

/**
 * Counters a transport keeps for the debug panel. **Mutated in place, never
 * replaced** — this object is read from the render plane, where allocating a
 * new stats object per fetch would be a store write per fetch (P17).
 */
export type ParquetTransportStats = {
  gets: number;
  rangeGets: number;
  bytesFetched: number;
  fetchMs: number;
  cacheHits: number;
  errors: number;
};

export type ParquetTransport = {
  get: ObjectReader;
  getRange: RangeReader;
  stats?: ParquetTransportStats;
};
