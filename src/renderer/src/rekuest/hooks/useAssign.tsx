import { buildAssignInput } from "@/rekuest/assign";
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  TaskEventFragment,
  AssignInput,
  PostmanTaskFragment,
  useAssignMutation,
  useCancelMutation,
} from "../api/graphql";
import {
  deliverHeldEvents,
  mapReference,
  trackTask,
} from "../lib/taskTracker";

/**
 * Canonical alias for the assign-mutation input. Import it from here — do not
 * redefine it per hook.
 */
export type ActionAssignVariables = AssignInput;

export type useActionReturn = {
  assign: (
    variables: ActionAssignVariables,
  ) => Promise<PostmanTaskFragment>;
};

export type useActionOptions = {
  id: string;
};

export const useAssign = (): useActionReturn => {
  const [postAssign] = useAssignMutation({});

  const assign = useCallback(
    async (vars: ActionAssignVariables) => {
      const mutation = await postAssign({
        variables: {
          input: {
            ...vars,
            args: vars.args,
            hooks: [],
            reference: vars.reference || "",
          },
        },
      });

      const task = mutation.data?.assign;

      if (!task) {
        console.error(mutation);
        const errorMessages = mutation.errors || "Unknown error";
        throw Error(`Couldn't assign: ${errorMessages}`);
      }

      // The subscription's `create` payload usually names the reference first,
      // but it is a separate channel and can lag this response. Routing a
      // task's events to its local tracker must not depend on that race.
      mapReference(task.id, task.reference);
      deliverHeldEvents(task.id);

      return task;
    },
    [postAssign],
  );

  return {
    assign,
  };
};


export const useAssignWithCallback = ({ onDone }: {
  onDone?: (event: TaskEventFragment) => void,

}): useActionReturn => {
  const { assign } = useAssign();


  const assignWithCallback = useCallback(
    async (vars: ActionAssignVariables) => {
      const reference = vars.reference || uuidv4();

      const untrack = trackTask(
        reference,
        (event: TaskEventFragment) => {
          onDone?.(event);
        },
      );

      try {
        return await assign({ ...vars, reference });
      } catch (error) {
        untrack();
        throw error;
      }
    },
    [assign, onDone],
  );

  return {
    assign: assignWithCallback,
  };
}

/** Cancel a task by id. Shared by every hook/page that offers a cancel action. */
export const useCancelTask = () => {
  const [cancelMutation] = useCancelMutation({});

  const cancel = useCallback(
    async (taskId: string) => {
      const mutation = await cancelMutation({
        variables: {
          input: { task: taskId },
        },
      });

      const task = mutation.data?.cancel;

      if (!task) {
        console.error(mutation);
        const errorMessages =
          mutation.errors?.map((error) => error.message).join(", ") ||
          "Unknown error";
        throw Error(`Couldn't cancel task: ${errorMessages}`);
      }

      return task;
    },
    [cancelMutation],
  );

  return { cancel };
};

/** Minimal task shape needed to re-run it (works for Postman and Detail tasks). */
export type ReassignableTask = {
  args: AssignInput["args"];
  action: { id: string };
  implementation?: { id: string } | null;
};

/**
 * Re-run a task with its original args: pinned to the same implementation
 * when the task has one, otherwise re-resolved via the action.
 */
export const useReassignFromTask = () => {
  const { assign } = useAssign();

  const reassign = useCallback(
    (task: ReassignableTask, opts?: { capture?: boolean }) =>
      assign(
        buildAssignInput({
          args: task.args,
          ...(task.implementation
            ? { implementation: task.implementation.id }
            : { action: task.action.id }),
          // A task's `dependencies` field is the raw resolution JSON map, NOT
          // the [ResolvedDependencyInput!] list AssignInput expects — sending
          // it fails server validation ("mappedAgents was not provided").
          // Omit it and let the server re-resolve on the rerun.
          hooks: [],
          capture: opts?.capture ?? false,
        }),
      ),
    [assign],
  );

  return { reassign };
};
