import type { AxisCoords } from "../coords/axisPath";
import { applyPathToCoords } from "../coords/axisPath";
import type {
  AttributeHopLike,
  AttributePlanLike,
  PlanRowsState,
  SparseHopLike,
  TableHopLike,
} from "./attributeTypes";
import {
  hopKey,
  hopSource,
  hopViaName,
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
};

/** What the executor needs of the sparse profile reader (structural; the
 * concrete reader lives in `lib/sparse/sparseProfile.ts`). */
export type SparseProfileReaderLike = {
  read(
    plan: AttributePlanLike,
    hop: SparseHopLike,
    id: HeldValue,
    options: { isStale?: () => boolean; limit: number },
  ): Promise<PlanRowsState | null>;
  peek(plan: AttributePlanLike, hop: SparseHopLike, id: HeldValue, limit: number): PlanRowsState | null;
  warm(plan: AttributePlanLike, hop: SparseHopLike): void;
  dispose(): void;
};

export type ExecutePlanDeps = {
  engine: AttributeLookupEngine;
  sparse: SparseProfileReaderLike;
  sampleExact: (
    plan: AttributePlanLike,
    index: readonly number[],
  ) => Promise<HeldValue | null>;
};

/** Hop key → the hop's settled state, for every hop that ran. */
export type PlanHopStates = Record<string, PlanRowsState>;

export const DEFAULT_SPARSE_LIMIT = 25;

const UNREACHABLE: PlanRowsState = { status: "unreachable", rows: [] };

type ChainDeps = Pick<ExecutePlanDeps, "engine" | "sparse">;

type ChainContext = {
  plan: AttributePlanLike;
  hops: readonly AttributeHopLike[];
  value: HeldValue;
  sampleSource: "resident" | "exact";
  isStale: () => boolean;
  unreachable: (hop: AttributeHopLike, reason: string, detail?: unknown) => PlanRowsState;
  columnsFor: (hop: TableHopLike) => readonly string[] | null;
  sparseLimit: number;
  onHop?: (hopKey: string, state: PlanRowsState) => void;
};

/** How one hop is bound, decided from its parent's settled state. */
type Binding =
  | { kind: "table"; held: HeldMap }
  | { kind: "sparse"; id: HeldValue }
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

const bindHop = (
  hop: AttributeHopLike,
  rootHeld: HeldMap,
  parent: { hop: AttributeHopLike; state: PlanRowsState; held: HeldMap | null } | null,
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
    return { kind: "table", held: rootHeld };
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
  const name = hopViaName(hop);
  if (name === null) {
    return { kind: "unreachable", reason: "the hop names nothing to bind from its parent", detail: { hop: hop.index } };
  }
  const values = valuesFrom(parent, name);
  if (values.length === 0) return { kind: "empty" };

  if (isSparseHop(hop)) {
    if (values.length !== 1 || !isHeldValue(values[0])) {
      return {
        kind: "unreachable",
        reason: "a matrix takes one id, and the parent returned several (or a non-numeric one)",
        detail: { via: name, count: values.length },
      };
    }
    return { kind: "sparse", id: values[0] };
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
  hop.parent === null || hop.parent === undefined
    ? { ...state, sampledValue: context.value, sampleSource: context.sampleSource }
    : state;

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
  const background = isBackground(context.value);

  for (const hop of context.hops) {
    const key = hopKey(context.plan, hop);
    let state: PlanRowsState;
    let held: HeldMap | null = null;
    if (rootHeld === null) {
      state = context.unreachable(hop, "held values do not cover the plan's key axes", {
        source: hopSource(hop).name,
        passthrough: context.plan.sample.passthrough,
        produces: context.plan.sample.produces,
      });
    } else if (background && (hop.parent === null || hop.parent === undefined)) {
      state = { status: "background", rows: [], sampledValue: context.value, sampleSource: context.sampleSource };
    } else {
      const binding = bindHop(hop, rootHeld, parentOf(context, hop, byIndex));
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
        } else {
          const table = hop as TableHopLike;
          const rows = await deps.engine.lookup(context.plan, table, binding.held, context.isStale, {
            columns: context.columnsFor(table),
          });
          if (rows === null) return null;
          state = withSample(hop, { status: "rows", rows }, context);
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
  const background = isBackground(context.value);

  for (const hop of context.hops) {
    const key = hopKey(context.plan, hop);
    let state: PlanRowsState;
    let held: HeldMap | null = null;
    if (rootHeld === null) {
      state = UNREACHABLE;
    } else if (background && (hop.parent === null || hop.parent === undefined)) {
      state = { status: "background", rows: [], sampledValue: context.value, sampleSource: context.sampleSource };
    } else {
      const binding = bindHop(hop, rootHeld, parentOf(context, hop, byIndex));
      held = heldOf(binding);
      if (binding.kind === "unreachable") {
        state = UNREACHABLE;
      } else if (binding.kind === "empty") {
        state = withSample(hop, { status: "rows", rows: [] }, context);
      } else if (binding.kind === "sparse") {
        const read = deps.sparse.peek(context.plan, hop as SparseHopLike, binding.id, context.sparseLimit);
        if (read === null) return null;
        state = withSample(hop, read, context);
      } else {
        const table = hop as TableHopLike;
        const rows = deps.engine.peek(context.plan, table, binding.held, { columns: context.columnsFor(table) });
        if (rows === null) return null;
        state = withSample(hop, { status: "rows", rows }, context);
      }
    }
    byIndex.set(hop.index, { state, held });
    states[key] = state;
  }
  return states;
}

const contextFor = (
  plan: AttributePlanLike,
  value: HeldValue,
  sampleSource: "resident" | "exact",
  opts: ExecutePlanOptions,
): ChainContext => ({
  plan,
  hops: opts.hops ?? plan.hops,
  value,
  sampleSource,
  isStale: opts.isStale ?? (() => false),
  unreachable: (hop, reason, detail) => {
    opts.onUnreachable?.(hopKey(plan, hop), reason, detail);
    return UNREACHABLE;
  },
  columnsFor: opts.columnsFor ?? (() => null),
  sparseLimit: opts.sparseLimit ?? DEFAULT_SPARSE_LIMIT,
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
  return executeChain(deps, contextFor(plan, value, sampleSource, opts), buildHeld(plan, mapped, value));
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
  return executeChain(deps, contextFor(plan, value, "exact", opts), buildHeld(plan, mapped, value));
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
  opts: Pick<ExecutePlanOptions, "hops" | "columnsFor" | "sparseLimit"> = {},
): PlanHopStates | null {
  return peekChain(deps, contextFor(plan, value, sampleSource, opts), buildHeld(plan, mapped, value));
}

/** Re-exported for hosts that key their own caches the executor's way. */
export { planIdentity };
