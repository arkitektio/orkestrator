import type { ReactNode } from "react";
import type { Action, ExternalToast } from "sonner";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * Short-lived feedback ("Reply sent", "Could not move the mail"), shown as a
 * rail island instead of a toast floating over the page — the same home every
 * other ambient piece of the app already has (see `core/ui/rail/RailIsland`).
 *
 * Module level, like `localActionRuns`: toasts are raised from hooks, Apollo
 * callbacks and plain functions alike, one list per window has to outlive
 * every mount, and a module store is testable without React.
 */

export type ToastKind = "default" | "success" | "info" | "warning" | "error";

export type RailToast = {
  id: string | number;
  kind: ToastKind;
  message: ReactNode;
  description?: ReactNode;
  action?: Action | ReactNode;
  cancel?: Action | ReactNode;
  icon?: ReactNode;
  createdAt: number;
};

/** How long a toast of each kind stays; an error stays until dismissed. */
export const TOAST_TTL_MS: Record<ToastKind, number> = {
  default: 5000,
  success: 5000,
  info: 5000,
  warning: 8000,
  error: Infinity,
};

/** A bounded list: the rail is narrow, and a burst of failures must not fill it. */
export const MAX_TOASTS = 5;

type State = { toasts: RailToast[]; islands: number };

export const toastStore = createStore<State>(() => ({ toasts: [], islands: 0 }));

export const useRailToasts = <T>(selector: (state: State) => T) => useStore(toastStore, selector);

/** Pending expiries, by toast id. `remaining` is kept so a pause can resume. */
const timers = new Map<string | number, { timeout?: ReturnType<typeof setTimeout>; remaining: number; startedAt: number }>();
let paused = false;

const clearTimer = (id: string | number) => {
  const timer = timers.get(id);
  if (timer?.timeout) clearTimeout(timer.timeout);
  timers.delete(id);
};

const arm = (id: string | number, ms: number) => {
  clearTimer(id);
  if (!Number.isFinite(ms)) return;
  const timer: { timeout?: ReturnType<typeof setTimeout>; remaining: number; startedAt: number } = {
    remaining: ms,
    startedAt: Date.now(),
  };
  if (!paused) timer.timeout = setTimeout(() => dismissToast(id), ms);
  timers.set(id, timer);
};

let counter = 0;

const resolve = (node: (() => ReactNode) | ReactNode) => (typeof node === "function" ? node() : node);

/** Adds a toast, or replaces the one with the same `id` in place (sonner's semantics). */
export const pushToast = (
  kind: ToastKind,
  message: (() => ReactNode) | ReactNode,
  options: ExternalToast = {},
): string | number => {
  const id = options.id ?? `toast-${++counter}`;
  const toast: RailToast = {
    id,
    kind,
    message: resolve(message),
    description: options.description !== undefined ? resolve(options.description) : undefined,
    action: options.action,
    cancel: options.cancel,
    icon: options.icon,
    createdAt: Date.now(),
  };

  toastStore.setState((state) => {
    const existing = state.toasts.findIndex((t) => t.id === id);
    let toasts =
      existing >= 0 ? state.toasts.map((t, i) => (i === existing ? toast : t)) : [...state.toasts, toast];
    // Over the cap: the oldest that is not an error goes first — an error is
    // the one kind that waits for the user.
    while (toasts.length > MAX_TOASTS) {
      const drop = toasts.findIndex((t) => t.kind !== "error");
      const gone = toasts[drop >= 0 ? drop : 0];
      clearTimer(gone.id);
      toasts = toasts.filter((t) => t !== gone);
    }
    return { toasts };
  });

  arm(id, options.duration ?? TOAST_TTL_MS[kind]);
  return id;
};

/** Removes one toast, or every toast without an id. */
export const dismissToast = (id?: string | number) => {
  if (id === undefined) {
    for (const key of [...timers.keys()]) clearTimer(key);
    toastStore.setState({ toasts: [] });
    return;
  }
  clearTimer(id);
  toastStore.setState((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
};

/** Holds every expiry while the pointer is on the island, so a toast being read stays. */
export const pauseToasts = () => {
  if (paused) return;
  paused = true;
  const now = Date.now();
  for (const timer of timers.values()) {
    if (timer.timeout) clearTimeout(timer.timeout);
    timer.timeout = undefined;
    timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
  }
};

export const resumeToasts = () => {
  if (!paused) return;
  paused = false;
  for (const [id, timer] of timers) {
    timer.startedAt = Date.now();
    timer.timeout = setTimeout(() => dismissToast(id), timer.remaining);
  }
};

/** An island in this window will show toasts; returns its unmount. */
export const mountToastIsland = () => {
  toastStore.setState((state) => ({ islands: state.islands + 1 }));
  return () => toastStore.setState((state) => ({ islands: Math.max(0, state.islands - 1) }));
};

export const toastIslandMounted = () => toastStore.getState().islands > 0;

/** Test seam: back to an empty store with no timers. */
export const resetToasts = () => {
  for (const key of [...timers.keys()]) clearTimer(key);
  paused = false;
  counter = 0;
  toastStore.setState({ toasts: [], islands: 0 });
};
