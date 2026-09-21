import type { ApolloError, QueryResult } from "@apollo/client";
import React from "react";
import type { SectionStatus } from "./section";

/**
 * A query result that keeps its rows while new variables are in flight.
 *
 * Apollo's `data` is `undefined` from the moment the variables change until
 * the answer lands; `previousData` holds the last answer. Rendering
 * `data ?? previousData` is what stops the rows vanishing on every keystroke,
 * and the status says which of the two it is.
 */

export type StableData<TData> = {
  data: TData | undefined;
  /** `data` is the previous variables' answer. */
  stale: boolean;
  status: SectionStatus;
  error?: ApolloError;
};

export type StableInput<TData> = Pick<
  QueryResult<TData, any>,
  "data" | "previousData" | "loading" | "error"
>;

export const deriveStableData = <TData,>(
  result: StableInput<TData>,
  skip = false,
): StableData<TData> => {
  if (skip) return { data: undefined, stale: false, status: "ready" };
  const data = result.data ?? result.previousData;
  const stale = result.data === undefined && result.previousData !== undefined;
  if (result.error) return { data, stale, status: "error", error: result.error };
  // A `cache-and-network` background refetch has `loading` with `data` present:
  // rows are here, so the section is ready, not pending.
  if (result.data !== undefined || !result.loading) {
    return { data, stale, status: "ready" };
  }
  return { data, stale, status: stale ? "revalidating" : "loading" };
};

export const useStableData = <TData,>(
  result: StableInput<TData>,
  skip?: boolean,
): StableData<TData> =>
  React.useMemo(
    () => deriveStableData(result, skip),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.data, result.previousData, result.loading, result.error, skip],
  );
