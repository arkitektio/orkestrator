/**
 * Whole-column reads, kept columnar.
 *
 * Everything else in `lib/attributes` reads a handful of rows for a hover or a
 * rule editor, where a JS object per row is the right shape. A point layer is
 * the other case: it wants every row of two or three coordinate columns, and
 * the row shape is then the dominant cost rather than a convenience.
 *
 * The measured difference, for 5.5 M rows: the row path allocates about seven
 * objects per row per column — an Arrow proxy, a `toJSON` object, an
 * `Object.entries` array and its pairs, a mapped array, a rebuilt object — and
 * materialises the whole proxy array before mapping it, so the Arrow table, the
 * proxies and the records are all live at peak. That is ~77 M allocations and
 * gigabytes of transient garbage for two columns. This path is one typed array
 * per column, a view over Arrow's own buffer.
 *
 * It is also ONE scan. `readColumnByObjectId` is single-column by signature, so
 * reading x and y through it is two full passes over the parquet; here they are
 * two projections of one.
 */
import { escapeSqlIdentifier, escapeSqlLiteral } from "./sqlBind";
import type { ParquetStoreLike } from "./attributeTypes";
import type { AttributeLookupEngine } from "./lookupEngine";

/**
 * A column read columnwise: the ids, and the values parallel to them.
 *
 * `numeric` and `text` are the two shapes a column arrives in — a typed array
 * view over Arrow's buffer for a measure, a plain array of strings for a
 * category — and exactly one of them is set. Neither is a `Map`: this exists
 * precisely so a whole column does not have to become one.
 */
export type ColumnValues = {
  /** Object ids, parallel to the values. */
  ids: ArrayLike<number>;
  numeric: ArrayLike<number> | null;
  text: ArrayLike<string> | null;
  count: number;
};

/** The value at a row, whichever shape the column came back in. */
export const columnValueAt = (values: ColumnValues, index: number): unknown =>
  values.numeric ? values.numeric[index] : values.text ? values.text[index] : undefined;

/**
 * A column as numbers, or null when it did not come back as one.
 *
 * A numeric column is a typed array VIEW over the Arrow buffer; a Utf8 column
 * is a plain `Array` of strings. `ArrayBuffer.isView` separates them at runtime
 * rather than by a cast, so a column that is not what the caller assumed
 * becomes the refusal it already has a branch for instead of NaNs downstream.
 */
const asNumeric = (column: ArrayLike<number> | ArrayLike<string>): ArrayLike<number> | null =>
  ArrayBuffer.isView(column as unknown) ? (column as ArrayLike<number>) : null;

export type PositionColumns = {
  /** The column holding each row's object id — the table's INDEX coordinate. */
  key: string;
  x: string;
  y: string;
  /** Optional third dimension; a 2D table simply omits it. */
  z?: string | null;
  /**
   * The time column. Optional, and read in the SAME scan as the coordinates —
   * a second scan could only be aligned to this one by trusting two `ORDER BY`s
   * to have matched, the coincidence `readColumnValues` says a caller cannot
   * check cheaply.
   */
  t?: string | null;
};

export type PointPositions = {
  /** Object ids, parallel to the coordinate arrays. */
  ids: ArrayLike<number>;
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  z: ArrayLike<number> | null;
  /** Raw time per row, parallel to the coordinates. Null with no t column. */
  t: ArrayLike<number> | null;
  count: number;
};

/**
 * Every row's id and coordinates, as typed arrays.
 *
 * Returns null when the result cannot answer columnwise — a caller that gets
 * null should refuse rather than fall back to the row path, whose cost is the
 * whole reason this exists.
 */
export const readPointPositions = async (
  engine: AttributeLookupEngine,
  store: ParquetStoreLike,
  columns: PositionColumns,
): Promise<PointPositions | null> => {
  const wanted = [
    "object_id",
    "px",
    "py",
    ...(columns.z ? ["pz"] : []),
    ...(columns.t ? ["pt"] : []),
  ];
  const projection = [
    `${escapeSqlIdentifier(columns.key)} AS object_id`,
    `${escapeSqlIdentifier(columns.x)} AS px`,
    `${escapeSqlIdentifier(columns.y)} AS py`,
    ...(columns.z ? [`${escapeSqlIdentifier(columns.z)} AS pz`] : []),
    ...(columns.t ? [`${escapeSqlIdentifier(columns.t)} AS pt`] : []),
  ].join(", ");

  const read = await engine.readColumnsTyped(
    [store],
    (urlOf) => `SELECT ${projection} FROM read_parquet(${escapeSqlLiteral(urlOf(store.id))})`,
    wanted,
  );
  if (!read) return null;

  const ids = asNumeric(read.object_id);
  const x = asNumeric(read.px);
  const y = asNumeric(read.py);
  const z = columns.z ? asNumeric(read.pz) : null;
  const t = columns.t ? asNumeric(read.pt) : null;
  // Coordinates that did not come back as numbers are not coordinates. Null,
  // for the same reason a result that cannot answer columnwise is null: the
  // caller refuses rather than falling back to the path this exists to avoid.
  if (!ids || !x || !y || (columns.z && !z)) return null;

  // A non-numeric TIME column is not fatal the way a coordinate is: the layer
  // draws untimed rather than not at all.
  return { ids, x, y, z, t, count: ids.length };
};

/** Which columns a track layer's trajectories are read from. */
export type TrackColumns = {
  /** The TRACK_ID column: rows sharing a value are one trajectory. */
  trackId: string;
  x: string;
  y: string;
  /** Optional third dimension; a 2D table simply omits it. */
  z?: string | null;
  /**
   * The time column. Optional, but a track without one has no ORDER within a
   * trajectory beyond the file's own, and no tail to fade — the renderer draws
   * it whole.
   */
  t?: string | null;
  /**
   * A measure column to colour by, read in the SAME scan as the coordinates.
   *
   * Not a separate read, deliberately. A point layer can align a colouring to
   * its positions by object id; a track table has no id column, so two scans
   * could only be lined up by trusting two `ORDER BY`s to have matched — the
   * kind of coincidence `readColumnValues` says a painter cannot check
   * cheaply. One projection makes the alignment structural.
   */
  value?: string | null;
};

/** One trajectory's slice of the shared coordinate arrays. */
export type TrackRun = {
  /** The trajectory's id, as it appeared in the TRACK_ID column. */
  id: number | string;
  /** First row of this run in the coordinate arrays. */
  start: number;
  /** How many rows it spans. Always >= 1; a run of 1 draws no segment. */
  length: number;
};

export type TrackPositions = {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  z: ArrayLike<number> | null;
  /** Time per row, parallel to the coordinates. Null when there is no t column. */
  t: ArrayLike<number> | null;
  /** The colour measure per row, parallel to the coordinates. Null when unset. */
  value: ArrayLike<number> | null;
  /** Total rows across every trajectory. */
  count: number;
  /** The trajectories, in the order the scan returned them. */
  runs: TrackRun[];
  /** Drawable segments: `count - runs.length`. What the line buffer is sized by. */
  segmentCount: number;
};

/**
 * Every trajectory's coordinates, grouped into runs.
 *
 * **`ORDER BY` is the whole difference from `readPointPositions`.** That one
 * has none, deliberately: a point cloud does not care what order its rows
 * arrive in. A polyline is nothing BUT the order — an unsorted scan draws a
 * scribble through the same set of points, and it is not a failure any later
 * stage can detect. Ordering by `(track_id, t)` is what makes consecutive rows
 * consecutive in time, and what makes a run a contiguous slice rather than a
 * gather.
 *
 * Runs are found by scanning for boundaries in the already-sorted track column,
 * NOT by a `Map` from id to row. `readPointPositions`' `slots.set(id, index)`
 * keeps the LAST row for an id, which is exactly right when one row is one
 * object and exactly wrong here, where many rows are one trajectory.
 *
 * The track id may be a string (a name) or a number; only equality of adjacent
 * values is used, so both work without a branch.
 *
 * Null when the result cannot answer columnwise, or when a coordinate column is
 * not numeric — the caller refuses rather than falling back to the row path.
 */
export const readTrackPositions = async (
  engine: AttributeLookupEngine,
  store: ParquetStoreLike,
  columns: TrackColumns,
): Promise<TrackPositions | null> => {
  const wanted = [
    "track_id",
    "px",
    "py",
    ...(columns.z ? ["pz"] : []),
    ...(columns.t ? ["pt"] : []),
    ...(columns.value ? ["pv"] : []),
  ];
  const projection = [
    `${escapeSqlIdentifier(columns.trackId)} AS track_id`,
    `${escapeSqlIdentifier(columns.x)} AS px`,
    `${escapeSqlIdentifier(columns.y)} AS py`,
    ...(columns.z ? [`${escapeSqlIdentifier(columns.z)} AS pz`] : []),
    ...(columns.t ? [`${escapeSqlIdentifier(columns.t)} AS pt`] : []),
    ...(columns.value ? [`${escapeSqlIdentifier(columns.value)} AS pv`] : []),
  ].join(", ");
  // Ordering by t as well as by track is what puts a trajectory's rows in
  // time order; without it the run is a set, not a path.
  const ordering = columns.t ? "ORDER BY track_id, pt" : "ORDER BY track_id";

  const read = await engine.readColumnsTyped(
    [store],
    (urlOf) =>
      `SELECT ${projection} FROM read_parquet(${escapeSqlLiteral(urlOf(store.id))}) ${ordering}`,
    wanted,
  );
  if (!read) return null;

  const x = asNumeric(read.px);
  const y = asNumeric(read.py);
  const z = columns.z ? asNumeric(read.pz) : null;
  const t = columns.t ? asNumeric(read.pt) : null;
  // A non-numeric colour column is a category, not a ramp. Null rather than a
  // refusal: the trajectories still draw, in the flat colour.
  const value = columns.value ? asNumeric(read.pv) : null;
  if (!x || !y || (columns.z && !z) || (columns.t && !t)) return null;

  // The track column is NOT required to be numeric — a track name is a
  // perfectly good identity — so it is read as-is and only compared.
  const trackColumn = read.track_id as ArrayLike<number | string> | undefined;
  if (!trackColumn) return null;

  const count = x.length;
  const runs: TrackRun[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = trackColumn[index];
    const open = runs[runs.length - 1];
    if (open && open.id === id) open.length += 1;
    else runs.push({ id, start: index, length: 1 });
  }

  return { x, y, z, t, value, count, runs, segmentCount: Math.max(0, count - runs.length) };
};

/**
 * One column, as ids and values side by side — the colour table's read.
 *
 * The columnar twin of `readColumnByObjectId`, which builds a
 * `Map<number, unknown>` off the ROW path. Measured over 5.5 M rows that map
 * costs about 1.1 s to build and holds ~320 MB, before anything is painted; the
 * same read here is two typed arrays and no per-row object at all.
 *
 * `ORDER BY` is what makes several columns of one table comparable: two reads
 * of the same store and key column come back in the same row order, so a
 * colouring and a rule over that table line up by INDEX and neither needs an id
 * lookup. Without it the order is DuckDB's business and the alignment would be
 * a coincidence the painter could not check cheaply.
 *
 * Null when the result cannot answer columnwise, or when the key column is not
 * numeric — the caller falls back to the row path rather than guessing.
 */
export const readColumnValues = async (
  engine: AttributeLookupEngine,
  access: { store: ParquetStoreLike; keyColumn: string },
  column: string,
): Promise<ColumnValues | null> => {
  // An engine without the typed path (a minimal injected stand-in) cannot
  // answer columnwise — null is the contract for that, not a TypeError.
  if (typeof engine.readColumnsTyped !== "function") return null;
  const key = escapeSqlIdentifier(access.keyColumn);
  const value = escapeSqlIdentifier(column);
  const read = await engine.readColumnsTyped(
    [access.store],
    (urlOf) =>
      `SELECT ${key} AS object_id, ${value} AS value FROM read_parquet(${escapeSqlLiteral(
        urlOf(access.store.id),
      )}) ORDER BY object_id`,
    ["object_id", "value"],
  );
  if (!read) return null;

  const ids = asNumeric(read.object_id);
  if (!ids) return null;

  const numeric = asNumeric(read.value);
  return {
    ids,
    numeric,
    // Not numeric means the column came back as strings — a categorical
    // colouring, which the painter ranks rather than quantises.
    text: numeric ? null : (read.value as ArrayLike<string>),
    count: ids.length,
  };
};
