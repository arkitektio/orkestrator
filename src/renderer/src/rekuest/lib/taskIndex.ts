import { useEffect } from "react";
import { useFragment, type ApolloClient } from "@apollo/client";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import {
  LiveTaskFragmentDoc,
  MyTasksDocument,
  type LiveTaskFragment,
  type MyTasksQuery,
} from "../api/graphql";
import { useRekuest } from "../api/hooks";

/**
 * Which of the viewer's tasks is the latest of each action and of each
 * implementation — ids only, kept from the global `MyTasks` list.
 *
 * Every action card (its logo), assign form and implementation page wants
 * "my latest task of THIS". Reading it by filtering `MyTasks` meant each of
 * them watched the whole list, so a progress tick on any task re-filtered and
 * re-rendered all of them. Here they select one id, which only moves when a
 * task of theirs is created, and read that one task with `useFragment`: a
 * tick on task A re-renders A's readers and nobody else.
 */
export type TaskIndexState = {
  latestByAction: Record<string, string>;
  latestByImplementation: Record<string, string>;
};

type IndexedTask = Pick<LiveTaskFragment, "id" | "createdAt"> & {
  action?: { id: string } | null;
  implementation?: { id: string } | null;
};

const EMPTY: TaskIndexState = { latestByAction: {}, latestByImplementation: {} };

/** Newest by `createdAt`; on a tie the later one in the list (appended last). */
export const buildTaskIndex = (tasks: readonly IndexedTask[]): TaskIndexState => {
  const latestByAction: Record<string, string> = {};
  const latestByImplementation: Record<string, string> = {};
  const createdOf = new Map<string, number>();
  const newer = (candidate: IndexedTask, current: string | undefined) =>
    current === undefined || Date.parse(candidate.createdAt) >= (createdOf.get(current) ?? -Infinity);

  for (const task of tasks) {
    createdOf.set(task.id, Date.parse(task.createdAt));
    const action = task.action?.id;
    if (action && newer(task, latestByAction[action])) latestByAction[action] = task.id;
    const implementation = task.implementation?.id;
    if (implementation && newer(task, latestByImplementation[implementation])) {
      latestByImplementation[implementation] = task.id;
    }
  }
  return { latestByAction, latestByImplementation };
};

const sameRecord = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

export const taskIndexStore = createStore<TaskIndexState>(() => EMPTY);

/** Re-index; writes (and so notifies) only when some latest id moved. */
export const indexTasks = (tasks: readonly IndexedTask[]) => {
  const next = buildTaskIndex(tasks);
  const current = taskIndexStore.getState();
  if (
    sameRecord(current.latestByAction, next.latestByAction) &&
    sameRecord(current.latestByImplementation, next.latestByImplementation)
  ) {
    return;
  }
  taskIndexStore.setState(next, true);
};

let watchedClient: ApolloClient<unknown> | null = null;
let stopWatching: (() => void) | null = null;

/**
 * Keep the index on the client's `MyTasks`. One watch per client (a profile
 * switch brings a new one and starts over). `cache-first`: in the main
 * window `TaskUpdater` seeds the list; where it does not run (the quick bar)
 * this watch fetches it once.
 */
export const watchTaskIndex = (client: ApolloClient<unknown>) => {
  if (watchedClient === client) return;
  stopWatching?.();
  watchedClient = client;
  taskIndexStore.setState(EMPTY, true);

  // The list only grows and is replaced whole by a refetch; its membership
  // is what the index depends on, and an event (most broadcasts) leaves it
  // as it was — so most callbacks stop at this comparison.
  let membership = "";
  const subscription = client
    .watchQuery<MyTasksQuery>({ query: MyTasksDocument, fetchPolicy: "cache-first" })
    .subscribe({
      next: ({ data }) => {
        const tasks = data?.myTasks;
        if (!tasks) return;
        const next = `${tasks.length}:${tasks[0]?.id ?? ""}:${tasks.at(-1)?.id ?? ""}`;
        if (next === membership) return;
        membership = next;
        indexTasks(tasks);
      },
      error: (error) => console.warn("[taskIndex] MyTasks watch failed:", error),
    });
  stopWatching = () => subscription.unsubscribe();
};

/** The viewer's latest task of an action or an implementation, live. */
export const useMyLatestTask = (by: {
  action?: string;
  implementation?: string;
}): LiveTaskFragment | undefined => {
  const client = useRekuest() as ApolloClient<unknown>;
  useEffect(() => {
    if (client) watchTaskIndex(client);
  }, [client]);

  const id = useStore(taskIndexStore, (state) =>
    by.action
      ? state.latestByAction[by.action]
      : by.implementation
        ? state.latestByImplementation[by.implementation]
        : undefined,
  );

  const { data, complete } = useFragment<LiveTaskFragment>({
    fragment: LiveTaskFragmentDoc,
    fragmentName: "LiveTask",
    from: id ? { __typename: "Task", id } : null,
    client,
  });

  return id && complete ? (data as LiveTaskFragment) : undefined;
};
