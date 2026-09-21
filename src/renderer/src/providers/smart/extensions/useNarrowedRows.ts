import { rankByFilter, type FilterParts } from "@/command/filter";
import React from "react";
import type { SectionStatus } from "./section";

/**
 * The rows for what the user has typed right now.
 *
 * The server search runs on a debounced value, so between a keystroke and the
 * answer the list would sit frozen on the previous filter. Until the server has
 * caught up, the rows already on screen are narrowed locally with the
 * palette's matcher; once it has, its own (semantic, ranked) rows win untouched.
 */
export const narrowRows = <T,>(options: {
  rows: readonly T[] | undefined;
  /** What the rows were fetched for. */
  serverFilter: string | undefined;
  /** The raw input value. */
  liveFilter: string | undefined;
  status: SectionStatus;
  partsOf: (row: T) => FilterParts;
}): readonly T[] => {
  const rows = options.rows ?? [];
  const caughtUp =
    (options.liveFilter ?? "") === (options.serverFilter ?? "") &&
    options.status !== "revalidating";
  return caughtUp ? rows : rankByFilter(rows, options.partsOf, options.liveFilter);
};

export const useNarrowedRows = <T,>(
  options: Parameters<typeof narrowRows<T>>[0],
): readonly T[] =>
  React.useMemo(
    () => narrowRows(options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.rows, options.serverFilter, options.liveFilter, options.status, options.partsOf],
  );
