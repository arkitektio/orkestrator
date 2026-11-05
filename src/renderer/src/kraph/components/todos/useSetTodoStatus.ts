import { reportErrorAs, toast } from "@/core/notify";
import {
  TodoItemStructureFragment,
  TodoStatus,
  useSetTodoStructureStatusMutation,
} from "@/kraph/api/graphql";
import { Progress, settleItem, todoStatusLabel } from "@/kraph/lib/todos";
import React from "react";

/** What the hook needs of the item the object is on: enough to answer the write before the server does. */
export type StatusItem = {
  id: string;
  status: TodoStatus;
  position: number;
  updatedAt: unknown;
  progress: Progress;
};

export type SetStatusOptions = {
  /**
   * Offer Undo in a toast. For a change whose result leaves the screen (a Done
   * chip leaves the page bar, "Done & next" leaves the page); a board row stays
   * where it is and needs none.
   */
  undoable?: boolean;
  /** Said instead of "Marked done" (e.g. "Item finished"). */
  message?: string;
  /** Throw a failure instead of reporting it: for a caller that shows it itself (a smart-menu row). */
  rethrow?: boolean;
};

/**
 * The one way the app moves an object on a todo item to To do, Doing or Done.
 * The change shows at once (an optimistic answer built with `settleItem`, the
 * mirror of the server's rule); the server's answer replaces it, or Apollo
 * rolls it back and the failure is reported.
 */
export const useSetTodoStatus = (structure: TodoItemStructureFragment, item: StatusItem) => {
  const [mutate, { loading }] = useSetTodoStructureStatusMutation();

  const write = React.useCallback(
    (from: TodoItemStructureFragment, on: StatusItem, to: TodoStatus) => {
      const settled = settleItem(on, from.status, to);
      const done = to === TodoStatus.Done;
      return mutate({
        variables: { id: from.id, status: to },
        optimisticResponse: {
          setTodoStructureStatus: {
            __typename: "TodoItem",
            id: on.id,
            status: settled.status,
            position: on.position,
            updatedAt: on.updatedAt,
            progress: { __typename: "TodoProgress", ...settled.progress },
            structures: [
              {
                ...from,
                __typename: "TodoItemStructure",
                status: to,
                done,
                doneAt: done ? (from.doneAt ?? new Date().toISOString()) : null,
                doneBy: done ? from.doneBy : null,
              },
            ],
          },
        },
      });
    },
    [mutate],
  );

  const setStatus = React.useCallback(
    /** Resolves `true` once the server took the change (or there was nothing to change). */
    async (to: TodoStatus, options: SetStatusOptions = {}): Promise<boolean> => {
      if (to === structure.status) return true;
      const before = structure;
      const pending = write(structure, item, to);
      const result = options.rethrow ? await pending : await pending.catch(reportErrorAs(`Couldn't move it to ${todoStatusLabel(to)}`));
      if (!result) return false;
      if (!options.undoable) return true;

      // Back to where it was, from the state the server answered.
      const answered = result.data?.setTodoStructureStatus;
      const now = answered?.structures[0] ?? { ...structure, status: to };
      const onNow: StatusItem = answered ? { ...item, ...answered } : item;
      toast(options.message ?? (to === TodoStatus.Done ? "Marked done" : `Moved to ${todoStatusLabel(to)}`), {
        action: {
          label: "Undo",
          onClick: () => {
            void write(now, onNow, before.status).catch(reportErrorAs("Couldn't undo it"));
          },
        },
      });
      return true;
    },
    [structure, item, write],
  );

  return { setStatus, loading };
};
