import { useRekuest } from "@/rekuest/api/hooks";
import type { ApolloClient, Reference } from "@apollo/client";
import { useEffect } from "react";
import {
  AgentChangeEventFragment,
  AgentChangeFragment,
  WatchAgentsDocument,
  WatchAgentsSubscription,
  WatchAgentsSubscriptionVariables,
} from "../../api/graphql";

type RekuestClient = ApolloClient<unknown>;

/**
 * The agent lists the server filters (pinned, by dependency, by user, by
 * client, …). A new agent is not written into them: whether it belongs to
 * a filtered list is the server's to say, so the lists on screen are asked
 * again instead.
 */
export const AGENT_LIST_QUERIES = [
  "Agents",
  "AgentCounts",
  "Pinned",
  "ProfileFeedAgents",
  "AgentForDependency",
];

/**
 * The lists whose rows depend on what an agent registered (the agents that
 * fit a dependency): an agent coming back may bring other implementations.
 */
export const AGENT_REGISTRATION_QUERIES = ["AgentForDependency"];

/**
 * An agent `update` is a non-traversable `AgentChange` (`__typename:
 * "AgentChange"`), so it does NOT auto-normalize into the `Agent:<id>` entity.
 * Write its hot scalars onto the normalized agent explicitly — any list/detail
 * query referencing it updates in place. Returns whether the agent came
 * back (was cached as not connected and is connected now).
 */
export const applyAgentScalars = (
  client: RekuestClient,
  change: AgentChangeFragment,
): boolean => {
  let reconnected = false;
  client.cache.modify({
    id: client.cache.identify({ __typename: "Agent", id: change.id }),
    fields: {
      name: () => change.name,
      connected: (previous: boolean) => {
        if (!previous && change.connected) reconnected = true;
        return change.connected;
      },
      blocked: () => change.blocked,
      lastSeen: () => change.lastSeen ?? null,
    },
  });
  return reconnected;
};

/** A deleted agent leaves every list: no list can still hold it. */
export const removeAgentFromLists = (client: RekuestClient, id: string) => {
  client.cache.modify({
    fields: {
      agents(existing, { readField }) {
        const list: readonly Reference[] = Array.isArray(existing) ? existing : [];
        return list.filter((ref) => readField("id", ref) !== id);
      },
    },
  });
};

/**
 * Which lists an agents-feed event asks again: none for a plain update
 * (written in place), the registration-dependent ones when an agent comes
 * back, all of them for a new agent.
 */
export const agentListsToRefetch = (
  event: AgentChangeEventFragment | undefined,
  reconnected: boolean,
): readonly string[] => {
  if (event?.create) return AGENT_LIST_QUERIES;
  if (event?.update && reconnected) return AGENT_REGISTRATION_QUERIES;
  return [];
};

const REFETCH_DEBOUNCE_MS = 750;

export const AgentUpdater = () => {
  const client = useRekuest();

  useEffect(() => {
    if (!client) return undefined;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<string>();
    const scheduleRefetch = (names: readonly string[]) => {
      if (names.length === 0) return;
      names.forEach((name) => pending.add(name));
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = undefined;
        const include = [...pending];
        pending.clear();
        void client.refetchQueries({ include }).catch(() => undefined);
      }, REFETCH_DEBOUNCE_MS);
    };

    const subscription = client
      .subscribe<WatchAgentsSubscription, WatchAgentsSubscriptionVariables>({
        query: WatchAgentsDocument,
        variables: {},
      })
      .subscribe((res) => {
        const event = res.data?.agents;
        const reconnected = event?.update ? applyAgentScalars(client, event.update) : false;
        if (event?.delete) removeAgentFromLists(client, event.delete);
        scheduleRefetch(agentListsToRefetch(event, reconnected));
      });

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [client]);

  return <></>;
};
