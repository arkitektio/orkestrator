import { useSyncExternalStore } from "react";

/**
 * Whether a module may follow its server through a caller session (rekuest's
 * on takt: one socket per window, resumed after a drop) instead of GraphQL
 * subscriptions. On by default; Settings → Developer turns it off, as a kill
 * switch and to compare the two. Per machine (localStorage); a change applies
 * to services connected after it (reconnect, or reload the window).
 */
const KEY = "orkestrator.realtime.sessions";

const listeners = new Set<() => void>();

export const sessionsEnabled = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};

export const setSessionsEnabled = (enabled: boolean) => {
  try {
    if (enabled) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // No storage (tests, a locked-down profile): the default holds.
  }
  for (const listener of [...listeners]) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSessionsEnabled = (): boolean =>
  useSyncExternalStore(subscribe, sessionsEnabled, sessionsEnabled);
