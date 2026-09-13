import { useCallback } from "react";
import {
  DetailActionFragment,
  LiveTaskFragment,
  PostmanTaskFragment,
  useDetailActionQuery,
} from "../api/graphql";
import {
  ActionAssignVariables,
  useAssign,
  useCancelTask,
  useReassignFromTask,
} from "./useAssign";
import { useFilteredTasks } from "./useTasks";

export type useActionReturn = {
  assign: (
    variables: ActionAssignVariables,
  ) => Promise<PostmanTaskFragment>;
  reassign: () => Promise<PostmanTaskFragment>;
  cancel: () => void;
  tasks?: LiveTaskFragment[];
  latestTask?: LiveTaskFragment;
  action: DetailActionFragment | undefined;
};

export type useActionOptions = {
  id: string;
};

export const useAction = (
  options: useActionOptions,
): useActionReturn => {
  const { data } = useDetailActionQuery({
    variables: {
      id: options.id,
    },
  });

  const tasks = useFilteredTasks({ action: options.id, allowDone: true });
  const latestTask = tasks.at(-1);

  const { assign } = useAssign();
  const { cancel: cancelTask } = useCancelTask();
  const { reassign: reassignTask } = useReassignFromTask();

  const reassign = useCallback(() => {
    if (!latestTask) {
      throw Error("No latest task");
    }
    return reassignTask(latestTask);
  }, [reassignTask, latestTask]);

  const cancel = useCallback(async () => {
    if (!latestTask) {
      throw Error("No task to cancel");
    }
    return cancelTask(latestTask.id);
  }, [cancelTask, latestTask]);

  return {
    assign,
    reassign,
    latestTask,
    cancel,
    tasks,
    action: data?.action,
  };
};
