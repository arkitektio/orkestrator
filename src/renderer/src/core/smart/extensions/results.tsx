import React from "react";

import type { Structure } from "@/core/types";

/**
 * Where the structures a run hands back go. A surface that can use them wraps
 * its menus in `<SmartResultSink>` (the scene adds a returned lens as a
 * layer); a module whose rows know their results (rekuest: a task's last
 * yield) reads `useResultSink()` when the row renders and calls it once, when
 * the run completes, with every structure it returned. The innermost sink
 * wins; outside one, nothing is collected.
 *
 * The sink is read at render and kept by the run, not looked up when it ends:
 * the menu that started it is usually gone by then.
 */
export type ResultSink = (results: Structure[]) => void;

const ResultSinkContext = React.createContext<ResultSink | null>(null);

export const SmartResultSink = ({
  onResults,
  children,
}: {
  onResults: ResultSink;
  children?: React.ReactNode;
}) => <ResultSinkContext.Provider value={onResults}>{children}</ResultSinkContext.Provider>;

export const useResultSink = (): ResultSink | null => React.useContext(ResultSinkContext);
