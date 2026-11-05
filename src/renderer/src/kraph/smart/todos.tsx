import { describeError } from "@/core/notify";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SectionItems, SmartContextSection, SmartSectionContext } from "@/core/smart/extensions/section";
import { useStableData } from "@/core/smart/extensions/useStableData";
import { smartRegistry } from "@/core/smart/registry";
import { KraphGuard } from "@/kraph/api/funcs";
import {
  SlimTodoItemFragment,
  TodoItemStructureFragment,
  TodoStatus,
  useTodoTrackQuery,
} from "@/kraph/api/graphql";
import { tracksOf } from "@/kraph/components/todos/TodoTrack";
import { useDoneAndNext } from "@/kraph/components/todos/useDoneAndNext";
import { useSetTodoStatus } from "@/kraph/components/todos/useSetTodoStatus";
import { Check, ListTodo, Play, SkipForward, Undo2 } from "lucide-react";
import React from "react";

/**
 * "Todo" in the smart menu: for one datum, the moves its todo items allow —
 * Doing, Done, or back to To do — one row per move per item. The same
 * write as every other status control (`useSetTodoStatus`).
 */

type TodoMove = {
  item: SlimTodoItemFragment;
  structure: TodoItemStructureFragment;
  target: TodoStatus;
  /** "Done & next": mark it done and open the item's next open object. */
  next?: boolean;
};

const MOVES: Record<TodoStatus, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  [TodoStatus.Doing]: { title: "Doing", icon: Play },
  [TodoStatus.Done]: { title: "Done", icon: Check },
  [TodoStatus.Todo]: { title: "Back to To do", icon: Undo2 },
};

const targetsFrom = (status: TodoStatus): TodoStatus[] =>
  status === TodoStatus.Todo
    ? [TodoStatus.Doing, TodoStatus.Done]
    : status === TodoStatus.Doing
      ? [TodoStatus.Done, TodoStatus.Todo]
      : [TodoStatus.Todo];

const useTodoMoves = (ctx: SmartSectionContext): SectionItems<TodoMove> => {
  const target = ctx.objects.at(0);
  const skip = !target;
  // The same read as the page bar's chips: the object's own rows, one per item.
  const result = useTodoTrackQuery({
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    variables: { identifier: target?.identifier ?? "", object: target?.id ?? "" },
    skip,
  });
  const stable = useStableData(result, skip);

  const items = React.useMemo<TodoMove[] | undefined>(() => {
    const rows = stable.data?.todoItemStructures;
    if (!rows || !target) return undefined;
    return tracksOf(rows).flatMap(({ item, own }) => {
      const moves: TodoMove[] = targetsFrom(own.status).map((to) => ({ item, structure: own, target: to }));
      // More than this one still open on the item: offer to go straight on to the next.
      if (own.status !== TodoStatus.Done && item.progress.total - item.progress.done > 1) {
        moves.splice(1, 0, { item, structure: own, target: TodoStatus.Done, next: true });
      }
      return moves;
    });
  }, [stable.data, target]);

  return { items, status: stable.status, error: stable.error };
};

const TodoMoveRow = ({ item: move }: { item: TodoMove; context: SmartSectionContext }) => {
  const { setStatus } = useSetTodoStatus(move.structure, move.item);
  const { doneAndNext } = useDoneAndNext(move.structure, move.item);
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);
  const { title, icon } = move.next ? { title: "Done & next", icon: SkipForward } : MOVES[move.target];

  const run = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    try {
      if (move.next) await doneAndNext({ rethrow: true });
      else await setStatus(move.target, { rethrow: true, undoable: move.target === TodoStatus.Done });
    } catch (error) {
      setFailure({ title: `Couldn't move it to ${title}`, detail: describeError(error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={`todo-${move.structure.id}-${move.target}${move.next ? "-next" : ""}`}
      onSelect={run}
      title={title}
      description={move.item.title}
      icon={icon}
      running={running}
      failure={failure}
    />
  );
};

export const KRAPH_TODOS_SECTION: SmartContextSection<TodoMove> = {
  id: "kraph.todos",
  module: "kraph",
  title: "Todo",
  icon: ListTodo,
  priority: 25,
  tier: "remote",
  Guard: KraphGuard,
  applies: (props) =>
    props.objects.length === 1 &&
    !(props.partners?.length ?? 0) &&
    smartRegistry.isDatum(props.objects[0].identifier),
  useItems: useTodoMoves,
  itemKey: (move) => `${move.structure.id}:${move.target}${move.next ? ":next" : ""}`,
  searchParts: (move) => [move.next ? "Done & next" : MOVES[move.target].title, move.item.title],
  Row: TodoMoveRow,
};
