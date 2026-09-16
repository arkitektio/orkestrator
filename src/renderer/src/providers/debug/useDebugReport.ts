import { useTabId } from "@/command/tabs/TabContext";
import { useEffect, useId } from "react";

import { useDebug } from "./DebugContext";

export type DebugReport = {
  variables?: unknown;
  data?: unknown;
  error?: unknown;
  loading?: boolean;
};

/**
 * Tell the debug badge what this page's query is doing.
 *
 * Called by the route wrappers, which are the one place every page's query
 * passes through. Costs nothing while debug mode is off: no state is written,
 * so nothing re-renders. Turning debug on picks up the next render of each
 * page — which the toggle itself causes, since the wrappers read `debug`.
 */
export const useDebugReport = (label: string, state: DebugReport): void => {
  const id = useId();
  const tabId = useTabId();
  const { debug, report, unreport } = useDebug();
  const { variables, data, error, loading } = state;

  // Variables are built inline by the wrappers (`{ id }`), so compare by value.
  const variablesKey = JSON.stringify(variables ?? null);

  useEffect(() => {
    if (!debug) return;
    report({
      id,
      tabId,
      label,
      variables: variablesKey === "null" ? undefined : JSON.parse(variablesKey),
      data,
      error,
      loading,
      updatedAt: Date.now(),
    });
    // Reporting is keyed on the values, not on `report`'s identity.
  }, [debug, id, tabId, label, variablesKey, data, error, loading, report]);

  useEffect(() => () => unreport(id), [id, unreport]);
  useEffect(() => {
    if (!debug) unreport(id);
  }, [debug, id, unreport]);
};
