import { useRekuest } from "@/rekuest/api/hooks";
import type { ApolloClient } from "@apollo/client";
import { applyPatch } from "fast-json-patch";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  WatchAgentDocument,
  WatchStateDocument,
  type WatchAgentSubscription,
  type WatchAgentSubscriptionVariables,
  type WatchStateSubscription,
  type WatchStateSubscriptionVariables,
} from "../api/graphql";
import type { RekuestSession } from "../session/client";
import {
  materialize,
  toStatePatchEvent,
  toStateSnapshotEvent,
  type StatesSnapshot,
  type WirePatch,
} from "../session/frames";
import { useFeedSource, useRekuestSession } from "../session/hooks";
import { createLiveStateStore, EMPTY_LIVE_STATE, toOperations } from "./liveStateStore";

/**
 * One `WatchState` subscription per `(agentID, interface)` shared by every
 * consumer, patches coalesced to one publish per animation frame — see
 * `./liveStateStore.ts`. The client is the same one the generated
 * `useWatchStateSubscription` uses (`lib/rekuest/hooks.tsx` → `useRekuest()`).
 */
/** Where a state is followed from: the window's session, or a GraphQL subscription. */
type LiveStateSource = {
  apollo: ApolloClient<unknown>;
  session: RekuestSession;
  source: "session" | "graphql";
};

const agentLiveStateStore = createLiveStateStore<LiveStateSource>({
  subscribe: ({ apollo, session, source }, variables, handlers) => {
    if (source === "session") {
      // The state over the session: its snapshot (applied on top of the newest checkpoint),
      // then each patch; a resume replays the patches missed.
      return session.watch(`state:${variables.agentID}/${variables.interface}`, {
        onData: (item) => {
          const patch = toStatePatchEvent(item as WirePatch);
          handlers.next({
            __typename: "StatePatchEvent",
            ops: patch.ops,
            globalRevision: patch.globalRevision,
          });
        },
        onResync: (snapshot) => {
          const event = toStateSnapshotEvent(snapshot as StatesSnapshot, variables.interface);
          handlers.next({
            __typename: "StateSnapshotEvent",
            value: event?.value ?? null,
            globalRevision: event?.globalRevision ?? 0,
          });
        },
        onRefused: (error) => handlers.error(new Error(error)),
      });
    }
    const subscription = apollo
      .subscribe<WatchStateSubscription, WatchStateSubscriptionVariables>({
        query: WatchStateDocument,
        variables: { agentID: variables.agentID, interface: variables.interface },
      })
      .subscribe({
        next: (result) => {
          const event = result.data?.watchState;
          if (event) handlers.next(event);
        },
        error: handlers.error,
      });
    return () => subscription.unsubscribe();
  },
});

export const useAgentLiveState = ({
  agentID,
  stateInterface,
  skip,
}: {
  agentID?: string;
  stateInterface?: string;
  skip?: boolean;
}) => {
  const client = useRekuest();
  const session = useRekuestSession();
  const source = useFeedSource(session);
  const active =
    !skip && !!agentID && !!stateInterface && !!client && source !== "pending";

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!active) return () => {};
      return agentLiveStateStore.acquire(
        { apollo: client, session, source },
        agentID as string,
        stateInterface as string,
        onStoreChange,
      );
    },
    [active, client, session, source, agentID, stateInterface],
  );
  const getSnapshot = useCallback(
    () =>
      active
        ? agentLiveStateStore.getSnapshot(agentID as string, stateInterface as string)
        : EMPTY_LIVE_STATE,
    [active, agentID, stateInterface],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    value: snapshot.value,
    revision: snapshot.revision,
  };
}



export const useAgentStates = ({
  agentID
}: {
  agentID: string;
}) => {
  const client = useRekuest();
  const session = useRekuestSession();
  const source = useFeedSource(session);
  const [liveValue, setLiveValue] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const valueRef = useRef<Record<string, Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (!client || !agentID || source === "pending") return undefined;

    const onSnapshot = (values: Record<string, Record<string, unknown>>, rev: number) => {
      valueRef.current = values;
      setLiveValue(values);
      setRevision(rev);
    };
    const onPatch = (stateKey: string, ops: Parameters<typeof toOperations>[0], rev: number) => {
      // Apply the update to one state entry in the map.
      const currentMap = valueRef.current ?? {};
      const result = applyPatch(currentMap[stateKey] || {}, toOperations(ops), false, false);
      const nextMap = { ...currentMap, [stateKey]: result.newDocument };
      valueRef.current = nextMap;
      setLiveValue(nextMap);
      setRevision(rev);
    };

    if (source === "session") {
      return session.watch(`states:${agentID}`, {
        onData: (item) => {
          const patch = item as WirePatch;
          onPatch(String(patch.state), toStatePatchEvent(patch).ops, patch.global_rev);
        },
        onResync: (snapshot) => {
          const states = snapshot as StatesSnapshot;
          // Keyed by state id, as the GraphQL feed's snapshot is.
          const values: Record<string, Record<string, unknown>> = {};
          for (const state of Object.values(states.states)) {
            values[String(state.state)] = materialize(state.value) as Record<string, unknown>;
          }
          onSnapshot(values, states.global_rev);
        },
      });
    }

    const subscription = client
      .subscribe<WatchAgentSubscription, WatchAgentSubscriptionVariables>({
        query: WatchAgentDocument,
        variables: { agentID },
      })
      .subscribe(({ data }) => {
        const event = data?.watchAgent;
        if (!event) return;
        if (event.__typename === "AgentSnapshotEvent") {
          onSnapshot(event.values, event.globalRevision);
        } else if (event.__typename === "StatePatchEvent") {
          onPatch(event.stateId, event.ops, event.globalRevision);
        }
      });
    return () => subscription.unsubscribe();
  }, [client, agentID, session, source]);

  return {
    value: liveValue,
    revision,
  };
};
