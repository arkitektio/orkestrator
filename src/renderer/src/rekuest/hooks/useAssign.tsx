import { FrozenDependency, pinsFromFrozen } from "../lib/dependencyTree";
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
      // A reference is what makes two sends the same assign. Sent only when the
      // caller has one: an empty string is not "none" to every server.
      const { reference, ...rest } = vars;
      const mutation = await postAssign({
        variables: {
          input: {
            ...rest,
            args: vars.args,
            hooks: [],
            ...(reference ? { reference } : {}),
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
  resolvedDependencies?: readonly FrozenDependency[] | null;
};

/**
 * Re-run a task with its original args: pinned to the same implementation
 * when the task has one, otherwise re-resolved via the action. A pinned
 * rerun binds its dependencies to the same agents again, level by level, as
 * far as the task's fragment selects them.
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
          // the [ResolvedDependencyInput!] list AssignInput expects; its
          // `resolvedDependencies` are the same bindings, read back as pins.
          // Another implementation may declare other dependencies: only a
          // rerun on the same one carries them.
          ...(task.implementation && task.resolvedDependencies?.length
            ? { dependencies: pinsFromFrozen(task.resolvedDependencies) }
            : {}),
          hooks: [],
          capture: opts?.capture ?? false,
        }),
      ),
    [assign],
  );

  return { reassign };
};
