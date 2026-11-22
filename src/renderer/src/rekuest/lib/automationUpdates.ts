import type { ApolloClient } from "@apollo/client";
import { useEffect, useRef } from "react";
import {
  RuleChangeFragment,
  SignalChangeFragment,
  SignalFilter,
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
 *
 * Returns whether the lists must be asked again: for a new rule (it is not in
 * any list yet), and for a change to what the lists are ordered and filtered
 * by (`consecutiveFailures` orders FAILING_FIRST and decides `failing`;
 * `enabled`). Any other change was just written in place.
 */
export const applyRuleEvent = (
  client: ApolloClient<unknown>,
  typename: "Schedule" | "Trigger",
  event: RuleEvent | undefined,
): boolean => {
  if (!event) return false;
  if (event.create) return true;
  let moved = false;
  const change = event.update;
  if (change) {
    const id = client.cache.identify({ __typename: typename, id: change.id });
    client.cache.modify({
      id,
      fields: {
        name: () => change.name,
        enabled: (previous: boolean) => {
          if (previous !== change.enabled) moved = true;
          return change.enabled;
        },
        consecutiveFailures: (previous: number) => {
          if (previous !== change.consecutiveFailures) moved = true;
          return change.consecutiveFailures;
        },
        lastError: () => change.lastError ?? null,
        runCount: () => change.runCount,
        lastFiredAt: () => change.lastFiredAt ?? null,
        updatedAt: () => change.updatedAt,
      },
    });
  }
  if (event.delete) {
    // Evict only: lists drop the dangling reference on read; `GcOnNavigate`
    // collects the orphans when idle (a sweep per event is a full traversal).
    client.cache.evict({ id: client.cache.identify({ __typename: typename, id: event.delete }) });
  }
  return moved;
};

/**
 * Keeps the rules on screen current while the page is open: a rule's
 * standing moves in place, a deleted rule disappears. `onChange` is the
 * page's refetch, called only for what an event cannot place (a new rule, a
 * rule whose order or `failing` standing changed). Mounted by the pages that
 * show rules, not app-wide.
 */
export const useRuleUpdates = (onChange?: () => void) => {
  const changed = useTrailing(onChange);
  useWatchSchedulesSubscription({
    onData: ({ client, data }) => {
      if (applyRuleEvent(client, "Schedule", data.data?.schedules)) changed();
    },
  });
  useWatchTriggersSubscription({
    onData: ({ client, data }) => {
      if (applyRuleEvent(client, "Trigger", data.data?.triggers)) changed();
    },
  });
};

type SignalEvent = { create?: SignalChangeFragment | null; update?: SignalChangeFragment | null };

/** What a signal feed is narrowed to, of what a `SignalChange` carries. */
export type SignalFeedFilter = Pick<SignalFilter, "kind" | "identifier" | "object" | "service" | "matched" | "processed">;

/** Whether a signal could stand in a feed with these filters (`search` is the server's: it is not ruled out here). */
export const signalMayMatch = (change: SignalChangeFragment, filters: SignalFeedFilter): boolean => {
  if (filters.kind && filters.kind.length > 0 && !filters.kind.includes(change.kind)) return false;
  if (filters.identifier && filters.identifier !== change.identifier) return false;
  if (filters.object && filters.object !== change.object) return false;
  if (filters.service && filters.service !== change.service) return false;
  if (filters.matched === true && change.fired === 0) return false;
  if (filters.matched === false && change.fired > 0) return false;
  if (filters.processed === true && !change.processedAt) return false;
  if (filters.processed === false && change.processedAt) return false;
  return true;
};

/**
 * Whether the signal feed must be asked again: a signal that arrived and may
 * belong in it, or one that was matched and may now be (or show runs) in it.
 * A processed signal that fired nothing keeps its row; its `processedAt` is
 * written in place.
 */
export const signalFeedNeedsRefetch = (event: SignalEvent | undefined, filters: SignalFeedFilter): boolean => {
  if (!event) return false;
  if (event.create) return signalMayMatch(event.create, filters);
  const change = event.update;
  if (!change) return false;
  if (!signalMayMatch(change, filters)) return false;
  return change.fired > 0 || filters.matched !== undefined || filters.processed !== undefined;
};

/** A firing is made when triggers are matched against a signal: an `update`, never an arrival. */
export const firingFeedNeedsRefetch = (event: SignalEvent | undefined): boolean => !!event?.update;

const writeProcessedAt = (client: ApolloClient<unknown>, event: SignalEvent | undefined) => {
  const change = event?.update;
  if (!change) return;
  client.cache.modify({
    id: client.cache.identify({ __typename: "Signal", id: change.id }),
    fields: { processedAt: () => change.processedAt ?? null },
  });
};

/**
 * A signal arrived or was processed: the page refetches when `needsRefetch`
 * says the event may change what it shows; otherwise the processed time is
 * written onto the cached signal.
 */
export const useSignalUpdates = (onChange: () => void, needsRefetch: (event: SignalEvent | undefined) => boolean) => {
  const changed = useTrailing(onChange);
  useWatchSignalsSubscription({
    onData: ({ client, data }) => {
      const event = data.data?.signals;
      writeProcessedAt(client, event);
      if (needsRefetch(event)) changed();
    },
  });
};
