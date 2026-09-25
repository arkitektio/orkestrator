import { LruMap } from "@/lib/generic/lruMap";
import {
  readColumnDistinct,
  readColumnDomain,
  readColumnHistogram,
  readColumnSummary,
  type ColumnDistinct,
  type ColumnDomain,
  type ColumnSummary,
} from "@/lib/parquet/columnStats";
import type { ParquetQueryEngine, ParquetStoreRef } from "@/lib/parquet/parquetEngine";
import { ColumnControl, type ColumnRole } from "@/mikro/api/graphql";

import { controlForRole } from "../scene/platform/layerui/columnOptions";

/**
 * What the column popover says about a column's VALUES, next to what the
 * schema declares about it.
 *
 * The shape follows the role: a MEASURE (coordinate, attribute) has a range
 * and a distribution, a CATEGORICAL (id, label, …) has a set. Both carry the
 * one-scan summary (rows, nulls, cardinality), which is read alongside and
 * kept separate on failure: `count(DISTINCT)` over a struct column is the one
 * aggregate DuckDB can refuse, and a refused count must not blank a domain
 * that read fine.
 */
export type ColumnValueStats = {
  control: ColumnControl;
  /** Null when the summary read failed on its own. */
  summary: ColumnSummary | null;
  /** MEASURE only; null for a column with no numeric reading. */
  domain: ColumnDomain;
  /** MEASURE only, over `domain`; null whenever `domain` is. */
  histogram: number[] | null;
  /** CATEGORICAL only. */
  distinct: ColumnDistinct | null;
};

export type ColumnStatsColumn = { name: string; role: ColumnRole };

export const readColumnValueStats = async (
  engine: ParquetQueryEngine,
  store: ParquetStoreRef,
  column: ColumnStatsColumn,
): Promise<ColumnValueStats> => {
  const target = { table: { store }, column: { name: column.name } };
  const control = controlForRole(column.role);
  const summaryRead = readColumnSummary(engine, target).catch(() => null);

  if (control === ColumnControl.Measure) {
    // Domain first, then the histogram off that domain — the same sequencing
    // the layer editor uses, so bars and bounds agree on the axis.
    const domain = await readColumnDomain(engine, target);
    const histogram = domain ? await readColumnHistogram(engine, target, domain) : null;
    return { control, summary: await summaryRead, domain, histogram, distinct: null };
  }

  const distinct = await readColumnDistinct(engine, target);
  return { control, summary: await summaryRead, domain: null, histogram: null, distinct };
};

// Whole-table stats are a property of the column, not of the page the user
// is looking at, so they are read once per (store, column) and shared by
// every surface that opens the popover — the header and the rail. The engine
// itself caches nothing on this path (`readAcross` is uncached by design), so
// without this every reopen would be a fresh parquet scan.
//
// The PROMISE is cached, not the result, so two surfaces opening the same
// column at once share one read. A rejected read is evicted so the next open
// retries instead of showing a stale failure forever.
const cache = new LruMap<Promise<ColumnValueStats>>(128);

const keyOf = (storeId: string, columnName: string) => `${storeId}\u0001${columnName}`;

export const readColumnValueStatsCached = (
  engine: ParquetQueryEngine,
  store: ParquetStoreRef,
  column: ColumnStatsColumn,
): Promise<ColumnValueStats> => {
  const key = keyOf(store.id, column.name);
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = readColumnValueStats(engine, store, column);
  cache.set(key, pending);
  pending.catch(() => {
    if (cache.get(key) === pending) cache.take(key);
  });
  return pending;
};

export const clearColumnStatsCache = () => cache.clear();
