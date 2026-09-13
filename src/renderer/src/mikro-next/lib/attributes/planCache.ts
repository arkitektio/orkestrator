import {
  AttributePlanFragment,
  AttributePlanHopFragment,
  AttributePlansDocument,
  AttributePlansQuery,
  AttributePlansQueryVariables,
} from "@/mikro-next/api/graphql";
import type {
  AttributeHopLike,
  AttributePlanLike,
  SparseHopLike,
  TableHopLike,
} from "./attributeTypes";
import { hopSource } from "./attributeTypes";
import { LruMap } from "./lruMap";

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
export type QueryClient = {
  query(options: {
    query: unknown;
    variables?: unknown;
    fetchPolicy?: string;
  }): Promise<{ data?: AttributePlansQuery | null }>;
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
 * `LookupStep` is a flat discriminator over two shapes: TABLE names a parquet
 * store, its key columns and attributes; SPARSE names a matrix layout to
 * slice and the axis the held id binds. These typed filters are where the
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

/**
 * One fragment as a core plan, or null when its landing is not executable.
 * A later hop that is malformed is dropped WITH its descendants (a hop never
 * runs without its parent) and said out loud: a field silently withheld is
 * indistinguishable from one the server never published.
 */
const toStructuralPlan = (fragment: AttributePlanFragment): AttributePlanLike | null => {
  const accepted = new Map<number, AttributeHopLike>();
  const dropped: number[] = [];
  for (const hop of [...fragment.hops].sort((a, b) => a.index - b.index)) {
    const executable = isTableHopFragment(hop) || isSparseHopFragment(hop);
    const parentAccepted = hop.parent === null || hop.parent === undefined || accepted.has(hop.parent);
    if (executable && parentAccepted) accepted.set(hop.index, hop);
    else dropped.push(hop.index);
  }
  if (dropped.length) {
    console.warn(
      `[attributePlans] edge ${fragment.edge.id}: hop(s) ${dropped.join(", ")} ignored — neither a parquet TABLE nor a sliceable SPARSE lookup, or under a hop that was`,
    );
  }
  const landing = accepted.get(0);
  if (!landing) return null;
  return {
    edge: fragment.edge,
    path: fragment.path,
    sample: fragment.sample,
    hops: [...accepted.values()],
  };
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
