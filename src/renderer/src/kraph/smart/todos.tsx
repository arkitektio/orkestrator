import { describeError } from "@/core/notify";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SectionItems, SmartContextSection, SmartSectionContext } from "@/core/smart/extensions/section";
import { useStableData } from "@/core/smart/extensions/useStableData";
import { smartRegistry } from "@/core/smart/registry";
import { KraphGuard } from "@/kraph/api/funcs";
import {
  TodoItemStructureFragment,
  TodoItemWithListFragment,
  TodoStatus,
  useSetTodoStructureStatusMutation,
  useTodoItemsQuery,
} from "@/kraph/api/graphql";
import { Check, ListTodo, Play, Undo2 } from "lucide-react";
import React from "react";

/**
 * "Todo" in the smart menu: for one datum, the moves its todo items allow —
 * Doing, Done, or back to To do — one row per move per item. The same
 * mutation as the buttons in the Knowledge sidebar (`TodoStatusButtons`).
 */

type TodoMove = {
  item: TodoItemWithListFragment;
  structure: TodoItemStructureFragment;
  target: TodoStatus;
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
  const result = useTodoItemsQuery({
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    variables: { filters: { identifier: target?.identifier ?? "", object: target?.id ?? "" } },
    skip,
  });
  const stable = useStableData(result, skip);

  const items = React.useMemo<TodoMove[] | undefined>(() => {
    const todoItems = stable.data?.todoItems;
    if (!todoItems || !target) return undefined;
    return todoItems.flatMap((item) => {
      const structure = item.structures.find(
        (candidate) => candidate.identifier === target.identifier && candidate.object === target.id,
      );
      if (!structure) return [];
      return targetsFrom(structure.status).map((to) => ({ item, structure, target: to }));
    });
  }, [stable.data, target]);

  return { items, status: stable.status, error: stable.error };
};

const TodoMoveRow = ({ item: move }: { item: TodoMove; context: SmartSectionContext }) => {
  const [setStatus] = useSetTodoStructureStatusMutation();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);
  const { title, icon } = MOVES[move.target];

  const run = async () => {
    if (running) return;
    setRunning(true);
    setFailure(null);
    try {
      await setStatus({ variables: { id: move.structure.id, status: move.target } });
    } catch (error) {
      setFailure({ title: `Couldn't move it to ${title}`, detail: describeError(error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={`todo-${move.structure.id}-${move.target}`}
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
  itemKey: (move) => `${move.structure.id}:${move.target}`,
  searchParts: (move) => [MOVES[move.target].title, move.item.title],
  Row: TodoMoveRow,
};
