import React, { useContext } from "react";

/**
 * What one page-level query looked like, as reported by its route wrapper.
 *
 * `tabId` is the tab the page lives in, so the badge can show the tab being
 * looked at rather than every warm tab's page at once.
 */
export type DebugEntry = {
  id: string;
  tabId: string | null;
  /** The page component's name — the nearest thing to an operation name here. */
  label: string;
  variables?: unknown;
  data?: unknown;
  error?: unknown;
  loading?: boolean;
  updatedAt: number;
};

export type DebugContextType = {
  debug: boolean;
  setDebug: React.Dispatch<React.SetStateAction<boolean>>;
  /** Every page currently reporting, across tabs. */
  entries: DebugEntry[];
  report: (entry: DebugEntry) => void;
  unreport: (id: string) => void;
};

export const DebugContext = React.createContext<DebugContextType>({
  debug: false,
  setDebug: () => { },
  entries: [],
  report: () => { },
  unreport: () => { },
});

export const useDebug = () => useContext(DebugContext);
