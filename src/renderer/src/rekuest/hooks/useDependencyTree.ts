import { useEffect, useMemo } from "react";
import { Control, FieldValues, useWatch } from "react-hook-form";
import { ResolvedDependencyInput, useDependencyTreeQuery } from "../api/graphql";
import { DependencyNode, toPins, unmetDependencies } from "../lib/dependencyTree";

/**
 * The dry run of the assign a form is about to make: the dependency tree its
 * pins (the form's `dependencies`) resolve to, and what is still unmet in it.
 * Asked again whenever a pin changes, and now and then, since agents come
 * and go.
 *
 * A server that cannot answer (an older one) leaves `satisfied` undefined:
 * the form then shows the root level alone and the assign itself decides.
 */
export const useDependencyTree = <TValues extends FieldValues>(
  implementation: { id: string; dependencies: readonly unknown[] } | null | undefined,
  control: Control<TValues>,
) => {
  const watched = useWatch({ control, name: "dependencies" as never }) as
    | ResolvedDependencyInput[]
    | undefined;
  const key = JSON.stringify(toPins(watched));
  const pins = useMemo(() => JSON.parse(key) as ResolvedDependencyInput[], [key]);
  const skip = !implementation || implementation.dependencies.length === 0;

  const { data, previousData, error, stopPolling } = useDependencyTreeQuery({
    variables: { input: { implementation: implementation?.id ?? "", dependencies: pins } },
    skip,
    fetchPolicy: "network-only",
    pollInterval: 10_000,
  });

  // A server that refuses once will refuse again: no use asking every ten seconds.
  useEffect(() => {
    if (error) stopPolling();
  }, [error, stopPolling]);

  const tree = error ? undefined : (data ?? previousData)?.dependencyTree;
  const nodes = tree?.dependencies as DependencyNode[] | undefined;
  const unmet = useMemo(() => unmetDependencies(nodes), [nodes]);
  return { nodes, satisfied: tree?.satisfied, unmet, error };
};
