import React, { useContext } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { DetailRunFragment, FlowFragment, RunEventFragment } from "../api/graphql";
import { RunState } from "./types";

/**
 * The run state lives in a store, not in the context value: a live run sends
 * events many times a second, and with the state in the value every node of
 * the graph re-rendered on each one. Nodes select their own source's event
 * (`useNodeRunEvent`), so an event re-renders the node it is about.
 */
export type RunStateStore = StoreApi<RunState>;

export const createRunStateStore = (): RunStateStore => createStore<RunState>(() => ({ t: 0 }));

export type TrackRiverContextType = {
  flow?: FlowFragment | null;
  run?: DetailRunFragment | null;
  runStore: RunStateStore;
  setRunState: (state: RunState) => void;
};

const orphanStore = createRunStateStore();

export const TrackRiverContext = React.createContext<TrackRiverContextType>({
  runStore: orphanStore,
  setRunState: () => {
    console.error("TrackRiverContext used outside of a TrackFlow");
  },
});

export const useTrackRiver = () => useContext(TrackRiverContext);

/** Same event for the node: the same one, or one of the same id and kind. */
const sameEvent = (a: RunEventFragment | undefined, b: RunEventFragment | undefined) =>
  a === b || (!!a && !!b && a.id === b.id && a.kind === b.kind);

/** A node's latest run event; re-renders only when that node's event changes. */
export const useNodeRunEvent = (source: string): RunEventFragment | undefined =>
  useStoreWithEqualityFn(
    useTrackRiver().runStore,
    (state) => state.latestBySource?.get(source),
    sameEvent,
  );
