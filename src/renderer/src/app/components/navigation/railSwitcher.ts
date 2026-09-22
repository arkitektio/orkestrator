import { useSyncExternalStore } from "react";

/**
 * "Open the account switcher", from anywhere.
 *
 * Switching account is one place — the menu at the foot of the rail — and other
 * surfaces point at it rather than growing their own copy of the list. Settings
 * → Account is the caller this exists for: it holds what you do TO an account,
 * and hands switching back to the switcher.
 *
 * A counter rather than a boolean: two "open it" requests in a row must both
 * arrive, and the menu owns its own open state (the user can close it without
 * telling anyone). `RailFooter` opens itself whenever this number changes.
 */
let requests = 0;
const listeners = new Set<() => void>();

export const openRailSwitcher = () => {
  requests += 1;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => requests;

/** The number of times opening has been asked for; changes mean "open now". */
export const useRailSwitcherRequests = (): number =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
