import type { AxisCoords } from "../coords/axisPath";
import { applyPathToCoords } from "../coords/axisPath";
import type { ArrayLineReaderLike } from "./arrayLine";
import { DEFAULT_LINE_CAP, markerFor } from "./arrayLine";
import type {
  ArrayHopLike,
  AttributeHopLike,
  AttributePlanLike,
  PlanLike,
  PlanLine,
  PlanRowsState,
  RowId,
  RowPlanLike,
  SparseHopLike,
  TableHopLike,
} from "./attributeTypes";
import {
  hopDirection,
  hopKey,
  indexColumnOf,
  isRowPlan,
  hopSource,
  hopViaName,
  isArrayHop,
  isMeshSample,
  isNetworkSample,
  isSparseHop,
  isTableHop,
  landingOf,
  planIdentity,
} from "./attributeTypes";
import type { AttributeLookupEngine } from "./lookupEngine";
import type { BindParam, HeldMap, HeldValue } from "./planExec";
import { buildHeld, isBackground, resolveSampleIndex } from "./planExec";

/**
 * The plan executor: the sample step, then the CHAIN of hops in order.
 *
 * Shared by every consumer of the attribute service — the scene's hover
 * tracker (which adds a resident-atlas fast path and per-hop delivery into
 * its store) and the standalone `attributesAt` (which just awaits). The
 * chain is the server's: `hops[0]` binds from the sampled id; each later hop
 * binds from what its parent returned under the name `via` states — a
 * parent row's reference column, or the positions a parent profile carries
 * along a matrix axis — as a scalar (ONE) or as a list (MANY). Which hops
 * run is the caller's choice (`hops`); a hop whose parent did not run is
 * unreachable, never guessed.
 *
 * Every hop settles to a `PlanRowsState` of its own — an error in one hop
 * (an id past a matrix's extent, a parquet that will not read) is reported
 * on that hop and its descendants, never thrown past the point.
 */

export type ExecutePlanOptions = {
  isStale?: () => boolean;
  /**
   * Synchronous resident sample (host-provided); null = fall back to the
   * exact chunk read.
   */
  sampleSync?: ((index: readonly number[]) => HeldValue | null) | null;
  /** Called once per unreachable hop with a stable reason (hosts warn-once). */
  onUnreachable?: (hopKey: string, reason: string, detail?: unknown) => void;
  /** The hops to run, in plan order (default: every hop of the plan). */
  hops?: readonly AttributeHopLike[];
  /** A TABLE hop's projection: the attribute names to select (null = all). */
  columnsFor?: (hop: TableHopLike) => readonly string[] | null;
  /** How many entries of a SPARSE profile to keep, strongest first. */
  sparseLimit?: number;
  /** Per-hop delivery as each settles, in chain order. */
  onHop?: (hopKey: string, state: PlanRowsState) => void;
  /**
   * The point in the PROBED system, for what an ARRAY hop marks on its line.
   * The coordinate entry points fill it themselves; `peekPlanWithValue`, which
   * is handed the mapped point, takes it here.
   */
  probed?: AxisCoords | null;
  /**
   * (Row plans) How many rows a MANY hop keeps — and so how many ids its
   * children bind — first in row order; the rest is reported as `truncated`.
   * A cluster's members: the first 50, then all when asked. Null = all.
   */
  manyLimit?: number | null;
};

/** What the executor needs of the sparse profile reader (structural; the
 * concrete reader lives in `lib/sparse/sparseProfile.ts`). */
export type SparseProfileReaderLike = {
  read(
    plan: PlanLike,
    hop: SparseHopLike,
    id: HeldValue,
    options: { isStale?: () => boolean; limit: number },
  ): Promise<PlanRowsState | null>;
  peek(plan: PlanLike, hop: SparseHopLike, id: HeldValue, limit: number): PlanRowsState | null;
  warm(plan: PlanLike, hop: SparseHopLike): void;
  dispose(): void;
};

export type ExecutePlanDeps = {
  engine: AttributeLookupEngine;
  sparse: SparseProfileReaderLike;
  arrays: ArrayLineReaderLike;
  sampleExact: (
    plan: AttributePlanLike,
    index: readonly number[],
  ) => Promise<HeldValue | null>;
};

/** Hop key → the hop's settled state, for every hop that ran. */
export type PlanHopStates = Record<string, PlanRowsState>;

export const DEFAULT_SPARSE_LIMIT = 25;

/**
 * The most lines one ARRAY hop reads for several ids. The reader keeps this
 * many, so a run never evicts its own lines before `peek` can answer them.
 */
export const ARRAY_LINES_CAP = DEFAULT_LINE_CAP;

const UNREACHABLE: PlanRowsState = { status: "unreachable", rows: [] };

type ChainDeps = Pick<ExecutePlanDeps, "engine" | "sparse" | "arrays">;

type ChainContext = {
  plan: PlanLike;
  hops: readonly AttributeHopLike[];
  value: HeldValue;
  /** A row plan's landing is a real row whatever its id: row 0 is not background. */
  rowRooted: boolean;
  /** Whether `value` is worth showing as the landing's id (a string row id is not a HeldValue). */
  showValue: boolean;
  manyLimit: number | null;
  sampleSource: "resident" | "exact";
  isStale: () => boolean;
  unreachable: (hop: AttributeHopLike, reason: string, detail?: unknown) => PlanRowsState;
  columnsFor: (hop: TableHopLike) => readonly string[] | null;
  sparseLimit: number;
  probed: AxisCoords | null;
  onHop?: (hopKey: string, state: PlanRowsState) => void;
};

/** How one hop is bound, decided from its parent's settled state. */
type Binding =
  /** `ids`: the row ids this binding names, where it names rows (a row plan's
   * landing, a REVERSE or SAME_ROWS hop) — what the hop's rows ARE when they
   * do not carry their INDEX themselves. */
  | { kind: "table"; held: HeldMap; ids?: readonly RowId[] }
  | { kind: "sparse"; id: HeldValue }
  | { kind: "array"; id: HeldValue }
  /** An ARRAY hop whose parent returned several ids (a cluster's members):
   * one line each, at most `ARRAY_LINES_CAP`; `total` is how many there were. */
  | { kind: "arrays"; ids: HeldValue[]; total: number }
  /** Nothing to bind — the parent had no rows (or was background). */
  | { kind: "empty" }
  | { kind: "unreachable"; reason: string; detail?: unknown };

const isHeldValue = (value: unknown): value is HeldValue =>
  typeof value === "number" || typeof value === "bigint";

const isBindParam = (value: unknown): value is BindParam =>
  isHeldValue(value) || typeof value === "string";

/** The parent's values under `name`, distinct, in row order, bindable ones only. */
const parentValues = (rows: readonly Record<string, unknown>[], name: string): BindParam[] => {
  const seen = new Set<string>();
  const values: BindParam[] = [];
  for (const row of rows) {
    const value = row[name];
    if (!isBindParam(value)) continue;
    const token = `${typeof value}:${String(value)}`;
    if (seen.has(token)) continue;
    seen.add(token);
    values.push(value);
  }
  return values;
};

/**
 * The parent's values under `name`. Normally a column of the parent's rows;
 * a hop that enters a matrix through the parent's INDEX column names a KEY
 * the parent's rows do not carry (a statement selects attributes, never
 * `*`), so that value is the one the parent itself was bound with.
 */
const valuesFrom = (
  parent: { hop: AttributeHopLike; state: PlanRowsState; held: HeldMap | null },
  name: string,
): BindParam[] => {
  const fromRows = parentValues(parent.state.rows, name);
  if (fromRows.length > 0 || !parent.held || !isTableHop(parent.hop)) return fromRows;
  const key = parent.hop.lookup.keyColumns.find((candidate) => candidate.column.name === name);
  const bound = key ? parent.held[key.axis] : undefined;
  if (bound === undefined) return [];
  return Array.isArray(bound) ? [...(bound as readonly BindParam[])] : [bound as BindParam];
};

const isRowId = (value: unknown): value is RowId =>
  typeof value === "number" || typeof value === "bigint" || typeof value === "string";

const asIds = (value: HeldMap[string] | undefined): RowId[] =>
  value === undefined ? [] : Array.isArray(value) ? value.filter(isRowId) : isRowId(value) ? [value] : [];

/** Whole within this of an integer: what floating-point `id · scale + offset` may drift by. */
const KEY_MAP_TOLERANCE = 1e-6;

/**
 * A held id as the other table's INDEX (`keyMap`, the edge between the two
 * frames already inverted by the server). Null when it lands between rows —
 * that row has no counterpart there — or is not a number to map.
 */
const mapRowId = (id: RowId, keyMap: { scale: number; offset: number } | null | undefined): RowId | null => {
  if (!keyMap) return id;
  if (typeof id === "string") return null;
  const mapped = Number(id) * keyMap.scale + keyMap.offset;
  const whole = Math.round(mapped);
  return Number.isFinite(mapped) && Math.abs(mapped - whole) <= KEY_MAP_TOLERANCE ? whole : null;
};

/**
 * A REVERSE or SAME_ROWS hop of a row plan binds the parent ROW's id — its
 * INDEX — never a column the parent's rows carry: a cluster's members are the
 * rows whose referencing column names the cluster's id; its PCA row is the row
 * with that id (mapped). The ids are bound under every name the hop's lookup
 * reads (`keyColumns[].axis`), as a list for REVERSE (the members are many).
 */
const bindByRow = (
  hop: AttributeHopLike,
  rootHeld: HeldMap,
  parent: { hop: AttributeHopLike; state: PlanRowsState; held: HeldMap | null },
  direction: "REVERSE" | "SAME_ROWS",
): Binding => {
  if (!isTableHop(hop)) {
    return { kind: "unreachable", reason: `a ${direction} hop lands in a table, and this one does not`, detail: { hop: hop.index } };
  }
  const parentIds = parent.state.ids;
  if (!parentIds) {
    return {
      kind: "unreachable",
      reason: "the hop's parent rows do not say which rows they are (no INDEX)",
      detail: { parent: hop.parent },
    };
  }
  const seen = new Set<string>();
  const ids: RowId[] = [];
  for (const id of parentIds) {
    const mapped = direction === "SAME_ROWS" ? mapRowId(id, hop.lookup.keyMap) : id;
    if (mapped === null) continue;
    const token = `${typeof mapped}:${String(mapped)}`;
    if (seen.has(token)) continue;
    seen.add(token);
    ids.push(mapped);
  }
  if (ids.length === 0) return { kind: "empty" };
  const many = direction === "REVERSE" || ids.length > 1;
  const held: HeldMap = { ...rootHeld };
  for (const key of hop.lookup.keyColumns) held[key.axis] = many ? ids : ids[0];
  // A SAME_ROWS hop's rows ARE these ids; a REVERSE hop's are the members,
  // which its rows name themselves.
  return { kind: "table", held, ids: direction === "SAME_ROWS" ? ids : undefined };
};

const bindHop = (
  hop: AttributeHopLike,
  rootHeld: HeldMap,
  parent: { hop: AttributeHopLike; state: PlanRowsState; held: HeldMap | null } | null,
  plan: PlanLike,
): Binding => {
  if (hop.parent === null || hop.parent === undefined) {
    if (isSparseHop(hop)) {
      const name = hop.lookup.keyHeld ?? hop.lookup.keyAxis;
      const id = rootHeld[name] ?? rootHeld[hop.lookup.keyAxis];
      if (!isHeldValue(id)) {
        return {
          kind: "unreachable",
          reason: "held values do not name the matrix's key axis",
          detail: { keyAxis: hop.lookup.keyAxis, keyHeld: hop.lookup.keyHeld, held: Object.keys(rootHeld) },
        };
      }
      return { kind: "sparse", id };
    }
    if (isArrayHop(hop)) {
      const id = rootHeld[hop.lookup.keyHeld ?? hop.lookup.keyAxis] ?? rootHeld[hop.lookup.keyAxis];
      if (!isHeldValue(id)) {
        return {
          kind: "unreachable",
          reason: "held values do not name the array's key axis",
          detail: { keyAxis: hop.lookup.keyAxis, keyHeld: hop.lookup.keyHeld, held: Object.keys(rootHeld) },
        };
      }
      return { kind: "array", id };
    }
    // A row plan's landing IS the picked row: its id is what the rows are.
    return isRowPlan(plan)
      ? { kind: "table", held: rootHeld, ids: asIds(rootHeld[plan.key.axis]) }
      : { kind: "table", held: rootHeld };
  }

  if (!parent) {
    return { kind: "unreachable", reason: "the hop's parent did not run", detail: { parent: hop.parent } };
  }
  const parentState = parent.state;
  if (parentState.status === "background") return { kind: "empty" };
  if (parentState.status !== "rows") {
    return {
      kind: "unreachable",
      reason: `the hop's parent settled ${parentState.status}`,
      detail: { parent: hop.parent },
    };
  }
  const direction = hopDirection(hop);
  if (direction === null) {
    return {
      kind: "unreachable",
      reason: `the hop crosses its fact in a direction this client does not know (${String(hop.via?.direction)})`,
      detail: { hop: hop.index },
    };
  }
  if (direction !== "FORWARD") return bindByRow(hop, rootHeld, parent, direction);

  const name = hopViaName(hop);
  if (name === null) {
    return { kind: "unreachable", reason: "the hop names nothing to bind from its parent", detail: { hop: hop.index } };
  }
  const values = valuesFrom(parent, name);
  if (values.length === 0) return { kind: "empty" };

  // Several members, each its own line through the array.
  if (isArrayHop(hop) && values.length > 1 && values.every(isHeldValue)) {
    const ids = values as HeldValue[];
    return { kind: "arrays", ids: ids.slice(0, ARRAY_LINES_CAP), total: ids.length };
  }
  if (isSparseHop(hop) || isArrayHop(hop)) {
    if (values.length !== 1 || !isHeldValue(values[0])) {
      return {
        kind: "unreachable",
        reason: `${isSparseHop(hop) ? "a matrix" : "an array"} takes one id, and the parent returned several (or a non-numeric one)`,
        detail: { via: name, count: values.length },
      };
    }
    return { kind: isSparseHop(hop) ? "sparse" : "array", id: values[0] };
  }
  const many = hop.cardinality === "MANY" || values.length > 1;
  return { kind: "table", held: { ...rootHeld, [name]: many ? values : values[0] } };
};

const asError = (error: unknown): PlanRowsState => ({
  status: "error",
  rows: [],
  error: error instanceof Error ? error.message : "lookup failed",
});

/** The landing's provenance rides on its state alone. */
const withSample = (
  hop: AttributeHopLike,
  state: PlanRowsState,
  context: ChainContext,
): PlanRowsState =>
  (hop.parent === null || hop.parent === undefined) && context.showValue
    ? { ...state, sampledValue: context.value, sampleSource: context.sampleSource }
    : state;

/** A line as this point sees it: the cached read, marked where the point sits. */
const withMarker = (hop: ArrayHopLike, state: PlanRowsState, context: ChainContext): PlanRowsState => {
  if (!state.series) return state;
  const marker = markerFor(hop, state.series, context.probed);
  return marker === null ? state : { ...state, series: { ...state.series, marker } };
};

/**
 * Several lines' reads as one hop state: the lines that exist, in the order
 * the ids came; an error only when every read failed. Null when any read was
 * superseded (or, peeking, missed).
 */
const asLines = (
  reads: readonly (PlanRowsState | null)[],
  binding: { ids: readonly HeldValue[]; total: number },
): PlanRowsState | null => {
  if (reads.some((read) => read === null)) return null;
  const lines: PlanLine[] = [];
  let firstError: string | undefined;
  let errors = 0;
  reads.forEach((read, i) => {
    if (!read) return;
    if (read.status === "error") {
      errors++;
      firstError ??= read.error;
      return;
    }
    if (read.series) lines.push({ ...read.series, id: binding.ids[i] });
  });
  if (errors > 0 && errors === reads.length) return { status: "error", rows: [], error: firstError };
  const truncated = binding.total > binding.ids.length ? { shown: binding.ids.length, total: binding.total } : undefined;
  return { status: "rows", rows: [], lines, ...(truncated ? { truncated } : {}) };
};

/**
 * A row plan's TABLE result, made to say which rows it holds: a MANY result
 * capped at `manyLimit` (the rest reported as `truncated`), and the rows' ids —
 * read off the rows where they carry the table's INDEX (a cluster's members),
 * else the ids the hop was bound with (the picked row, a SAME_ROWS row).
 * Attribute plans pass through untouched.
 */
const asRowResult = (
  hop: TableHopLike,
  state: PlanRowsState,
  binding: Binding,
  context: ChainContext,
): PlanRowsState => {
  if (!isRowPlan(context.plan) || state.status !== "rows") return state;
  let rows = state.rows;
  let truncated = state.truncated;
  const limit = context.manyLimit;
  if (limit !== null && rows.length > limit && (hop.cardinality === "MANY" || hopDirection(hop) === "REVERSE")) {
    truncated = { shown: limit, total: rows.length };
    rows = rows.slice(0, limit);
  }
  const index = indexColumnOf(hop);
  const fromRows = index ? rows.map((row) => row[index]).filter(isRowId) : [];
  const ids =
    fromRows.length > 0 ? fromRows : binding.kind === "table" && binding.ids ? binding.ids : undefined;
  return { ...state, rows, truncated, ...(ids ? { ids } : {}) };
};

/** What a hop settled to, and what it was bound with (for its children). */
type HopOutcome = { state: PlanRowsState; held: HeldMap | null };

const parentOf = (
  context: ChainContext,
  hop: AttributeHopLike,
  byIndex: Map<number, HopOutcome>,
): { hop: AttributeHopLike; state: PlanRowsState; held: HeldMap | null } | null => {
  if (hop.parent === null || hop.parent === undefined) return null;
  const parentHop = context.plan.hops.find((candidate) => candidate.index === hop.parent);
  const outcome = byIndex.get(hop.parent);
  return parentHop && outcome ? { hop: parentHop, state: outcome.state, held: outcome.held } : null;
};

const heldOf = (binding: Binding): HeldMap | null =>
  binding.kind === "table" ? binding.held : null;

/** Run the chain, awaiting each hop; null when superseded mid-chain. */
async function executeChain(
  deps: ChainDeps,
  context: ChainContext,
  rootHeld: HeldMap | null,
): Promise<PlanHopStates | null> {
  const states: PlanHopStates = {};
  const byIndex = new Map<number, HopOutcome>();
  const background = !context.rowRooted && isBackground(context.value);

  for (const hop of context.hops) {
    const key = hopKey(context.plan, hop);
    let state: PlanRowsState;
    let held: HeldMap | null = null;
    if (rootHeld === null) {
      state = context.unreachable(hop, "held values do not cover the plan's key axes", {
        source: hopSource(hop).name,
        ...(isRowPlan(context.plan)
          ? { key: context.plan.key.axis }
          : { passthrough: context.plan.sample.passthrough, produces: context.plan.sample.produces }),
      });
    } else if (background && (hop.parent === null || hop.parent === undefined)) {
      state = { status: "background", rows: [], sampledValue: context.value, sampleSource: context.sampleSource };
    } else {
      const binding = bindHop(hop, rootHeld, parentOf(context, hop, byIndex), context.plan);
      held = heldOf(binding);
      try {
        if (binding.kind === "unreachable") {
          state = context.unreachable(hop, binding.reason, binding.detail);
        } else if (binding.kind === "empty") {
          state = withSample(hop, { status: "rows", rows: [] }, context);
        } else if (binding.kind === "sparse") {
          const read = await deps.sparse.read(context.plan, hop as SparseHopLike, binding.id, {
            isStale: context.isStale,
            limit: context.sparseLimit,
          });
          if (read === null) return null;
          state = withSample(hop, read, context);
        } else if (binding.kind === "array") {
          const array = hop as ArrayHopLike;
          const read = await deps.arrays.read(context.plan, array, binding.id, { isStale: context.isStale });
          if (read === null) return null;
          state = withSample(hop, withMarker(array, read, context), context);
        } else if (binding.kind === "arrays") {
          const array = hop as ArrayHopLike;
          const reads = await Promise.all(
            binding.ids.map((id) => deps.arrays.read(context.plan, array, id, { isStale: context.isStale })),
          );
          const lines = asLines(reads, binding);
          if (lines === null) return null;
          state = lines;
        } else {
          const table = hop as TableHopLike;
          const rows = await deps.engine.lookup(context.plan, table, binding.held, context.isStale, {
            columns: context.columnsFor(table),
          });
          if (rows === null) return null;
          state = withSample(hop, asRowResult(table, { status: "rows", rows }, binding, context), context);
        }
      } catch (error) {
        state = asError(error);
      }
    }
    if (context.isStale()) return null;
    byIndex.set(hop.index, { state, held });
    states[key] = state;
    context.onHop?.(key, state);
  }
  return states;
}

/** The chain from caches alone: null on the first miss. */
function peekChain(deps: ChainDeps, context: ChainContext, rootHeld: HeldMap | null): PlanHopStates | null {
  const states: PlanHopStates = {};
  const byIndex = new Map<number, HopOutcome>();
  const background = !context.rowRooted && isBackground(context.value);

  for (const hop of context.hops) {
    const key = hopKey(context.plan, hop);
    let state: PlanRowsState;
    let held: HeldMap | null = null;
    if (rootHeld === null) {
      state = UNREACHABLE;
    } else if (background && (hop.parent === null || hop.parent === undefined)) {
      state = { status: "background", rows: [], sampledValue: context.value, sampleSource: context.sampleSource };
    } else {
      const binding = bindHop(hop, rootHeld, parentOf(context, hop, byIndex), context.plan);
      held = heldOf(binding);
      if (binding.kind === "unreachable") {
        state = UNREACHABLE;
      } else if (binding.kind === "empty") {
        state = withSample(hop, { status: "rows", rows: [] }, context);
      } else if (binding.kind === "sparse") {
        const read = deps.sparse.peek(context.plan, hop as SparseHopLike, binding.id, context.sparseLimit);
        if (read === null) return null;
        state = withSample(hop, read, context);
      } else if (binding.kind === "array") {
        const array = hop as ArrayHopLike;
        const read = deps.arrays.peek(context.plan, array, binding.id);
        if (read === null) return null;
        state = withSample(hop, withMarker(array, read, context), context);
      } else if (binding.kind === "arrays") {
        const array = hop as ArrayHopLike;
        const lines = asLines(
          binding.ids.map((id) => deps.arrays.peek(context.plan, array, id)),
          binding,
        );
        if (lines === null) return null;
        state = lines;
      } else {
        const table = hop as TableHopLike;
        const rows = deps.engine.peek(context.plan, table, binding.held, { columns: context.columnsFor(table) });
        if (rows === null) return null;
        state = withSample(hop, asRowResult(table, { status: "rows", rows }, binding, context), context);
      }
    }
    byIndex.set(hop.index, { state, held });
    states[key] = state;
  }
  return states;
}

const contextFor = (
  plan: PlanLike,
  value: HeldValue,
  sampleSource: "resident" | "exact",
  opts: ExecutePlanOptions,
): ChainContext => ({
  plan,
  hops: opts.hops ?? plan.hops,
  value,
  rowRooted: isRowPlan(plan),
  showValue: true,
  manyLimit: opts.manyLimit ?? null,
  sampleSource,
  isStale: opts.isStale ?? (() => false),
  unreachable: (hop, reason, detail) => {
    opts.onUnreachable?.(hopKey(plan, hop), reason, detail);
    return UNREACHABLE;
  },
  columnsFor: opts.columnsFor ?? (() => null),
  sparseLimit: opts.sparseLimit ?? DEFAULT_SPARSE_LIMIT,
  probed: opts.probed ?? null,
  onHop: opts.onHop,
});

/** Every selected hop unreachable for one reason (the sample step failed). */
const allUnreachable = (
  plan: AttributePlanLike,
  opts: ExecutePlanOptions,
  reason: string,
  detail?: unknown,
): PlanHopStates => {
  const states: PlanHopStates = {};
  for (const hop of opts.hops ?? plan.hops) {
    const key = hopKey(plan, hop);
    opts.onUnreachable?.(key, reason, detail);
    states[key] = UNREACHABLE;
    opts.onHop?.(key, UNREACHABLE);
  }
  return states;
};

const allErrored = (plan: AttributePlanLike, opts: ExecutePlanOptions, error: string): PlanHopStates => {
  const states: PlanHopStates = {};
  for (const hop of opts.hops ?? plan.hops) {
    const key = hopKey(plan, hop);
    states[key] = { status: "error", rows: [], error };
    opts.onHop?.(key, states[key]);
  }
  return states;
};

/** Map the probed point along the plan's path; null when it cannot compose. */
const mapAlongPath = (plan: AttributePlanLike, startCoords: AxisCoords): AxisCoords | null =>
  plan.path.length ? applyPathToCoords(plan.path, startCoords) : startCoords;

export async function executePlanAt(
  deps: ExecutePlanDeps,
  plan: AttributePlanLike,
  startCoords: AxisCoords,
  opts: ExecutePlanOptions = {},
): Promise<PlanHopStates | null> {
  const isStale = opts.isStale ?? (() => false);
  const landing = hopSource(landingOf(plan)).name;

  // A MeshSample or NetworkSample carries no array to index: the id rides on
  // geometry rows, so only a PICK (the value-known path below) can execute
  // such a plan.
  if (isMeshSample(plan.sample) || isNetworkSample(plan.sample)) {
    return allUnreachable(plan, opts, "a geometry-sampled plan needs a picked instance id", { landing });
  }

  const mapped = mapAlongPath(plan, startCoords);
  if (mapped === null) {
    return allUnreachable(plan, opts, "cannot map the probed point along the plan's path", {
      landing,
      startCoords,
      path: plan.path.map((step) => `${step.inverted ? "~" : ""}${step.transformation?.__typename}`),
    });
  }
  const index = resolveSampleIndex(plan, mapped);
  if (index === null) {
    return allUnreachable(plan, opts, "mapped point does not index the field array", {
      landing,
      mapped,
      axes: [...plan.sample.system.axes].sort((a, b) => a.order - b.order).map((a) => a.name),
      shape: plan.sample.store.shape,
    });
  }

  // Resident-first sampling when the host provides it: the atlas CPU mirror
  // is free and already on screen. The chunk read is the FALLBACK (mask not
  // rendered, mirror stale) — and the only path when no scene is mounted.
  let value = opts.sampleSync?.(index) ?? null;
  let sampleSource: "resident" | "exact" = "resident";
  if (value === null) {
    value = await deps.sampleExact(plan, index);
    sampleSource = "exact";
    if (isStale()) return null;
  }
  if (value === null) {
    return allErrored(plan, opts, "could not sample the field array");
  }
  return executeChain(
    deps,
    contextFor(plan, value, sampleSource, { ...opts, probed: opts.probed ?? startCoords }),
    buildHeld(plan, mapped, value),
  );
}

/**
 * The value-KNOWN entry point: same pipeline, minus the field-array sample.
 *
 * A mesh instance pick already carries its objectId — the number the sample
 * step exists to discover — so it maps the path (a plan may still be rooted
 * elsewhere) and jumps straight to `buildHeld` + the chain. Rows are
 * identical to what sampling the mask at any voxel of that instance yields.
 */
export async function executePlanWithValue(
  deps: ChainDeps,
  plan: AttributePlanLike,
  startCoords: AxisCoords,
  value: HeldValue,
  opts: Omit<ExecutePlanOptions, "sampleSync"> = {},
): Promise<PlanHopStates | null> {
  const mapped = mapAlongPath(plan, startCoords);
  if (mapped === null) {
    return allUnreachable(plan, opts, "cannot map the probed point along the plan's path", {
      landing: hopSource(landingOf(plan)).name,
      startCoords,
    });
  }
  return executeChain(
    deps,
    contextFor(plan, value, "exact", { ...opts, probed: opts.probed ?? startCoords }),
    buildHeld(plan, mapped, value),
  );
}

/**
 * The whole chain from caches alone, synchronously — the tracker's instant
 * re-hover path. The caller has already mapped the point and holds the
 * sampled value; null on the first hop whose answer is not cached (a real
 * lookup is needed), so the async path runs unchanged.
 */
export function peekPlanWithValue(
  deps: ChainDeps,
  plan: AttributePlanLike,
  mapped: AxisCoords,
  value: HeldValue,
  sampleSource: "resident" | "exact",
  opts: Pick<ExecutePlanOptions, "hops" | "columnsFor" | "sparseLimit" | "probed"> = {},
): PlanHopStates | null {
  return peekChain(deps, contextFor(plan, value, sampleSource, opts), buildHeld(plan, mapped, value));
}

/**
 * Run a ROW's plan (`rowPlan`): no sample and no path — the picked row's
 * INDEX value is held under `key.axis` and the hops run in order, exactly as
 * an attribute plan's after its sample. Row 0 is a row like any other.
 */
export async function executeRowPlan(
  deps: ChainDeps,
  plan: RowPlanLike,
  id: RowId,
  opts: Omit<ExecutePlanOptions, "sampleSync" | "probed"> = {},
): Promise<PlanHopStates | null> {
  // `value` is the landing's provenance for display only; a string id has none.
  const value: HeldValue = typeof id === "string" ? 0 : id;
  const context = { ...contextFor(plan, value, "exact", opts), showValue: typeof id !== "string" };
  return executeChain(deps, context, { [plan.key.axis]: id });
}

/** Re-exported for hosts that key their own caches the executor's way. */
export { planIdentity };
