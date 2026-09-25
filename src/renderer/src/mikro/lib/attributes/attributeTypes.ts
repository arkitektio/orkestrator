import type { PathStep, PathTransformLike } from "../coords/pathTypes";

/**
 * Attribute-plan data model — the read side of a FIELD edge. A plan is a set
 * of instructions the server hands the client once: sample a zarr array at
 * the probed point (mapped along `path` when the plan is not rooted where the
 * probe lives), then run the chain of HOPS — the landing (a parquet row read
 * with DuckDB, or one object's profile sliced out of a sparse matrix), then
 * every declared reference reachable from it, each bound from the hop
 * before. The server never sends values, credentials, coordinates or SQL:
 * the same plan serves every probed point, so everything here is designed to
 * be cached and executed locally per hover.
 *
 * All types are STRUCTURAL subsets of the generated `AttributePlanFragment`
 * (the `TransformLike` convention): the core never imports the generated API,
 * so it stays framework-free and unit-testable.
 */

export type ParquetStoreLike = {
  id: string;
  bucket: string;
  key: string;
  /**
   * Bytes the store holds, measured when its upload FINISHED. Null while
   * unfinished — and also for stores written before the server recorded it, so
   * null is "unknown", never "empty".
   *
   * Optional here because most readers do not care; the ones that report a
   * failed read do, because it is the difference between "the data is not
   * there yet" and "the read broke".
   */
  sizeBytes?: number | null;
};

export type ZarrStoreLike = {
  id: string;
  bucket: string;
  key: string;
  shape?: readonly number[] | null;
  dtype?: string | null;
  chunks?: readonly number[] | null;
};

/** A path-step transformation (alias of the shared coords type). */
export type AttributePathTransformLike = PathTransformLike;

/** One step from the probed system toward the plan's root (pathToWorld contract). */
export type AttributePathStep = PathStep;

export type AttributeColumnLike = {
  name: string;
  dtype: string;
  longName?: string | null;
  unit?: string | null;
  role?: string | null;
  axisType?: string | null;
  /**
   * Declared foreign key: values of this column identify rows of the target
   * table, which is keyed by its single INDEX coordinate column. A plan's
   * later hops cross the same fact eagerly (when the user switched them on);
   * this is what the HUD's on-demand expand follows for the ones left off.
   */
  references?: {
    id: string;
    name: string;
    store: ParquetStoreLike;
    columns: readonly {
      name: string;
      dtype: string;
      role?: string | null;
      axisType?: string | null;
    }[];
  } | null;
};

/** Fields every sample step carries (the server's `SampleStep` interface). */
export type SampleStepCommonLike = {
  /** The system whose contents are the map; `consumes` is in its axis order. */
  system: {
    id: string;
    name?: string | null;
    axes: readonly { name: string; order: number }[];
  };
  consumes: readonly string[];
  produces: readonly string[];
  passthrough: readonly string[];
};

/** The id lives per PIXEL: index this zarr array at the mapped point.
 * `__typename` optional so legacy fixtures (pre-interface) stay valid. */
export type ArraySampleLike = SampleStepCommonLike & {
  __typename?: "ArraySample";
  store: ZarrStoreLike;
};

/** The id lives per GEOMETRY ROW of a fabriks collection: nothing is sampled
 * at a coordinate — a pick already holds the id and goes straight to the
 * lookup. The store is named for headless workers (and for matching a scene's
 * mesh layers: `collection.store.id`). */
export type MeshSampleLike = SampleStepCommonLike & {
  __typename: "MeshSample";
  store: { id: string; bucket?: string; key?: string };
};

/** The wireframe twin of `MeshSampleLike`: the id lives per GEOMETRY ROW of a
 * konnektion collection, one per traced OBJECT — never per node, whose ids are
 * unique only within their object. */
export type NetworkSampleLike = SampleStepCommonLike & {
  __typename: "NetworkSample";
  store: { id: string; bucket?: string; key?: string };
};

export type SampleLike = ArraySampleLike | MeshSampleLike | NetworkSampleLike;

export const isMeshSample = (sample: SampleLike): sample is MeshSampleLike =>
  sample.__typename === "MeshSample";

export const isNetworkSample = (sample: SampleLike): sample is NetworkSampleLike =>
  sample.__typename === "NetworkSample";

// ---- sparse (matrix) shapes --------------------------------------------------

/** One stored layout of a sparse matrix, as `SparseLayoutRead` publishes it. */
export type SparseLayoutLike = {
  /** Where the layout sits inside the store's prefix (`layouts/axis{k}`). */
  path: string;
  /** Which axis `indptr` walks — the axis one contiguous read selects along. */
  indexedAxis: number;
  /** The uncompressed axes, in the order `indices` was raveled over them. */
  indexOrder: readonly number[];
  nnz?: number;
  dtype?: string;
  chunks?: unknown;
  /** One uncompressed chunk per array: a range read is the whole array. */
  rangeReadable: boolean;
};

export type SparseStoreLike = {
  id: string;
  key: string;
  bucket: string;
  path?: string;
  shape?: readonly number[] | null;
  spec?: string | null;
  layouts: readonly SparseLayoutLike[];
};

/** A `SparseArray`: one layout of a matrix, named by its `path` in `store`. */
export type SparseArrayLike = {
  id: string;
  path: string;
  indexedAxis: number;
  indexedAxisName?: string | null;
  store: SparseStoreLike;
};

export type SparseDatasetLike = {
  id: string;
  name: string;
  axisNames: readonly string[];
  shape: readonly number[];
  /** Which table names the positions along an axis (a gene symbol table). */
  axisReferences: readonly { axis: string; references: { id: string; name: string } }[];
};

// ---- hops -------------------------------------------------------------------

/**
 * What every hop of a plan's chain carries. `hops[0]` is the landing — the
 * table or matrix the FIELD edge's id keys, bound from `sample`; every later
 * hop binds from what its `parent` returned, under the name `via` states.
 */
export type AttributeHopBase = {
  /** Position in `hops`; what a child names as its `parent`. */
  index: number;
  /** Null only on the landing, which binds from `sample`. */
  parent?: number | null;
  /**
   * `ONE`: bind each key as a scalar. `MANY`: bind a list (every position a
   * SPARSE parent returned) and expect the keys back per row. A floor: a ONE
   * lookup may still return several rows.
   */
  cardinality: string;
  /**
   * The declared reference this hop crosses; null on the landing. Whichever
   * of `column`/`axis` is set, its name is what the hop's lookup binds under.
   */
  via?: {
    column?: {
      name: string;
      longName?: string | null;
      role?: string | null;
      axisType?: string | null;
    } | null;
    axis?: string | null;
  } | null;
  /** The picker's name for this hop (`colorBys[].joinPath`); empty on the
   * landing and once the chain has crossed a matrix. */
  joinPath?: readonly { table: { id: string; name: string }; column: { name: string } }[];
};

/** A hop landing in a table: rows of a parquet, read with DuckDB. */
export type TableHopLike = AttributeHopBase & {
  table: { id: string; name: string };
  sparseDataset?: null;
  lookup: {
    kind: "TABLE";
    store: ParquetStoreLike;
    /** Bind order after the parquet path. `axis` names the held value. */
    keyColumns: readonly { axis: string; column: AttributeColumnLike }[];
    /** What the statement selects — every declared non-coordinate column. */
    attributes: readonly AttributeColumnLike[];
  };
};

/** A hop landing in a matrix: one object's whole profile, a slice of the
 * object-major layout. No SQL and no database in the path. */
export type SparseHopLike = AttributeHopBase & {
  table?: null;
  sparseDataset: SparseDatasetLike;
  lookup: {
    kind: "SPARSE";
    sparseArray: SparseArrayLike;
    /** The axis the held id binds — the one `sparseArray`'s `indptr` indexes. */
    keyAxis: string;
    /** The name the worker holds that id under (`keyAxis` on a landing). */
    keyHeld?: string | null;
    /** What comes back is indexed by; unravelled through `indexOrder` above rank two. */
    valueAxes: readonly string[];
    attributes?: readonly AttributeColumnLike[];
  };
};

export type AttributeHopLike = TableHopLike | SparseHopLike;

export const isTableHop = (hop: AttributeHopLike): hop is TableHopLike =>
  hop.lookup.kind === "TABLE";

export const isSparseHop = (hop: AttributeHopLike): hop is SparseHopLike =>
  hop.lookup.kind === "SPARSE";

export type AttributePlanLike = {
  /** The FIELD edge the plan was built from — half of the staleness key. */
  edge: { id: string; version: number };
  path: readonly AttributePathStep[];
  sample: SampleLike;
  /** The chain, in execution order; a hop's parent always precedes it. Never
   * empty — the plan cache refuses a plan without a landing. */
  hops: readonly AttributeHopLike[];
};

/** The landing: the table or matrix the sampled id keys directly. */
export const landingOf = (plan: AttributePlanLike): AttributeHopLike => plan.hops[0];

export type HopSourceKind = "TABLE" | "SPARSE";

/** What a hop lands in, uniformly: the table's or the matrix's identity. */
export const hopSource = (
  hop: AttributeHopLike,
): { id: string; name: string; kind: HopSourceKind } =>
  isSparseHop(hop)
    ? { id: hop.sparseDataset.id, name: hop.sparseDataset.name, kind: "SPARSE" }
    : { id: hop.table.id, name: hop.table.name, kind: "TABLE" };

/**
 * The plan's full identity: the landing plus the FIELD edge plus every path
 * step, each as `(id, version)`. This is the ONLY staleness vector a plan has
 * — parquet contents changing never stales one — so it doubles as the cache
 * key for prepared statements and result LRUs.
 */
export const planIdentity = (plan: AttributePlanLike): string =>
  [
    `${hopSource(landingOf(plan)).id}:${plan.edge.id}@${plan.edge.version}`,
    ...plan.path.map(
      (step) =>
        `${step.inverted ? "~" : ""}${step.transformation?.id ?? "?"}@${step.transformation?.version ?? "?"}`,
    ),
  ].join("|");

/**
 * One hop's identity: the plan's, and for a later hop its position and what
 * it lands in. The landing's key IS the plan identity, so everything keyed
 * per plan before the chain existed (persisted selections included) keeps
 * its key.
 */
export const hopKey = (plan: AttributePlanLike, hop: AttributeHopLike): string =>
  hop.index === 0
    ? planIdentity(plan)
    : `${planIdentity(plan)}#${hop.index}:${hopSource(hop).id}`;

/** The name the hop binds its parent's values under (`via`), or null on the landing. */
export const hopViaName = (hop: AttributeHopLike): string | null =>
  hop.via?.column?.name ?? hop.via?.axis ?? null;

/**
 * Display metadata for one hop, captured when a fetch begins so the HUD can
 * render a block (and offer the `references` follow-up) without holding the
 * plan itself. Also what the settings picker lists.
 */
export type HopMeta = {
  hopKey: string;
  planKey: string;
  index: number;
  parentKey: string | null;
  kind: HopSourceKind;
  /** The table's or the matrix's name. */
  name: string;
  sourceId: string;
  attributes: readonly AttributeColumnLike[];
  /** How this hop is reached from its parent, for a label: `via <column>`
   * or `along <axis>`; null on the landing. */
  via: string | null;
  cardinality: "ONE" | "MANY";
  /** (SPARSE) The value axes a profile is indexed by. */
  valueAxes: readonly string[];
};

export const hopMetaOf = (plan: AttributePlanLike, hop: AttributeHopLike): HopMeta => {
  const source = hopSource(hop);
  const parent =
    hop.parent === null || hop.parent === undefined
      ? null
      : plan.hops.find((candidate) => candidate.index === hop.parent) ?? null;
  return {
    hopKey: hopKey(plan, hop),
    planKey: planIdentity(plan),
    index: hop.index,
    parentKey: parent ? hopKey(plan, parent) : null,
    kind: source.kind,
    name: source.name,
    sourceId: source.id,
    attributes: hop.lookup.attributes ?? [],
    via: hop.via?.column
      ? `via ${hop.via.column.longName ?? hop.via.column.name}`
      : hop.via?.axis
        ? `along ${hop.via.axis}`
        : null,
    cardinality: hop.cardinality === "MANY" ? "MANY" : "ONE",
    valueAxes: isSparseHop(hop) ? hop.lookup.valueAxes : [],
  };
};

/** Metadata for the given hops (default: every hop) of a plan, in order. */
export const hopMetasOf = (
  plan: AttributePlanLike,
  hops: readonly AttributeHopLike[] = plan.hops,
): HopMeta[] => hops.map((hop) => hopMetaOf(plan, hop));

/**
 * Identity of the probed point the attributes belong to. Deliberately
 * scene-agnostic: `pointId` is an OPAQUE identity for the queried point —
 * equal ids mean the same request (latest-wins dedupe), nothing more. Hosts
 * extend this with whatever they need to rebuild coordinates (the scene adds
 * `layerId`/`voxelIndex`/`sliceSignature`); the resolver and store merge
 * logic are generic over that extension.
 */
export type AttributeFetchKey = {
  /** The probed system the plans were discovered for. */
  systemId: string;
  /** Opaque point identity within that system. */
  pointId: string;
};

export const attributeKeyId = (key: AttributeFetchKey): string =>
  `${key.systemId}|${key.pointId}`;

export const isSameAttributeKey = (
  a: AttributeFetchKey,
  b: AttributeFetchKey,
): boolean => attributeKeyId(a) === attributeKeyId(b);

export type AttributeRow = Record<string, unknown>;

export type PlanRowsStatus =
  /** Sampling or lookup still running. */
  | "pending"
  /** Lookup ran; `rows` holds 0..n results (plural is the contract). */
  | "rows"
  /** Sampled value was 0 — background, nothing to look up. */
  | "background"
  /** The path (or held/bind construction) could not be composed. */
  | "unreachable"
  | "error";

export type PlanRowsState = {
  status: PlanRowsStatus;
  /** For a TABLE hop, the parquet rows. For a SPARSE hop, one row per
   * nonzero of the profile: `position`, `value`, and one key per value axis
   * (`[axis]: coordinate`) — sorted by value, descending, capped. */
  rows: readonly AttributeRow[];
  /** The sampled object id (what the mask said), for display. */
  sampledValue?: number | bigint | null;
  /** Where the sampled value came from — mirrors probe provenance. */
  sampleSource?: "resident" | "exact";
  error?: string;
  /** Set when `rows` is a cap over a longer answer (a sparse profile). */
  truncated?: { shown: number; total: number };
};

/** Everything known about the attributes under one probed point. */
export type ProbedAttributes<K extends AttributeFetchKey = AttributeFetchKey> = {
  key: K;
  /** Hop key (`hopKey`) → its current state. Keyed per HOP, so a plan whose
   * chain crosses a reference renders one block per table it reached. */
  byPlan: Record<string, PlanRowsState>;
  /** Hop key → display metadata, captured when the fetch began. */
  planMeta: Record<string, HopMeta>;
};

/**
 * The whole probed-attributes slice for one point, in ONE object.
 *
 * The synchronous "everything was already cached" path used to reach the store
 * through `begin` + one `merge` per plan — 1+N separate commits, each waking
 * every React subscriber, on a path that runs whenever the cursor re-crosses a
 * voxel it has already visited.
 *
 * Returns null when the result is value-equal to `current`, so the caller can
 * skip the set entirely: re-crossing the same voxel with the same cached rows
 * then costs zero renders rather than 1+N.
 */
export function buildProbedAttributes<K extends AttributeFetchKey>(
  current: ProbedAttributes<K> | null,
  key: K,
  planMeta: ProbedAttributes<K>["planMeta"],
  states: readonly (readonly [string, PlanRowsState])[],
): ProbedAttributes<K> | null {
  const byPlan: Record<string, PlanRowsState> = {};
  for (const [planKey, state] of states) byPlan[planKey] = state;

  if (
    current !== null &&
    isSameAttributeKey(current.key, key) &&
    samePlanRows(current.byPlan, byPlan)
  ) {
    return null;
  }
  return { key, byPlan, planMeta };
}

const samePlanRows = (
  a: Record<string, PlanRowsState>,
  b: Record<string, PlanRowsState>,
): boolean => {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const planKey of keys) {
    const left = a[planKey];
    const right = b[planKey];
    if (left === right) continue;
    if (left === undefined || right === undefined) return false;
    // `rows` is compared by IDENTITY on purpose: it comes from the engine's
    // result LRU, so the same lookup hands back the same array — a deep
    // compare would buy nothing and cost per cell.
    if (
      left.status !== right.status ||
      left.rows !== right.rows ||
      left.sampledValue !== right.sampledValue ||
      left.sampleSource !== right.sampleSource ||
      left.error !== right.error ||
      left.truncated?.total !== right.truncated?.total
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Merge one plan's settled state into the probed-attributes slice. Returns
 * null when `key` no longer matches the active entry — callers must treat
 * that as a no-op set (same state object) so late async arrivals never cause
 * renders. Mirrors `applyExactValues`.
 */
export function applyAttributeRows<K extends AttributeFetchKey>(
  current: ProbedAttributes<K> | null,
  key: K,
  planKey: string,
  state: PlanRowsState,
): ProbedAttributes<K> | null {
  if (current === null || !isSameAttributeKey(current.key, key)) return null;
  if (!(planKey in current.byPlan)) return null;
  return {
    ...current,
    byPlan: { ...current.byPlan, [planKey]: state },
  };
}
