import { useCallback, useMemo, useState } from "react";
import { DebugContext, type DebugEntry } from "./DebugContext";

export const DebugProvider = (props: { children: React.ReactNode }) => {
  const [debug, setDebug] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>([]);

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
