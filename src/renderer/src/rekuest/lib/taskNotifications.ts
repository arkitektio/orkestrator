import { useSyncExternalStore } from "react";

/**
 * Owns which task notifications are currently visible in the global
 * TaskNotificationStack. This replaces sonner's id registry / dismiss
 * bookkeeping with a tiny dependency-free external store so it can be mutated
 * from the non-React WatchMyTasks subscription callback (in TaskUpdater) and
 * observed reactively from the stack component. Mirrors the module-level
 * pattern used in `lib/taskTracker.ts`.
 */

// Active task ids, newest first (index 0 renders on top of the stack).
let active: string[] = [];

// Tracks dismissed task ids so a notification isn't re-shown. Bounded with FIFO
// eviction so it doesn't grow unbounded over a long session (one entry would
// otherwise leak per dismissed notification forever).
const MAX_DISMISSED = 200;
const dismissed = new Set<string>();

const rememberDismissed = (id: string) => {
  if (dismissed.size >= MAX_DISMISSED) {
    const oldest = dismissed.values().next().value;
    if (oldest !== undefined) dismissed.delete(oldest);
  }
  dismissed.add(id);
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Show a notification for a task. No-op if dismissed or already active. */
export const notify = (id: string) => {
  if (dismissed.has(id) || active.includes(id)) {
    return;
  }
  active = [id, ...active];
  emit();
};

/**
 * Show notifications for several tasks at once (one emit). `ids` are ordered
 * newest first, like the stack; dismissed and already-active ids are skipped.
 * Used to restore the running tasks after a reload, where the store starts
 * empty and the subscription only reports tasks created from then on.
 */
export const notifyMany = (ids: string[]) => {
  const fresh = ids.filter((id) => !dismissed.has(id) && !active.includes(id));
  if (fresh.length === 0) {
    return;
  }
  active = [...active, ...fresh];
  emit();
};

/** Hide a task's notification and remember it so it isn't re-shown. */
export const dismiss = (id: string) => {
  rememberDismissed(id);
  if (!active.includes(id)) {
    return;
  }
  active = active.filter((x) => x !== id);
  emit();
};

/** Reactively read the ordered (newest-first) list of active notification ids. */
export const useTaskNotifications = () =>
  useSyncExternalStore(subscribe, () => active);
