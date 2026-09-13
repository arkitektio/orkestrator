import { useRekuest } from "@/app/Arkitekt";
import type { ApolloClient, Reference } from "@apollo/client";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  AgentChangeFragment,
  HydrateAgentDocument,
  HydrateAgentQuery,
  HydrateAgentQueryVariables,
  useAgentQuery,
  WatchAgentsDocument,
  WatchAgentsSubscription,
  WatchAgentsSubscriptionVariables,
} from "../../api/graphql";

type RekuestClient = ApolloClient<unknown>;

/**
 * An agent `update` is a non-traversable `AgentChange` (`__typename:
 * "AgentChange"`), so it does NOT auto-normalize into the `Agent:<id>` entity.
 * Write its hot scalars onto the normalized agent explicitly — any list/detail
 * query referencing it updates in place.
 */
const applyAgentScalars = (
  client: RekuestClient,
  change: AgentChangeFragment,
) => {
  client.cache.modify({
    id: client.cache.identify({ __typename: "Agent", id: change.id }),
    fields: {
      name: () => change.name,
      connected: () => change.connected,
      blocked: () => change.blocked,
      lastSeen: () => change.lastSeen ?? null,
    },
  });
};

/**
 * A new agent arrives non-traversable, so fetch its full (list-shaped) graph
 * once and insert it into the Agents list cache.
 */
const hydrateAndInsertAgent = async (client: RekuestClient, id: string) => {
  let agent;
  try {
    const res = await client.query<
      HydrateAgentQuery,
      HydrateAgentQueryVariables
    >({
      query: HydrateAgentDocument,
      variables: { id },
      fetchPolicy: "network-only",
    });
    agent = res.data?.agent;
  } catch (error) {
    console.error("Failed to hydrate agent", id, error);
    return;
  }
  if (!agent) return;

  // `cache.modify` on the root field reaches EVERY cached `agents(...)`
  // variant (the list pages query with pagination variables). `updateQuery`
  // without variables only touched the unpaginated entry, which nothing
  // displays.
  const hydrated = agent;
  client.cache.modify({
    fields: {
      agents(existing, { readField, toReference }) {
        const list: readonly Reference[] = Array.isArray(existing) ? existing : [];
        if (list.some((ref) => readField("id", ref) === hydrated.id)) {
          return list;
        }
        const ref = toReference(hydrated, true);
        return ref ? [...list, ref] : list;
      },
    },
  });
};

export const AgentToatser = (_props: { id: string }) => {
  const { data } = useAgentQuery({});

  return (
    <div className="h-full relative w-full overflow-hidden group p-2">
      {data?.agent?.name} is now{" "}
      {data?.agent.connected ? "connected" : "disconnected"}
    </div>
  );
};

export const AgentUpdater = (_props: {}) => {
  const client = useRekuest();

  useEffect(() => {
    if (client) {
      const subscription = client
        ?.subscribe<WatchAgentsSubscription, WatchAgentsSubscriptionVariables>({
          query: WatchAgentsDocument,
          variables: {},
        })
        .subscribe((res) => {
          const update = res.data?.agents.update;
          const create = res.data?.agents.create;
          const deleted = res.data?.agents.delete;

          if (update) {
            applyAgentScalars(client, update);
          }

          if (create) {
            void hydrateAndInsertAgent(client, create.id).then(() => {
              const toastId = create.id;
              toast(<AgentToatser id={toastId} />, {
                id: toastId,
                duration: 300,
                dismissible: true,
              });
            });
          }

          if (deleted) {
            client.cache.modify({
              fields: {
                agents(existing, { readField }) {
                  const list: readonly Reference[] = Array.isArray(existing) ? existing : [];
                  return list.filter((ref) => readField("id", ref) !== deleted);
                },
              },
            });
          }
        });

      return () => subscription.unsubscribe();
    }
    return undefined;
  }, [client]);

  return <></>;
};
