import { useCallback, useEffect, useMemo, useState } from "react";
import { DebugContext, type DebugEntry } from "./DebugContext";

/** Where "debug mode is on" is kept, so it survives a reload. */
export const DEBUG_STORAGE_KEY = "orkestrator.debug";

const readStoredDebug = (): boolean => {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const DebugProvider = (props: { children: React.ReactNode }) => {
  const [debug, setDebug] = useState(readStoredDebug);
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  useEffect(() => {
    try {
      if (debug) localStorage.setItem(DEBUG_STORAGE_KEY, "1");
      else localStorage.removeItem(DEBUG_STORAGE_KEY);
    } catch {
      // Storage can be unavailable; debug mode then lasts for the session.
    }
  }, [debug]);

  const report = useCallback((entry: DebugEntry) => {
    setEntries((current) => [...current.filter((e) => e.id !== entry.id), entry]);
  }, []);
  const unreport = useCallback((id: string) => {
    setEntries((current) => (current.some((e) => e.id === id) ? current.filter((e) => e.id !== id) : current));
  }, []);

  const value = useMemo(
    () => ({ debug, setDebug, entries, report, unreport }),
    [debug, entries, report, unreport],
  );
  return (
    <DebugContext.Provider value={value}>
      {props.children}
    </DebugContext.Provider>
  );
};
