import {
  AttributePlanFragment,
  AttributePlanHopFragment,
  AttributePlansDocument,
  AttributePlansQuery,
  AttributePlansQueryVariables,
  RowPlanDocument,
  RowPlanQuery,
  RowPlanQueryVariables,
} from "@/mikro/api/graphql";
import type {
  ArrayHopLike,
  AttributeHopLike,
  AttributePlanLike,
  RowPlanLike,
  SparseHopLike,
  TableHopLike,
} from "./attributeTypes";
import { hopSource } from "./attributeTypes";
import { LruMap } from "@/core/util/lruMap";

/**
 * Plan discovery, memoized per probed system for the scene's life. The
 * contract makes this safe and cheap: a plan takes no coordinate — the same
 * plan serves every point — and its only staleness vector is a deleted or
 * version-bumped edge, which we accept as "until the scene remounts" (the
 * same freshness the scene's layers already have). An empty result is a
 * NEGATIVE cache entry: systems with no attached tables answer every
 * subsequent hover with one map lookup. Discovery failures are not cached, so
 * a later hover retries.
 *
 * Fetched imperatively (the `zarrSources.ts` pattern) — no hook mounts, so
 * the Guard.Mikro obligation stays where it already is, on the hosts
 * mounting `<Scene>`.
 */

/** The imperative slice of ApolloClient this cache needs (structural). */
export type QueryClient<D = AttributePlansQuery> = {
  query(options: {
    query: unknown;
    variables?: unknown;
    fetchPolicy?: string;
  }): Promise<{ data?: D | null }>;
};

/**
 * How many reference hops past the landing the server describes. Two, so a
 * matrix's feature names are reachable in BOTH directions: a mask landing on
 * a matrix, then its axis table (one), or a mask landing on a table, into the
 * matrix it indexes, then that matrix's feature table (two). Which hops run is
 * the user's choice (`attributeSelection`), not the query's.
 */
export const PLAN_JOIN_DEPTH = 2;

/**
 * `LookupStep` is a flat discriminator over three shapes: TABLE names a
 * parquet store, its key columns and attributes; SPARSE names a matrix layout
 * to slice and the axis the held id binds; ARRAY names a dense array and the
 * axis one position of it is read along. These typed filters are where the
 * compiler PROVES the generated fragment is a structural superset of the
 * core's hop types (no cast) — the one place the codegen dependency touches
 * the core contract. Written on the fields each shape requires rather than
 * on `kind` alone, because those fields are what the core executes.
 */
const isTableHopFragment = (
  hop: AttributePlanHopFragment,
): hop is AttributePlanHopFragment & TableHopLike =>
  hop.lookup.kind === "TABLE" && hop.table != null && hop.lookup.store != null;

const isSparseHopFragment = (
  hop: AttributePlanHopFragment,
): hop is AttributePlanHopFragment & SparseHopLike =>
  hop.lookup.kind === "SPARSE" &&
  hop.sparseDataset != null &&
  hop.lookup.sparseArray != null &&
  hop.lookup.keyAxis != null;

const isArrayHopFragment = (
  hop: AttributePlanHopFragment,
): hop is AttributePlanHopFragment & ArrayHopLike =>
  hop.lookup.kind === "ARRAY" &&
  hop.arrayDataset != null &&
  hop.lookup.keyAxis != null &&
  hop.lookup.valueAxes != null;

/**
 * The executable hops of a chain, in order. A malformed hop is dropped WITH
 * its descendants (a hop never runs without its parent) and said out loud: a
 * field silently withheld is indistinguishable from one the server never
 * published. Shared by both kinds of plan.
 */
const filterHops = (hops: readonly AttributePlanHopFragment[], label: string): AttributeHopLike[] => {
  const accepted = new Map<number, AttributeHopLike>();
  const dropped: number[] = [];
  for (const hop of [...hops].sort((a, b) => a.index - b.index)) {
    const executable = isTableHopFragment(hop) || isSparseHopFragment(hop) || isArrayHopFragment(hop);
    const parentAccepted = hop.parent === null || hop.parent === undefined || accepted.has(hop.parent);
    if (executable && parentAccepted) accepted.set(hop.index, hop);
    else dropped.push(hop.index);
  }
  if (dropped.length) {
    console.warn(
      `[attributePlans] ${label}: hop(s) ${dropped.join(", ")} ignored — neither a parquet TABLE, a sliceable SPARSE nor a dense ARRAY lookup, or under a hop that was`,
    );
  }
  return [...accepted.values()];
};

/** One fragment as a core plan, or null when its landing is not executable. */
const toStructuralPlan = (fragment: AttributePlanFragment): AttributePlanLike | null => {
  const hops = filterHops(fragment.hops, `edge ${fragment.edge.id}`);
  if (!hops.some((hop) => hop.index === 0)) return null;
  return {
    edge: fragment.edge,
    path: fragment.path,
    sample: fragment.sample,
    hops,
  };
};

/** A row's plan as a core plan, or null when its landing (the row itself) is not executable. */
export const toRowPlan = (fragment: RowPlanQuery["rowPlan"]): RowPlanLike | null => {
  const hops = filterHops(fragment.hops, `table ${fragment.table.id}`);
  if (!hops.some((hop) => hop.index === 0)) return null;
  return { kind: "row", table: fragment.table, key: fragment.key, hops };
};

export const toStructuralPlans = (
  fragments: readonly AttributePlanFragment[],
): readonly AttributePlanLike[] =>
  fragments.map(toStructuralPlan).filter((plan): plan is AttributePlanLike => plan !== null);

const DEFAULT_SYSTEM_CAP = 64;

export class AttributePlanCache {
  private plans: LruMap<Promise<readonly AttributePlanLike[]>>;
  /** Settled results, for the tracker's synchronous fast path. */
  private resolved: LruMap<readonly AttributePlanLike[]>;

  constructor(
    private readonly client: QueryClient,
    /** Bounded per SYSTEM (GC for app-lifetime hosts; a scene never nears it). */
    systemCap: number = DEFAULT_SYSTEM_CAP,
  ) {
    this.plans = new LruMap(systemCap);
    this.resolved = new LruMap(systemCap);
  }

  /** Already-fetched plans for a system, synchronously; null while unknown. */
  peek(systemId: string): readonly AttributePlanLike[] | null {
    return this.resolved.get(systemId) ?? null;
  }

  /**
   * Drop one system's cached discovery (or everything). For long-lived
   * hosts whose FIELD edges may change under them — the next request
   * re-discovers; a scene's remount-freshness contract never needs this.
   */
  invalidate(systemId?: string): void {
    if (systemId === undefined) {
      this.plans.drain();
      this.resolved.drain();
      return;
    }
    this.plans.take(systemId);
    this.resolved.take(systemId);
  }

  get(systemId: string): Promise<readonly AttributePlanLike[]> {
    let pending = this.plans.get(systemId);
    if (!pending) {
      const variables: AttributePlansQueryVariables = {
        system: systemId,
        maxJoinDepth: PLAN_JOIN_DEPTH,
      };
      pending = this.client
        .query({ query: AttributePlansDocument, variables })
        .then((result) => {
          const plans = toStructuralPlans(result.data?.attributePlans ?? []);
          if (plans.length === 0) {
            // The one silent way the feature can "do nothing": make it loud.
            console.warn(
              `[attributePlans] system ${systemId}: no plans discovered — ` +
                `nothing links this system to a table or matrix (negative-cached for this scene)`,
            );
          } else {
            console.debug(
              `[attributePlans] system ${systemId}: ${plans.length} plan(s)`,
              plans.map((plan) => ({
                chain: plan.hops.map((hop) => {
                  const source = hopSource(hop);
                  return `${source.kind.toLowerCase()}:${source.name}`;
                }),
                pathSteps: plan.path.map(
                  (step) =>
                    `${step.inverted ? "~" : ""}${step.transformation?.__typename ?? "?"}`,
                ),
                consumes: plan.sample.consumes,
                passthrough: plan.sample.passthrough,
              })),
            );
          }
          this.resolved.set(systemId, plans);
          return plans;
        })
        .catch((error) => {
          this.plans.take(systemId); // do not cache failures
          console.warn(`[attributePlans] system ${systemId}: discovery failed`, error);
          throw error;
        });
      this.plans.set(systemId, pending);
    }
    return pending;
  }
}

const DEFAULT_TABLE_CAP = 32;

/**
 * What a picked row of a table reaches (`rowPlan`), memoized per table. A
 * row's plan takes no id — the same plan serves every row — so it is fetched
 * once and executed per pick. A refusal (a table not keyed by one INDEX
 * column) rejects with the server's own message and is not cached, like any
 * failure: a later pick asks again.
 */
export class RowPlanCache {
  private plans: LruMap<Promise<RowPlanLike | null>>;
  /** Wrapped, so a table whose plan is null (nothing executable) is still known. */
  private resolved: LruMap<{ plan: RowPlanLike | null }>;

  constructor(
    private readonly client: QueryClient<RowPlanQuery>,
    tableCap: number = DEFAULT_TABLE_CAP,
  ) {
    this.plans = new LruMap(tableCap);
    this.resolved = new LruMap(tableCap);
  }

  /** The settled plan for a table, synchronously: undefined while unknown, null when nothing is executable. */
  peek(tableId: string): RowPlanLike | null | undefined {
    return this.resolved.get(tableId)?.plan;
  }

  invalidate(tableId?: string): void {
    if (tableId === undefined) {
      this.plans.drain();
      this.resolved.drain();
      return;
    }
    this.plans.take(tableId);
    this.resolved.take(tableId);
  }

  get(tableId: string): Promise<RowPlanLike | null> {
    let pending = this.plans.get(tableId);
    if (!pending) {
      const variables: RowPlanQueryVariables = { table: tableId, maxJoinDepth: PLAN_JOIN_DEPTH };
      pending = this.client
        .query({ query: RowPlanDocument, variables })
        .then((result) => {
          const fragment = result.data?.rowPlan;
          const plan = fragment ? toRowPlan(fragment) : null;
          this.resolved.set(tableId, { plan });
          return plan;
        })
        .catch((error) => {
          this.plans.take(tableId);
          throw error;
        });
      this.plans.set(tableId, pending);
    }
    return pending;
  }
}
