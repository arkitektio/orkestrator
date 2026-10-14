import React from "react";
import type { PrimaryActionFragment } from "@/rekuest/api/graphql";

export type RunOnTarget = { action: PrimaryActionFragment };

export type RunOnPoint = { clientX: number; clientY: number };

export type RunOnApi = {
  /** Open the "Run on" picker for `target`: at the pointer (a right-click), or —
   * with no pointer, as when Enter or a click selects the row — under the row. */
  openFor: (target: RunOnTarget, at?: RunOnPoint) => void;
};

/**
 * Under the action's row: its cmdk item (`value` is the action id), bottom-left.
 * The viewport's centre when the row is not on screen.
 */
export const rowAnchor = (actionId: string): RunOnPoint => {
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(actionId) : actionId;
  const row = document.querySelector(`[cmdk-item][data-value="${escaped}"]`);
  if (!row) return { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
  const rect = row.getBoundingClientRect();
  return { clientX: rect.left, clientY: rect.bottom };
};

export const RunOnContext = React.createContext<RunOnApi | null>(null);

/** Null outside a `RunOnSubmenu`: the row then does nothing on right-click. */
export const useRunOnSubmenu = () => React.useContext(RunOnContext);
