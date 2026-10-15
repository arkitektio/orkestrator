import type { ApolloError } from "@apollo/client";
import { useCallback } from "react";
import {
  TaskEventKind,
  DetailImplementationFragment,
  LiveTaskFragment,
  PostmanTaskFragment,
  useImplementationQuery,
} from "../api/graphql";
import {
  ActionAssignVariables,
  useAssign,
  useCancelTask,
  useReassignFromTask,
} from "./useAssign";
import { useMyLatestTask } from "../lib/taskIndex";

export type UseImplementationActionReturn = {
  implementation?: DetailImplementationFragment;
  error?: ApolloError;
  assign: (
    variables: ActionAssignVariables,
  ) => Promise<PostmanTaskFragment>;
  reassign: () => Promise<PostmanTaskFragment>;
  cancel: () => void;
  latestTask?: LiveTaskFragment;
};

export type UseImplementationAction = {
  id: string;
};

export const useImplementationAction = (
  options: UseImplementationAction,
): UseImplementationActionReturn => {
  const { data, error } = useImplementationQuery({
    variables: {
      id: options.id,
    },
  });

  const liveLatest = useMyLatestTask({ implementation: options.id });

  const latestTask = data?.implementation.myLatestTask || liveLatest;

  const { assign: rawAssign } = useAssign();
  const { cancel: cancelTask } = useCancelTask();
  const { reassign: reassignTask } = useReassignFromTask();

  const assign = useCallback(
    (vars: ActionAssignVariables) => rawAssign({ ...vars, implementation: options.id }),
    [rawAssign, options.id],
  );

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

    if (latestTask.latestEventKind == TaskEventKind.Completed) {
      throw Error("Cannot Cancel as it is done");
    }

    return cancelTask(latestTask.id);
  }, [cancelTask, latestTask]);

  return {
    assign,
    reassign,
    latestTask,
    cancel,
    implementation: data?.implementation,
    error,
  };
};
