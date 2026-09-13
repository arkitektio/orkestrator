import { applyPatch, type Operation } from "fast-json-patch";

/**
 * A module-level store for agent live state, one websocket subscription per
 * `${agentID}:${interface}` no matter how many widgets watch it.
 *
 * Before this, every `useAgentLiveState` consumer (each `StateChoiceWidget`,
 * each materialized-blok dependency sync) opened its own `WatchState`
 * subscription for the same key and re-rendered on every patch. Here the
 * subscription is refcounted (the last consumer to leave closes it), the
 * patches are applied to the store's copy, and consumers are notified at most
 * once per animation frame through `useSyncExternalStore`.
 *
 * Framework-free on purpose: the Apollo client is handed in by the first
 * subscriber and the actual `client.subscribe` call is injected, so the
 * refcount / coalescing logic is unit-testable without React or Apollo.
 */

export type LiveStateValue = Record<string, unknown>;

export type LiveStateSnapshot = {
  value: LiveStateValue | null;
  revision: number | null;
};

/** The two `watchState` event shapes, structurally (the generated
 *  `__typename` is optional, so it stays optional here). */
export type LiveStateEvent =
  | { __typename?: "StateSnapshotEvent"; value: any; globalRevision: number }
  | {
      __typename?: "StatePatchEvent";
      op: string;
      path: string;
      value?: any;
      globalRevision: number;
    };

export type LiveStateVariables = { agentID: string; interface: string };

/** Open the underlying subscription; return the function that closes it. */
export type LiveStateSubscribe<C> = (
  client: C,
  variables: LiveStateVariables,
  handlers: { next: (event: LiveStateEvent) => void; error: (error: unknown) => void },
) => () => void;

export type LiveStateStoreOptions<C> = {
  subscribe: LiveStateSubscribe<C>;
  /** Frame scheduler (defaults to `requestAnimationFrame`, or a 16 ms timeout
   *  where there is none). Injectable for tests. */
  schedule?: (callback: () => void) => unknown;
  cancel?: (handle: unknown) => void;
};

export const EMPTY_LIVE_STATE: LiveStateSnapshot = Object.freeze({
  value: null,
  revision: null,
});

export const liveStateKey = (agentID: string, stateInterface: string) =>
  `${agentID}:${stateInterface}`;

type Entry = {
  refs: number;
  listeners: Set<() => void>;
  unsubscribe: () => void;
  /** What consumers currently see. Replaced (never mutated) on each flush. */
  snapshot: LiveStateSnapshot;
  /** A full snapshot received since the last flush, if any. */
  pendingSnapshot: LiveStateValue | null | undefined;
  /** Patches received since the last flush (after `pendingSnapshot`, if set). */
  pendingOps: Operation[];
  pendingRevision: number | null;
  frame: unknown | null;
};

const defaultSchedule = (callback: () => void): unknown =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(() => callback())
    : setTimeout(callback, 16);

const defaultCancel = (handle: unknown) => {
  if (typeof cancelAnimationFrame === "function" && typeof handle === "number") {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
};

export const createLiveStateStore = <C>(options: LiveStateStoreOptions<C>) => {
  const schedule = options.schedule ?? defaultSchedule;
  const cancel = options.cancel ?? defaultCancel;
  const entries = new Map<string, Entry>();

  const flush = (entry: Entry) => {
    entry.frame = null;

    let doc =
      entry.pendingSnapshot !== undefined ? entry.pendingSnapshot : entry.snapshot.value;
    // The first patch clones (the published value and the network snapshot
    // must stay untouched); the rest mutate that one clone in place — one
    // deep copy per frame instead of one per patch.
    let owned = false;
    if (doc !== null) {
      for (const op of entry.pendingOps) {
        try {
          doc = applyPatch(doc, [op], false, owned).newDocument;
          owned = true;
        } catch (error) {
          console.warn("[liveState] dropping patch that failed to apply:", op, error);
        }
      }
    }

    entry.pendingSnapshot = undefined;
    entry.pendingOps = [];
    entry.snapshot = {
      value: doc,
      revision: entry.pendingRevision ?? entry.snapshot.revision,
    };
    entry.pendingRevision = null;
    entry.listeners.forEach((listener) => listener());
  };

  const requestFlush = (entry: Entry) => {
    if (entry.frame !== null) return;
    entry.frame = schedule(() => flush(entry));
  };

  const onEvent = (entry: Entry, event: LiveStateEvent) => {
    if (event.__typename === "StateSnapshotEvent") {
      entry.pendingSnapshot = event.value ?? null;
      entry.pendingOps = [];
      entry.pendingRevision = event.globalRevision;
      requestFlush(entry);
      return;
    }
    if (event.__typename === "StatePatchEvent") {
      // A patch without a base to apply it to is meaningless — the server
      // sends a snapshot first, so this only happens for a stray patch.
      const hasBase =
        entry.pendingSnapshot !== undefined
          ? entry.pendingSnapshot !== null
          : entry.snapshot.value !== null;
      if (!hasBase) return;
      entry.pendingOps.push({
        op: event.op as "replace" | "add" | "remove",
        path: event.path,
        value: event.value,
      } as Operation);
      entry.pendingRevision = event.globalRevision;
      requestFlush(entry);
    }
  };

  return {
    /**
     * Start watching `(agentID, interface)`; `listener` is called after every
     * flush. Returns the release function. The subscription is opened on the
     * first acquire of a key and closed on its last release.
     */
    acquire(
      client: C,
      agentID: string,
      stateInterface: string,
      listener: () => void,
    ): () => void {
      const key = liveStateKey(agentID, stateInterface);
      let entry = entries.get(key);
      if (!entry) {
        const created: Entry = {
          refs: 0,
          listeners: new Set(),
          unsubscribe: () => {},
          snapshot: EMPTY_LIVE_STATE,
          pendingSnapshot: undefined,
          pendingOps: [],
          pendingRevision: null,
          frame: null,
        };
        entries.set(key, created);
        created.unsubscribe = options.subscribe(
          client,
          { agentID, interface: stateInterface },
          {
            next: (event) => onEvent(created, event),
            error: (error) => console.error("Error in state subscription:", error),
          },
        );
        entry = created;
      }
      const current = entry;
      current.refs += 1;
      current.listeners.add(listener);

      let released = false;
      return () => {
        if (released) return;
        released = true;
        current.listeners.delete(listener);
        current.refs -= 1;
        if (current.refs > 0) return;
        if (current.frame !== null) {
          cancel(current.frame);
          current.frame = null;
        }
        current.unsubscribe();
        if (entries.get(key) === current) entries.delete(key);
      };
    },

    /** Stable between flushes, so it is safe as a `useSyncExternalStore` snapshot. */
    getSnapshot(agentID: string, stateInterface: string): LiveStateSnapshot {
      return entries.get(liveStateKey(agentID, stateInterface))?.snapshot ?? EMPTY_LIVE_STATE;
    },

    /** Number of live subscriptions (tests / diagnostics). */
    size() {
      return entries.size;
    },
  };
};

export type LiveStateStore<C> = ReturnType<typeof createLiveStateStore<C>>;
