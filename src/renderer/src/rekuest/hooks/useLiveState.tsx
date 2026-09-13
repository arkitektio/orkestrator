import { useRekuest } from "@/app/Arkitekt";
import type { ApolloClient } from "@apollo/client";
import { applyPatch } from "fast-json-patch";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  useCheckoutQuery,
  useWatchAgentSubscription,
  useWatchStateSubscription,
  WatchStateDocument,
  type WatchStateSubscription,
  type WatchStateSubscriptionVariables,
} from "../api/graphql";
import { createLiveStateStore, EMPTY_LIVE_STATE } from "./liveStateStore";

export const useLiveState = ({
  stateID
}: {
  stateID: string;
}) => {
  // Start from the latest checkout as our base
    const { data: checkoutData, error: checkoutError } = useCheckoutQuery({
      variables: { state: stateID },
    });

    const [liveValue, setLiveValue] = useState<Record<string, unknown> | null>(null);
    const [revision, setRevision] = useState<number | null>(null);
    const valueRef = useRef<Record<string, unknown> | null>(null);

    const checkoutValue = checkoutData?.checkout?.value;

    const currentLiveValue = liveValue ?? checkoutValue

    // Subscribe to live patches
    useWatchStateSubscription({
      variables: { stateID: stateID },
      onData: ({ data: subData }) => {
        const event = subData.data?.watchState;
        if (!event) return;

        // Lazily initialize the ref from checkout on first patch
        if (valueRef.current === null && checkoutValue) {
          valueRef.current = checkoutValue;
        }

        if (event.__typename === "StateSnapshotEvent") {
          // Full snapshot replaces the value
          valueRef.current = event.value;
          setLiveValue({ ...event.value });
          setRevision(event.globalRevision);
        } else if (event.__typename === "StatePatchEvent") {
          // Apply JSON patch to current value
          if (valueRef.current) {
            const result = applyPatch(
              valueRef.current,
              [{ op: event.op as "replace" | "add" | "remove", path: event.path, value: event.value }],
              false,
              false,
            );
            valueRef.current = result.newDocument;
            setLiveValue({ ...result.newDocument });
            setRevision(event.globalRevision);
          }
        }
      },
      onError: (err) => {
        console.error("Error in state subscription:", err);
      }
    });


  return {
    value: currentLiveValue,
    revision,
    error: checkoutError,
  };
}



/**
 * One `WatchState` subscription per `(agentID, interface)` shared by every
 * consumer, patches coalesced to one publish per animation frame — see
 * `./liveStateStore.ts`. The client is the same one the generated
 * `useWatchStateSubscription` uses (`lib/rekuest/hooks.tsx` → `useRekuest()`).
 */
const agentLiveStateStore = createLiveStateStore<ApolloClient<unknown>>({
  subscribe: (client, variables, handlers) => {
    const subscription = client
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
  const active = !skip && !!agentID && !!stateInterface && !!client;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!active) return () => {};
      return agentLiveStateStore.acquire(
        client,
        agentID as string,
        stateInterface as string,
        onStoreChange,
      );
    },
    [active, client, agentID, stateInterface],
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

    const [liveValue, setLiveValue] = useState<Record<string, Record<string, unknown>> | null>(null);
    const [revision, setRevision] = useState<number | null>(null);
    const valueRef = useRef<Record<string, Record<string, unknown>> | null>(null);


    // Subscribe to live patches
    useWatchAgentSubscription({
      variables: { agentID: agentID },
      onData: ({ data: subData }) => {
        const event = subData.data?.watchAgent;
        if (!event) return;


        if (event.__typename === "AgentSnapshotEvent") {
          valueRef.current = event.values;
          setLiveValue(valueRef.current);
          setRevision(event.globalRevision);
        } else if (event.__typename === "StatePatchEvent") {
          // Apply JSON patch to one state entry in the map
          const currentMap = valueRef.current ?? {};
          const result = applyPatch(
            currentMap[event.stateId] || {},
            [{ op: event.op as "replace" | "add" | "remove", path: event.path, value: event.value }],
            false,
            false,
          );
          const nextMap = {
            ...currentMap,
            [event.stateId]: result.newDocument,
          };
          valueRef.current = nextMap;
          setLiveValue(nextMap);
          setRevision(event.globalRevision);
        }
      },
    });


  return {
    value: liveValue,
    revision,
  };
}
