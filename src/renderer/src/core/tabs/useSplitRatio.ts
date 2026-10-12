import { useSyncExternalStore } from "react";

import { loadSplitRatio } from "./splitRatio";

/**
 * Where the split's divider sits right now, for everything that must line up
 * with the panes: `TabOutlet`, which lays them out, and chrome drawn along
 * their edges (`PageEdgeBar`).
 *
 * Read from storage once, then held: a drag in progress moves it, and the
 * divider saves where it ended. Dropped when the last reader is gone, so the
 * next one reads what was saved.
 */
let live: number | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) live = null;
  };
};

const snapshot = (): number => (live ??= loadSplitRatio());

export const setSplitRatio = (ratio: number): void => {
  live = ratio;
  listeners.forEach((listener) => listener());
};

export const useSplitRatio = (): number => useSyncExternalStore(subscribe, snapshot, snapshot);
