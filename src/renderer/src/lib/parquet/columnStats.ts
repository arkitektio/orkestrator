import type { ParquetStoreLike } from "./attributeTypes";
import type { AttributeLookupEngine } from "./lookupEngine";
import { escapeSqlIdentifier, escapeSqlLiteral } from "./sqlBind";

/**
 * What a colour-by / filter-by candidate's column actually CONTAINS: a numeric
 * range for a MEASURE, the distinct set for a CATEGORICAL.
 *
 * The server used to answer this (`colorByOptions(withValues: true)`) and
 * deliberately no longer does — an options walk is graph work, and putting a
 * capped scan of every candidate column behind it made the cheap question pay
 * for the expensive one. The values live in the table's parquet, the client
 * already holds a DuckDB and the grants to read it, so it reads them itself,
 * for the one column a user is configuring rather than for all of them.
 *
 * Read off the TERMINAL table alone, not through the option's `joinPath`. A
 * slider's bounds and a checkbox list are properties of the column, and the
 * join only decides which rows a rule is *applied* to — walking it here would
 * cost a join per keystroke to narrow a domain the rule does not narrow.
 */

/** The slice of a `ColumnOption` these reads need — kept structural so the
 * module does not depend on the generated fragment types. */
export type ColumnStatsTarget = {
  table: { store: ParquetStoreLike };
  column: { name: string };
};

export type ColumnDomain = { min: number; max: number } | null;

export type ColumnDistinct = {
  values: string[];
  /** The column has more distinct values than `limit`; `values` is a prefix. */
  truncated: boolean;
};

/** Above this a checkbox list stops being a control and becomes a wall. */
export const DISTINCT_LIMIT = 64;

const readParquet = (url: string) => `read_parquet(${escapeSqlLiteral(url)})`;

/**
 * The column as a NUMBER, for the arithmetic a bin index needs.
 *
 * A measure column is not always stored as one: a boolean flag is a perfectly
 * good 0/1 measure and reads back with a 0…1 domain, but `bool - 0` is not a
 * function DuckDB has, so binning it raised a binder error rather than drawing
 * two bars. `TRY_CAST` is the deliberate choice over `CAST` — a column that has
 * no numeric reading at all answers NULL per row instead of failing the whole
 * query, and those rows are then excluded by the same `IS NOT NULL` that
 * excludes genuine NULLs.
 */
const asNumber = (column: string) => `TRY_CAST(${column} AS DOUBLE)`;

/**
 * The numeric bounds of a MEASURE column, or null when the column is empty or
 * holds no numbers. NULLs are skipped by `min`/`max` themselves.
 */
export const readColumnDomain = async (
  engine: AttributeLookupEngine,
  target: ColumnStatsTarget,
): Promise<ColumnDomain> => {
  const column = escapeSqlIdentifier(target.column.name);
  const rows = await engine.readAcross([target.table.store], (urlOf) =>
    `SELECT min(${column}) AS lo, max(${column}) AS hi FROM ${readParquet(
      urlOf(target.table.store.id),
    )}`,
  );
  const row = rows[0];
  if (!row) return null;
  // `min`/`max` come back NULL for a column with no non-null rows, and
  // `Number(null)` is 0 — which would answer "the range is 0 … 0" for a column
  // that has no range at all, and seed a rule that hides everything.
  if (row.lo === null || row.lo === undefined || row.hi === null || row.hi === undefined) {
    return null;
  }
  const min = Number(row.lo);
  const max = Number(row.hi);
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
};

/**
 * The distinct values of a CATEGORICAL column, capped.
 *
 * One row over the cap is read on purpose: a list silently cut to exactly the
 * cap reads as complete, and a truncated set presented as the whole set is
 * worse than admitting there are more — a rule authored against it would
 * silently drop the values it never showed.
 */
export const readColumnDistinct = async (
  engine: AttributeLookupEngine,
  target: ColumnStatsTarget,
  limit: number = DISTINCT_LIMIT,
): Promise<ColumnDistinct> => {
  const column = escapeSqlIdentifier(target.column.name);
  const rows = await engine.readAcross([target.table.store], (urlOf) =>
    `SELECT DISTINCT ${column} AS value FROM ${readParquet(
      urlOf(target.table.store.id),
    )} WHERE ${column} IS NOT NULL ORDER BY 1 LIMIT ${limit + 1}`,
  );
  const values = rows
    .map((row) => row.value)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value));
  return { values: values.slice(0, limit), truncated: values.length > limit };
};

/** Bars a clim / bound slider draws behind itself; enough to see the shape,
 * few enough that each bar is still a visible strip in a card. */
export const HISTOGRAM_BINS = 32;

/**
 * The DISTRIBUTION of a MEASURE column over a known domain: `bins` equal-width
 * counts from `domain.min` to `domain.max`.
 *
 * Exists so a clim or bound slider is set against the data's shape rather than
 * blind between two endpoints — the domain says where the values END, the
 * histogram says where they LIVE, and a clim placed without that routinely
 * clips the bulk of the ramp into one bin's worth of colour.
 *
 * One aggregation pass in DuckDB, not a row fetch: the bin index is computed
 * in SQL and only `bins` rows come back. Values exactly at `domain.max` land
 * in the last bin (the `least`), and the `greatest` guards float noise below
 * the minimum. Callers pass the domain they already read — the same
 * `readColumnDomain` answer the slider is bounded by, so bars and thumbs
 * cannot disagree about where the axis starts.
 */
export const readColumnHistogram = async (
  engine: AttributeLookupEngine,
  target: ColumnStatsTarget,
  domain: { min: number; max: number },
  binCount: number = HISTOGRAM_BINS,
): Promise<number[]> => {
  const value = asNumber(escapeSqlIdentifier(target.column.name));
  const bins = new Array<number>(binCount).fill(0);
  const span = domain.max - domain.min;
  if (!(span > 0)) {
    // A constant column has no distribution; one bar mid-axis says so.
    const rows = await engine.readAcross([target.table.store], (urlOf) =>
      `SELECT count(*) AS n FROM ${readParquet(
        urlOf(target.table.store.id),
      )} WHERE ${value} IS NOT NULL`,
    );
    bins[Math.floor(binCount / 2)] = Number(rows[0]?.n ?? 0);
    return bins;
  }
  const width = span / binCount;
  const rows = await engine.readAcross([target.table.store], (urlOf) =>
    `SELECT CAST(least(greatest(floor((${value} - ${domain.min}) / ${width}), 0), ${
      binCount - 1
    }) AS INTEGER) AS bin, count(*) AS n FROM ${readParquet(
      urlOf(target.table.store.id),
    )} WHERE ${value} IS NOT NULL GROUP BY 1 ORDER BY 1`,
  );
  for (const row of rows) {
    // A NULL bin cannot happen while the WHERE excludes uncastable rows, but
    // `Number(null)` is 0 and would silently pile those rows onto the first
    // bar, so the guard tests the raw value rather than trusting the coercion.
    if (row.bin === null || row.bin === undefined) continue;
    const at = Number(row.bin);
    if (Number.isInteger(at) && at >= 0 && at < binCount) bins[at] += Number(row.n);
  }
  return bins;
};

/**
 * A rule that is legal the moment it is created.
 *
 * `createMeshLayer(filterBys:)` REFUSES an entry naming neither a bound nor a
 * value set — "matches every row, which is not a filter" — so a picker cannot
 * add an empty rule and let the user fill it in afterwards. It has to arrive
 * with real bounds, and the only place those exist is the column itself.
 *
 * The seed is deliberately the WIDEST legal rule — the full numeric range, or
 * every distinct value — so adding a filter changes nothing on screen and
 * narrowing it is the user's next move. A seed that already excluded rows
 * would make "add" mean "hide things", which is not what picking a column off
 * a list says it will do.
 *
 * Null when the column cannot answer: an empty table, a non-numeric measure, a
 * read that failed. The caller must NOT invent a bound in that case — the
 * server's refusal is correct and a made-up range would silently drop rows.
 */
export type FilterRuleSeed = {
  rule: { min: number; max: number } | { values: string[] };
  /**
   * The categorical set hit the cap, so the seed does NOT name every value —
   * it is a narrower rule than "everything" and will hide rows the moment it
   * is applied. The caller has to say so rather than pretend otherwise.
   */
  truncated: boolean;
};

export const readDefaultFilterRule = async (
  engine: AttributeLookupEngine,
  target: ColumnStatsTarget,
  control: "MEASURE" | "CATEGORICAL",
  limit: number = DISTINCT_LIMIT,
): Promise<FilterRuleSeed | null> => {
  if (control === "MEASURE") {
    const domain = await readColumnDomain(engine, target);
    return domain ? { rule: { min: domain.min, max: domain.max }, truncated: false } : null;
  }
  const distinct = await readColumnDistinct(engine, target, limit);
  if (distinct.values.length === 0) return null;
  return { rule: { values: distinct.values }, truncated: distinct.truncated };
};

/**
 * Turn a failed stats read into something a person can act on.
 *
 * These reads go through DuckDB's httpfs, so a failure arrives as a SQL error
 * carrying the whole statement and the `s3://` URL. Rendered verbatim in a
 * 10px caption that is a wall of SQL, and it buries the one fact that matters:
 * whether the data is missing or the query was wrong.
 *
 * The NOT-FOUND case is the common one and is not a bug in the query. A
 * `ParquetStore` row can exist with no object behind it — `sizeBytes` is
 * documented "Null while unfinished" — so a table whose upload never finished
 * still resolves, still issues a read grant, and still 404s at the object.
 * S3 also answers 404 rather than 403 for a caller without `ListBucket`, so a
 * grant that does not cover the key looks identical from here; the message
 * says both rather than guessing.
 *
 * The raw text is returned alongside so a caller can keep it reachable — a
 * tooltip, a console line — rather than throwing away the detail.
 */
export type ColumnStatsFailure = { summary: string; detail: string };

export const describeColumnStatsError = (
  error: unknown,
  store?: ParquetStoreLike,
): ColumnStatsFailure => {
  const detail = error instanceof Error ? error.message : String(error);
  // Deliberately NOT a bare /not found/: a binder error reads "Referenced
  // column \"x\" not found", which is a query bug and the opposite of this.
  const notFound = /\b404\b|no files found|NoSuchKey|NoSuchBucket/i.test(detail);
  if (!notFound) return { summary: "the values could not be read from this table", detail };

  // `sizeBytes` is measured when the upload FINISHES, so a null alongside a
  // missing object is the unfinished-upload case — the one a person can act
  // on, by finishing or re-running the upload. Null is also what stores
  // written before the server recorded it carry, which is why this only
  // sharpens the message and never asserts it.
  const unfinished = store !== undefined && (store.sizeBytes ?? null) === null;
  return {
    summary: unfinished
      ? "this table's upload never finished, so there is no data file to read yet"
      : "this table's data file is not in storage — it may have been removed, or this session's grant may not cover it",
    detail,
  };
};
