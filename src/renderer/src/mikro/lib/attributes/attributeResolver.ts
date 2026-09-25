import type {
  AttributeFetchKey,
  AttributePlanLike,
  PlanRowsState,
} from "./attributeTypes";
import { attributeKeyId, planIdentity } from "./attributeTypes";

/**
 * Hover-loop orchestration for attribute plans, modeled on
 * `exactValueResolver`: latest-wins per probed point, per-HOP incremental
 * delivery as each lookup of each plan's chain settles, and stale
 * settlements dropped before they reach the store. Where the exact-value resolver funnels ONE fetch, this one
 * fans out over every plan of the probed system — but a request that is no
 * longer the newest never starts (or delivers) work: `isStale` is threaded
 * into the executor so even a queued DuckDB query can bail before issuing.
 *
 * Pure and dependency-injected; the tracker wires `resolvePlans` to the plan
 * cache, `executePlan` to sample+lookup, and `begin`/`deliver` to the store.
 */

export type AttributeResolver<K extends AttributeFetchKey = AttributeFetchKey> = {
  request(key: K): void;
  dispose(): void;
};

export function createAttributeResolver<K extends AttributeFetchKey>(deps: {
  /** Cached plan discovery for the probed system; null = none / unavailable. */
  resolvePlans: (key: K) => Promise<readonly AttributePlanLike[] | null>;
  /**
   * Sample + chain for one plan, delivering each hop through `deliver` as it
   * settles. `isStale` becomes true the moment a newer request supersedes
   * this one — check it before expensive work and never deliver after it.
   * Resolving means "done (or dropped)"; a rejection is a bug in the
   * executor (it reports per-hop errors itself) and is logged, not delivered.
   */
  executePlan: (
    key: K,
    plan: AttributePlanLike,
    isStale: () => boolean,
    deliver: (hopKey: string, state: PlanRowsState) => void,
  ) => Promise<unknown>;
  /** A new point's plans are known: mark their hops pending in the store. */
  begin: (key: K, plans: readonly AttributePlanLike[]) => void;
  deliver: (key: K, hopKey: string, state: PlanRowsState) => void;
}): AttributeResolver<K> {
  let disposed = false;
  /** Id of the most recent request — only its work may begin or deliver. */
  let latestId: string | null = null;

  const run = async (key: K, id: string) => {
    const isStale = () => disposed || latestId !== id;
    let plans: readonly AttributePlanLike[] | null = null;
    try {
      plans = await deps.resolvePlans(key);
    } catch {
      return; // Discovery failure: a later request may retry.
    }
    if (isStale() || plans === null) return;

    // Empty discovery still BEGINS: the store's key moves to this point with
    // an empty plan set, so a previous point's attributes never linger as if
    // they belonged here.
    deps.begin(key, plans);
    if (plans.length === 0) return;
    for (const plan of plans) {
      deps
        .executePlan(key, plan, isStale, (hopKey, state) => {
          if (!isStale()) deps.deliver(key, hopKey, state);
        })
        .catch((error) => {
          console.warn(`[attributePlans] plan ${planIdentity(plan)} failed to execute`, error);
        });
    }
  };

  return {
    request(key: K) {
      if (disposed) return;
      const id = attributeKeyId(key);
      if (id === latestId) return; // Dedupe: already newest.
      latestId = id;
      void run(key, id);
    },
    dispose() {
      disposed = true;
    },
  };
}
