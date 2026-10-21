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
 *
 * `origin` says which run the results came from: the action and the args the
 * menu filled in (the structures it ran on). A sink that wants a rerun to
 * replace what an earlier run added keys on it (`resultOriginKey`).
 */
export type ResultSink = (results: Structure[], origin?: ResultOrigin) => void;

/** The action a run started, and the args the menu filled in for it. */
export type ResultOrigin = { action: string; on: Record<string, unknown> };

/** One string per (action, args): the same action on the same objects, whatever else the form changed. */
export const resultOriginKey = (origin: ResultOrigin): string =>
  `${origin.action}|${Object.keys(origin.on)
    .sort()
    .map((key) => `${key}=${JSON.stringify(origin.on[key])}`)
    .join("&")}`;

const ResultSinkContext = React.createContext<ResultSink | null>(null);

export const SmartResultSink = ({
  onResults,
  children,
}: {
  onResults: ResultSink;
  children?: React.ReactNode;
}) => <ResultSinkContext.Provider value={onResults}>{children}</ResultSinkContext.Provider>;

export const useResultSink = (): ResultSink | null => React.useContext(ResultSinkContext);
