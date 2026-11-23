import { FrozenDependency, pinsFromFrozen } from "@arkitektio/bsx/ports/dependencies/tree";
import { buildAssignInput } from "@/rekuest/assign";
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  TaskEventFragment,
  AssignInput,
  FullTaskDocument,
  type FullTaskQuery,
  type FullTaskQueryVariables,
  PostmanTaskFragment,
} from "../api/graphql";
import { useRekuest } from "../api/hooks";
import { hydrateAndInsertMyTask } from "../lib/taskCache";
import { toTaskChange, toWireAssignInput, type AssignedAnswer } from "../session/frames";
import { useRekuestSession } from "../session/hooks";
import {
  deliverHeldEvents,
  mapReference,
  trackTask,
} from "../lib/taskTracker";
import { statefulNeedsAgentError, toAssignError } from "../lib/assignError";

/**
 * Canonical alias for the assign-mutation input. Import it from here — do not
 * redefine it per hook.
 */
export type ActionAssignVariables = AssignInput;

export type useActionReturn = {
  assign: (
    /** `deadman`: tie the run to this window (cancelled once it has been gone that many
     *  seconds). Only over the window's session; ignored without one. */
    variables: ActionAssignVariables & { deadman?: number | null },
  ) => Promise<PostmanTaskFragment>;
};

export type useActionOptions = {
  id: string;
};

export const useAssign = (): useActionReturn => {
  const apollo = useRekuest();
  const session = useRekuestSession();

  const assign = useCallback(
    async (vars: ActionAssignVariables & { deadman?: number | null }) => {
      // A reference is what makes two sends the same assign. Sent only when the
      // caller has one: an empty string is not "none" to every server.
      const { reference, deadman, ...rest } = vars;
      const input: AssignInput = {
        ...rest,
        args: vars.args,
        hooks: [],
        ...(reference ? { reference } : {}),
      };

      // Over the window's session: the answer names the task, and an assign re-sent
      // after a drop finds the same one.
      const answer = await session
        .call<AssignedAnswer>({
          type: "ASSIGN",
          input: toWireAssignInput(input),
          deadman: deadman ?? null,
        })
        .catch((error: unknown) => {
          throw toAssignError(error);
        });

      // Routing a task's events to its local tracker must not wait for the
      // tasks feed's create, which can lag this answer.
      mapReference(answer.task, answer.reference);
      deliverHeldEvents(answer.task);
      // Into my tasks (one read, shared with the tasks feed's create of it).
      if (answer.record) void hydrateAndInsertMyTask(apollo, toTaskChange(answer.record));
      // The task as callers read it.
      const read = await apollo.query<FullTaskQuery, FullTaskQueryVariables>({
        query: FullTaskDocument,
        variables: { id: answer.task },
        fetchPolicy: "network-only",
      });
      return read.data.task;
    },
    [apollo, session],
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
  const session = useRekuestSession();

  const cancel = useCallback(
    async (taskId: string): Promise<{ id: string }> => {
      // A refusal rejects, as an `AssignError` like an assign's, so every caller
      // reads one shape.
      await session.call({ type: "CANCEL", task: taskId }).catch((error: unknown) => {
        throw toAssignError(error);
      });
      return { id: taskId };
    },
    [session],
  );

  return { cancel };
};

/** Minimal task shape needed to re-run it (works for Postman and Detail tasks). */
export type ReassignableTask = {
  args: AssignInput["args"];
  /** A rerun keeps the original's: it waits for approval exactly as that did. */
  policy?: AssignInput["policy"];
  action: { id: string; stateful: boolean };
  implementation?: { id: string } | null;
  /** The agent it ran on. */
  agent?: { id: string } | null;
  resolvedDependencies?: readonly FrozenDependency[] | null;
};

/**
 * Re-run a task with its original args: pinned to the same implementation
 * when the task has one, otherwise re-resolved via the action. A stateful
 * action is never re-resolved (the server refuses it by action alone): it
 * goes to the agent it ran on, and is refused here when the task has none.
 * A pinned rerun binds its dependencies to the same agents again, level by
 * level, as far as the task's fragment selects them.
 */
export const useReassignFromTask = () => {
  const { assign } = useAssign();

  const reassign = useCallback(
    async (task: ReassignableTask, opts?: { capture?: boolean }) => {
      if (!task.implementation && task.action.stateful && !task.agent) throw statefulNeedsAgentError();
      return assign(
        buildAssignInput({
          args: task.args,
          ...(task.implementation
            ? { implementation: task.implementation.id }
            : task.action.stateful && task.agent
              ? { action: task.action.id, agent: task.agent.id }
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
          policy: task.policy,
        }),
      );
    },
    [assign],
  );

  return { reassign };
};
