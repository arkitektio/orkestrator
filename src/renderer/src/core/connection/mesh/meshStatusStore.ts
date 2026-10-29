import type { MeshPingResult, MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshBridge, type MeshBridge } from "./bridge";

/**
 * The mesh as main reports it, once per window.
 *
 * Every reader — the settings page, the gates the provider waits on, the
 * doctor, the progress strip — reads this one store instead of opening its
 * own subscription. It binds to the bridge while anyone listens: events
 * first, then one `status()`, so a change between the two is not lost; and
 * it keeps the payload with the highest `seq`, so an invoke result that
 * arrives after a newer broadcast cannot roll it back.
 *
 * Ping attempts are a slice of their own: a ping does not re-render readers
 * of the status.
 */

export type MeshStatusState = {
  payload?: MeshStatusPayload;
  /** Asking main for the status failed. */
  error?: string;
};

export type MeshStatusStore = {
  /** False in a build without the mesh bridge (the browser). */
  available: boolean;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => MeshStatusState;
  /** The latest payload; asks main once when nobody is listening yet. */
  load: () => Promise<MeshStatusPayload | undefined>;
  /** A payload main answered an invoke with (claim, join, restart). */
  accept: (payload: MeshStatusPayload | undefined) => void;
  subscribePings: (listener: () => void) => () => void;
  /** Latest attempt per `<meshId>::<target>`. */
  getPings: () => Record<string, MeshPingResult>;
  setPing: (meshId: string, result: MeshPingResult) => void;
};

const EMPTY: MeshStatusState = {};
const NO_PINGS: Record<string, MeshPingResult> = {};

export const createMeshStatusStore = (bridge: MeshBridge | undefined): MeshStatusStore => {
  let state: MeshStatusState = EMPTY;
  let pings = NO_PINGS;
  const listeners = new Set<() => void>();
  const pingListeners = new Set<() => void>();
  let unbind: (() => void) | undefined;

  const set = (next: MeshStatusState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const accept = (payload: MeshStatusPayload | undefined) => {
    if (!payload) return;
    if (state.payload && payload.seq < state.payload.seq) return;
    set({ payload });
  };

  const setPing = (meshId: string, result: MeshPingResult) => {
    pings = { ...pings, [`${meshId}::${result.target}`]: result };
    pingListeners.forEach((listener) => listener());
  };

  const fetchStatus = (): Promise<MeshStatusPayload | undefined> =>
    bridge
      ? bridge.status().then(
          (payload) => {
            accept(payload);
            return state.payload;
          },
          (cause) => {
            set({ ...state, error: String(cause) });
            return state.payload;
          },
        )
      : Promise.resolve(undefined);

  const bind = () => {
    if (unbind || !bridge) return;
    unbind = bridge.onEvent((event) => {
      if (event.type === "status") accept(event.payload);
      if (event.type === "ping") setPing(event.meshId, event.result);
    });
    void fetchStatus();
  };

  const release = () => {
    if (listeners.size > 0 || pingListeners.size > 0) return;
    unbind?.();
    unbind = undefined;
  };

  return {
    available: !!bridge,
    subscribe: (listener) => {
      listeners.add(listener);
      bind();
      return () => {
        listeners.delete(listener);
        release();
      };
    },
    getSnapshot: () => state,
    load: () => (unbind && state.payload ? Promise.resolve(state.payload) : fetchStatus()),
    accept,
    subscribePings: (listener) => {
      pingListeners.add(listener);
      bind();
      return () => {
        pingListeners.delete(listener);
        release();
      };
    },
    getPings: () => pings,
    setPing,
  };
};

let shared: MeshStatusStore | undefined;

/** This window's store, made on first use. */
export const meshStatusStore = (): MeshStatusStore => (shared ??= createMeshStatusStore(meshBridge()));

/** Tests only: the next `meshStatusStore()` binds to whatever bridge is there then. */
export const resetMeshStatusStore = () => {
  shared = undefined;
};
