import { placementToTimeMap, type AffinePlacementLike, type TimeMap } from "../coords/timeMap";
import { timeAxisName, type CoordinateSystemLike } from "../coords/timeAxis";

/**
 * Turning an events layer into something the renderer can read: which columns
 * of the parquet table carry the times, stops, labels and lanes, and how a value
 * in the time column lands on the world clock.
 *
 * A `TableDataset`'s coordinate system names its COORDINATE columns — the time
 * column of an event table is an axis of that system — so the layer's
 * `asAffine` maps a time-column value to world time exactly as a trace's maps
 * a sample index. Same `placementToTimeMap`, different input axis.
 *
 * Pure — runs in node. The SQL is built here too, so what is read is testable
 * without a DuckDB.
 */

export type ColumnLike = {
  name: string;
  role?: string | null;
  axisType?: string | null;
  dtype?: string | null;
};

export type EventTableLike = {
  id: string;
  name: string;
  store: { id: string };
  columns?: readonly ColumnLike[] | null;
  coordinateSystem?: CoordinateSystemLike | null;
};

export type EventSource = {
  store: { id: string };
  timeColumn: string;
  stopColumn: string | null;
  labelColumn: string | null;
  laneColumn: string | null;
  /** Time-column value → world time. */
  timeMap: TimeMap;
};

export type EventSourceFailure = "no-time-column" | "no-time-axis" | "no-placement";

/**
 * The time column: the layer's own choice, else the table's TIME coordinate
 * column, else the column named like its system's TIME axis.
 */
export const eventTimeColumn = (
  table: EventTableLike,
  chosen: string | null | undefined,
): string | null => {
  if (chosen) return chosen;
  const columns = table.columns ?? [];
  const coordinate = columns.find((c) => c.role === "COORDINATE" && c.axisType === "TIME");
  if (coordinate) return coordinate.name;
  const axis = timeAxisName(table.coordinateSystem);
  return axis && columns.some((c) => c.name === axis) ? axis : null;
};

export const buildEventSource = (args: {
  table: EventTableLike;
  timeColumn?: string | null;
  stopColumn?: string | null;
  labelColumn?: string | null;
  laneColumn?: string | null;
  asAffine: AffinePlacementLike | null | undefined;
  world: CoordinateSystemLike | null | undefined;
}): { ok: true; source: EventSource } | { ok: false; reason: EventSourceFailure } => {
  const timeColumn = eventTimeColumn(args.table, args.timeColumn);
  if (!timeColumn) return { ok: false, reason: "no-time-column" };
  const worldTime = timeAxisName(args.world);
  if (!worldTime) return { ok: false, reason: "no-time-axis" };
  // The placement's input axis is the system's TIME axis; it is the time column
  // itself in every table the server writes, but read it off the system rather
  // than assume.
  const inputTime = timeAxisName(args.table.coordinateSystem) ?? timeColumn;
  const timeMap = placementToTimeMap(args.asAffine, inputTime, worldTime);
  if (!timeMap) return { ok: false, reason: "no-placement" };
  return {
    ok: true,
    source: {
      store: args.table.store,
      timeColumn,
      stopColumn: args.stopColumn ?? null,
      labelColumn: args.labelColumn ?? null,
      laneColumn: args.laneColumn ?? null,
      timeMap,
    },
  };
};

// --- SQL ----------------------------------------------------------------------

const ident = (name: string) => `"${name.replaceAll('"', '""')}"`;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const num = (value: number) => (Number.isFinite(value) ? String(value) : "NULL");

/** The aliases every events read answers with — what `readColumnsTyped` asks for. */
export const EVENT_COLUMNS = {
  time: "__t",
  stop: "__stop",
  label: "__label",
  lane: "__lane",
} as const;

/** Row count, to choose between one whole-table read and windowed reads. */
export const eventCountSql = (url: string): string =>
  `SELECT COUNT(*) AS n FROM read_parquet(${literal(url)})`;

/** A world window in time-column units (the inverse of the time map). */
export const windowInTableUnits = (
  map: TimeMap,
  window: { start: number; end: number },
): { lo: number; hi: number } => {
  const a = (window.start - map.t0) / map.period;
  const b = (window.end - map.t0) / map.period;
  return { lo: Math.min(a, b), hi: Math.max(a, b) };
};

/**
 * The events read. With a window, an interval is kept when it OVERLAPS the
 * window (an epoch that started before it still shades it); an instant when it
 * falls inside. Parquet row-group statistics make the predicate cheap.
 */
export const eventsSql = (
  url: string,
  source: EventSource,
  options: { window?: { lo: number; hi: number } | null; limit?: number | null; extra?: readonly string[] } = {},
): string => {
  const select = [
    `CAST(${ident(source.timeColumn)} AS DOUBLE) AS ${EVENT_COLUMNS.time}`,
    // A missing stop reads as the start (an instant): a null in a DOUBLE column
    // would arrive through Arrow as 0 in a Float64Array, i.e. an interval to 0.
    source.stopColumn
      ? `CAST(COALESCE(${ident(source.stopColumn)}, ${ident(source.timeColumn)}) AS DOUBLE) AS ${EVENT_COLUMNS.stop}`
      : null,
    source.labelColumn ? `CAST(${ident(source.labelColumn)} AS VARCHAR) AS ${EVENT_COLUMNS.label}` : null,
    source.laneColumn ? `CAST(${ident(source.laneColumn)} AS VARCHAR) AS ${EVENT_COLUMNS.lane}` : null,
    ...(options.extra ?? []),
  ].filter(Boolean);
  const where: string[] = [`${ident(source.timeColumn)} IS NOT NULL`];
  if (options.window) {
    const { lo, hi } = options.window;
    if (source.stopColumn) {
      where.push(`${ident(source.timeColumn)} <= ${num(hi)}`);
      where.push(`COALESCE(${ident(source.stopColumn)}, ${ident(source.timeColumn)}) >= ${num(lo)}`);
    } else {
      where.push(`${ident(source.timeColumn)} BETWEEN ${num(lo)} AND ${num(hi)}`);
    }
  }
  return (
    `SELECT ${select.join(", ")} FROM read_parquet(${literal(url)})` +
    ` WHERE ${where.join(" AND ")} ORDER BY ${EVENT_COLUMNS.time}` +
    (options.limit != null ? ` LIMIT ${Math.max(0, Math.floor(options.limit))}` : "")
  );
};

// --- packing ------------------------------------------------------------------

export type EventMarks = {
  /** Instants: world time − origin. */
  instants: Float64Array;
  instantLanes: Uint16Array;
  instantRows: Uint32Array;
  /** Intervals: [start, end] pairs, world time − origin. */
  intervals: Float64Array;
  intervalLanes: Uint16Array;
  intervalRows: Uint32Array;
  /** Lane names in lane-index order (one unnamed lane when there is no lane column). */
  lanes: string[];
  labels: (string | null)[];
  count: number;
};

/**
 * Columns as read → marks in world time. Rows with a stop become intervals, rows
 * without one instants; lanes are the distinct lane values, sorted, so a lane
 * keeps its place across reads of different windows of the same table.
 */
export const packEvents = (
  columns: {
    time: ArrayLike<number>;
    stop?: ArrayLike<number | null> | null;
    label?: ArrayLike<string | null> | null;
    lane?: ArrayLike<string | null> | null;
  },
  map: TimeMap,
  timeOrigin: number,
  knownLanes: readonly string[] = [],
): EventMarks => {
  const n = columns.time.length;
  const laneSet = new Set(knownLanes);
  if (columns.lane) for (let i = 0; i < n; i++) laneSet.add(columns.lane[i] ?? "");
  const lanes = columns.lane ? [...laneSet].sort() : [""];
  const laneIndex = new Map(lanes.map((name, i) => [name, i]));

  const instants: number[] = [];
  const instantLanes: number[] = [];
  const instantRows: number[] = [];
  const intervals: number[] = [];
  const intervalLanes: number[] = [];
  const intervalRows: number[] = [];
  const labels: (string | null)[] = [];

  for (let i = 0; i < n; i++) {
    const t = columns.time[i];
    if (t == null || !Number.isFinite(t)) continue;
    const lane = columns.lane ? laneIndex.get(columns.lane[i] ?? "") ?? 0 : 0;
    const start = map.t0 + map.period * t - timeOrigin;
    const stopValue = columns.stop?.[i];
    labels.push(columns.label?.[i] ?? null);
    const row = labels.length - 1;
    if (stopValue != null && Number.isFinite(stopValue) && stopValue !== t) {
      const end = map.t0 + map.period * stopValue - timeOrigin;
      intervals.push(Math.min(start, end), Math.max(start, end));
      intervalLanes.push(lane);
      intervalRows.push(row);
    } else {
      instants.push(start);
      instantLanes.push(lane);
      instantRows.push(row);
    }
  }

  return {
    instants: Float64Array.from(instants),
    instantLanes: Uint16Array.from(instantLanes),
    instantRows: Uint32Array.from(instantRows),
    intervals: Float64Array.from(intervals),
    intervalLanes: Uint16Array.from(intervalLanes),
    intervalRows: Uint32Array.from(intervalRows),
    lanes,
    labels,
    count: labels.length,
  };
};
