import { useMemo } from "react";
import {
  TaskEventKind,
  PortKind,
  LiveTaskFragment,
  useMyTasksQuery,
} from "../api/graphql";

export const useTasks = () => {
  // Read the global "my tasks" list from cache. `cache-first` means consumers do
  // NOT refire a network request on every mount — that storm of refetches would
  // overwrite the cache (dropping tasks that just ended, since the server's
  // myTasks no longer returns them). The list is seeded once by TaskUpdater and
  // kept live thereafter by the WatchMyTasks subscription + local cache writes.
  // Callers that genuinely need fresh server data can call the returned
  // `refetch()` explicitly.
  const queryResult = useMyTasksQuery({ fetchPolicy: "cache-first" });

  return queryResult;
};

export const useTask = (options: { task?: string }) => {
  const { data } = useTasks();
  const tasks = data?.myTasks;
  const task = useMemo(
    () => tasks?.find((a) => a.id === options.task),
    [tasks, options.task],
  );

  return task;
};

export type FilterOptions = {
  identifier?: string;
  object?: string;
  action?: string;
  implementation?: string;
  task?: string;
  assignedImplementation?: string;
  assignedAction?: string;
  allowDone?: boolean;
  refetch?: boolean;
};


export const useFilteredTasks = (options?: FilterOptions) => {
  const { data } = useTasks();

  const tasks = useMemo(
    () =>
      data?.myTasks.filter((a) => {
        if (!options) {
          return true;
        }

        if (options.task) {
          if (a.id != options.task) {
            return false;
          }
        }

        if (
          !options.allowDone &&
          (a.isDone || a.latestEventKind == TaskEventKind.Completed)
        ) {
          return false;
        }

        if (options.action) {
          if (a.action?.id != options.action) {
            return false;
          }
        }

        if (options.implementation) {
          if (a.implementation?.id != options.implementation) {
            return false;
          }
        }

        if (options.assignedAction) {
          if (a?.action.id != options.assignedAction) {
            return false;
          }
        }

        if (options.assignedImplementation) {
          if (a.implementation?.id != options.assignedImplementation) {
            return false;
          }
        }

        if (options.identifier && options.object) {
          let matches = false;
          for (const port of a.action.args) {
            if (
              port.kind == PortKind.Structure &&
              port.identifier == options.identifier
            ) {
              if (a.args[port.key] == options.object) {
                matches = true;
                break;
              }
            }

            if (!matches) {
              return false;
            }
          }
        }

        return true;
      }) || [],
    [
      data?.myTasks,
      options?.action,
      options?.implementation,
      options?.assignedImplementation,
      options?.identifier,
      options?.object,
      options?.task,
      options?.allowDone,
      options?.refetch,
    ],
  );

  return tasks;
};

export const useLatestTask = (options: FilterOptions) => {
  const tasks = useFilteredTasks(options);
  const latestTask = tasks.at(-1);
  return latestTask;
};

export const deriveLiveState = (
  task: LiveTaskFragment | undefined,
) => {
  const latestProgress = task?.events
    .filter((x) => x.kind == TaskEventKind.Progress)
    .at(0)?.progress;
  const latestYield = task?.events
    .filter((x) => x.kind == TaskEventKind.Yield)
    .at(0)?.returns;
  const done = task?.events
    .filter((x) => x.kind == TaskEventKind.Completed)
    .at(0);
  const cancelled = task?.events
    .filter((x) => x.kind == TaskEventKind.Cancelled)
    .at(0);

  const error = task?.events
    .filter(
      (x) =>
        x.kind == TaskEventKind.Critical ||
        x.kind == TaskEventKind.Failed,
    )
    .at(0)?.message;

  const latestMessage = task?.events.find(
    (x) => x.message != undefined,
  )?.message;

  return {
    progress:
      done == undefined && error == undefined ? latestProgress : undefined,
    yield: latestYield,
    cancelled: cancelled,
    done,
    error,
    actionId: task?.action.id,
    actionName: task?.action.name,
    message: latestMessage,
    event: task?.events.at(0),
    taskId: task?.id,
    id: task?.id,
    reference: task?.reference,
    latestEventKind: task?.latestEventKind,
    isDone: task?.isDone,
    createdAt: task?.createdAt,
  };
};

export type LiveTaskState = ReturnType<typeof deriveLiveState>;

export const useLiveTask = (options: FilterOptions) => {
  // Live trackers follow a specific task through completion, so Done
  // tasks stay in scope unless the caller opts out explicitly.
  const task = useLatestTask({ allowDone: true, ...options });

  return useMemo(() => deriveLiveState(task), [task]);
};
