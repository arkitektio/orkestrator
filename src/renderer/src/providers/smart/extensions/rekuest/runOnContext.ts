import React from "react";
import type { PrimaryActionFragment } from "@/rekuest/api/graphql";

export type RunOnTarget = { action: PrimaryActionFragment };

export type RunOnApi = {
  /** Open the "Run on" picker for `target` at the pointer. */
  openFor: (target: RunOnTarget, at: { clientX: number; clientY: number }) => void;
};

export const RunOnContext = React.createContext<RunOnApi | null>(null);

/** Null outside a `RunOnSubmenu`: the row then does nothing on right-click. */
export const useRunOnSubmenu = () => React.useContext(RunOnContext);
