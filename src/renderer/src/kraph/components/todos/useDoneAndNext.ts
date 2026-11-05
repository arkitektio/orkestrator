import { smartRegistry } from "@/core/smart/registry";
import { TodoItemStructureFragment, TodoStatus, useNextTodoObjectLazyQuery } from "@/kraph/api/graphql";
import React from "react";
import { useNavigate } from "react-router-dom";
import { StatusItem, useSetTodoStatus } from "./useSetTodoStatus";

/**
 * "Done & next": mark this object Done and open the item's next open object,
 * so "annotate these three images" is one press per image. The next one is
 * read before the write (the item's open objects in order, skipping this one);
 * the toast offers Undo, which takes it back to where it was.
 */
export const useDoneAndNext = (structure: TodoItemStructureFragment, item: StatusItem) => {
  const { setStatus, loading } = useSetTodoStatus(structure, item);
  const [findNext, { loading: finding }] = useNextTodoObjectLazyQuery({ fetchPolicy: "network-only" });
  const navigate = useNavigate();

  const doneAndNext = React.useCallback(
    async (options: { rethrow?: boolean } = {}) => {
      const { data } = await findNext({ variables: { item: item.id } });
      const next = data?.todoItemStructures.find((row) => row.id !== structure.id);
      const path = next ? smartRegistry.buildModelPath(next.identifier, next.object) : undefined;
      const done = await setStatus(TodoStatus.Done, {
        undoable: true,
        rethrow: options.rethrow,
        message: next ? "Marked done · opened the next one" : "Marked done · that was the last one",
      });
      if (done && path) navigate(path);
    },
    [findNext, item.id, structure.id, setStatus, navigate],
  );

  return { doneAndNext, loading: loading || finding };
};
