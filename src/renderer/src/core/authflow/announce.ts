import type { AuthUpdate } from "./types";

/**
 * "This login moved": the callback page (a tab, maybe in another window)
 * tells whoever is still waiting on the same `state`, so a dialog closes the
 * moment the browser comes back. Nothing is stored.
 */
type Listener = (update: AuthUpdate) => void;

const listeners = new Map<string, Set<Listener>>();

const deliver = (state: string, update: AuthUpdate) => {
  for (const listener of listeners.get(state) ?? []) listener(update);
};

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("orkestrator.authflow");
channel?.addEventListener("message", (event: MessageEvent<{ state: string; update: AuthUpdate }>) => {
  if (event.data?.state && event.data.update) deliver(event.data.state, event.data.update);
});

export const onAuthUpdate = (state: string, listener: Listener) => {
  const set = listeners.get(state) ?? new Set<Listener>();
  listeners.set(state, set);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(state);
  };
};

/** Tell this window and every other one. */
export const announceAuthUpdate = (state: string, update: AuthUpdate) => {
  deliver(state, update);
  channel?.postMessage({ state, update });
};
