import type { ApolloClient } from "@apollo/client";
import { useEffect, useRef } from "react";
import {
  RuleChangeFragment,
  useWatchSchedulesSubscription,
  useWatchSignalsSubscription,
  useWatchTriggersSubscription,
} from "../api/graphql";

type RuleEvent = {
  create?: RuleChangeFragment | null;
  update?: RuleChangeFragment | null;
  delete?: string | null;
};

/**
 * `fn`, at most once per `wait`, on the trailing edge: a burst of events
 * (a schedule firing, its run finishing) becomes one refetch.
 */
const useTrailing = (fn: (() => void) | undefined, wait = 1000) => {
  const latest = useRef(fn);
  latest.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return () => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current?.();
    }, wait);
  };
};

/**
 * A `RuleChange` is not a `Schedule` / `Trigger`, so it does not normalize
 * onto the rule: write its fields there by hand. A deleted rule leaves the
 * cache, and every list holding it with it.
 */
const applyRuleEvent = (
  client: ApolloClient<unknown>,
  typename: "Schedule" | "Trigger",
  event: RuleEvent | undefined,
) => {
  if (!event) return;
  const change = event.update;
  if (change) {
    client.cache.modify({
      id: client.cache.identify({ __typename: typename, id: change.id }),
      fields: {
        name: () => change.name,
        enabled: () => change.enabled,
        consecutiveFailures: () => change.consecutiveFailures,
        lastError: () => change.lastError ?? null,
        runCount: () => change.runCount,
        lastFiredAt: () => change.lastFiredAt ?? null,
        updatedAt: () => change.updatedAt,
      },
    });
  }
  if (event.delete) {
    client.cache.evict({ id: client.cache.identify({ __typename: typename, id: event.delete }) });
    client.cache.gc();
  }
};

/**
 * Keeps the rules on screen current while the page is open: a rule's
 * standing moves in place, a deleted rule disappears. `onChange` is the
 * page's refetch, for what an event does not carry (a new rule, the run a
 * firing created). Mounted by the pages that show rules, not app-wide.
 */
export const useRuleUpdates = (onChange?: () => void) => {
  const changed = useTrailing(onChange);
  useWatchSchedulesSubscription({
    onData: ({ client, data }) => {
      applyRuleEvent(client, "Schedule", data.data?.schedules);
      changed();
    },
  });
  useWatchTriggersSubscription({
    onData: ({ client, data }) => {
      applyRuleEvent(client, "Trigger", data.data?.triggers);
      changed();
    },
  });
};

/**
 * A signal arrived or was processed: the feeds are filtered by the server,
 * so the page refetches rather than guess where the signal belongs.
 */
export const useSignalUpdates = (onChange: () => void) => {
  const changed = useTrailing(onChange);
  useWatchSignalsSubscription({ onData: () => changed() });
};
