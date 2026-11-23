import { applyPatch } from "fast-json-patch";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RekuestSession } from "../session/client";
import {
  materialize,
  toStatePatchEvent,
  toStateSnapshotEvent,
  type StatesSnapshot,
  type WirePatch,
} from "../session/frames";
import { useRekuestSession } from "../session/hooks";
import { createLiveStateStore, EMPTY_LIVE_STATE, toOperations } from "./liveStateStore";

/**
 * One subscription per `(agentID, interface)` shared by every consumer, patches
 * coalesced to one publish per animation frame (`./liveStateStore.ts`), over the
 * window's caller session: the state's snapshot (its newest checkpoint with the
 * patches after it applied), then each patch; a resume replays the patches missed.
 */
const agentLiveStateStore = createLiveStateStore<RekuestSession>({
  subscribe: (session, variables, handlers) =>
    session.watch(`state:${variables.agentID}/${variables.interface}`, {
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
    }),
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
  const session = useRekuestSession();
  const active = !skip && !!agentID && !!stateInterface;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!active) return () => {};
      return agentLiveStateStore.acquire(
        session,
        agentID as string,
        stateInterface as string,
        onStoreChange,
      );
    },
    [active, session, agentID, stateInterface],
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
  const session = useRekuestSession();
  const [liveValue, setLiveValue] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const valueRef = useRef<Record<string, Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (!agentID) return undefined;

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

    return session.watch(`states:${agentID}`, {
      onData: (item) => {
        const patch = item as WirePatch;
        onPatch(String(patch.state), toStatePatchEvent(patch).ops, patch.global_rev);
      },
      onResync: (snapshot) => {
        const states = snapshot as StatesSnapshot;
        // Keyed by state id, as the states page reads them.
        const values: Record<string, Record<string, unknown>> = {};
        for (const state of Object.values(states.states)) {
          values[String(state.state)] = materialize(state.value) as Record<string, unknown>;
        }
        onSnapshot(values, states.global_rev);
      },
    });
  }, [agentID, session]);

  return {
    value: liveValue,
    revision,
  };
};
