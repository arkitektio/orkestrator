import { useDropTarget } from "@/core/dnd/react";
import type { DragPoint, DragSession } from "@/core/dnd/types";
import { reportErrorAs } from "@/core/notify";
import { cn } from "@/core/util/utils";
import { ListTodoItemFragment, TodoListFragment, TodoStatus, useMoveTodoItemMutation } from "@/kraph/api/graphql";
import { STATUS_TONE } from "@/kraph/lib/todoStatus";
import { TODO_COLUMNS, columnOf, dropIndex, moveCard } from "@/kraph/lib/todos";
import { useCallback, useRef, useState } from "react";
import { TODO_CARD_DRAG, TodoCardDrag, TodoItemCard } from "./TodoItemCard";
import { useTodoLive } from "./useTodoLive";

const cardOf = (session: DragSession): TodoCardDrag | null =>
  session.origin === "internal" && session.kind === TODO_CARD_DRAG ? (session.data as TodoCardDrag) : null;

/** Where in `column` a drop at `point` lands, leaving the dragged card out. */
const indexAt = (column: HTMLElement | null, point: DragPoint, dragged: string) => {
  if (!column) return 0;
  const boxes = Array.from(column.querySelectorAll<HTMLElement>("[data-todo-card]"))
    .filter((node) => node.dataset.todoCard !== dragged)
    .map((node) => node.getBoundingClientRect());
  return dropIndex(boxes, point.clientY);
};

const Column = ({
  status,
  label,
  list,
  items,
  onMove,
}: {
  status: TodoStatus;
  label: string;
  list: TodoListFragment;
  items: ListTodoItemFragment[];
  onMove: (id: string, status: TodoStatus, index: number) => void;
}) => {
  const node = useRef<HTMLDivElement | null>(null);
  const [marker, setMarker] = useState<number | null>(null);
  const accepts = (session: DragSession) => cardOf(session)?.list === list.id;

  const { ref, isOver } = useDropTarget({
    accepts,
    onMove: (point, session) => {
      const card = cardOf(session);
      if (card) setMarker(indexAt(node.current, point, card.id));
    },
    onDrop: (payload, point) => {
      setMarker(null);
      const card = cardOf(payload as DragSession);
      if (card) onMove(card.id, status, indexAt(node.current, point, card.id));
    },
  });

  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      node.current = element;
      ref(element);
    },
    [ref],
  );

  const showMarker = isOver ? marker : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className={cn("flex items-center gap-2 px-1 text-sm font-semibold", STATUS_TONE[status])}>
        {label}
        <span className="text-xs font-normal tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <div
        ref={attach}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg bg-muted/40 p-2 transition-colors",
          isOver && "bg-primary/10 ring-1 ring-primary/40",
        )}
      >
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-2">
            {showMarker === index && <div className="h-0.5 rounded bg-primary" />}
            <TodoItemCard item={item} listId={list.id} listAssignee={list.assignee} />
          </div>
        ))}
        {showMarker !== null && showMarker >= items.length && <div className="h-0.5 rounded bg-primary" />}
        {items.length === 0 && !isOver && (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Nothing here</div>
        )}
      </div>
    </div>
  );
};

/**
 * A todo list as a board: To do, Doing, Done. A card moves by its grip; the
 * board shows the move at once (the same renumbering the server does) and
 * Apollo rolls it back if the server refuses.
 */
export const TodoBoard = ({
  list,
  visible,
  hideDone = false,
}: {
  list: TodoListFragment;
  /** Which cards are shown (the board's filters); a drop between shown cards lands between them in the full column. */
  visible?: (item: ListTodoItemFragment) => boolean;
  hideDone?: boolean;
}) => {
  const [move] = useMoveTodoItemMutation();
  // Someone else's tick or move shows here as it happens.
  useTodoLive({ list: list.id });
  const shows = visible ?? (() => true);

  /** A drop at `index` among the shown cards, as an index in the whole column. */
  const fullIndex = (id: string, status: TodoStatus, index: number) => {
    if (!visible) return index;
    const column = columnOf(list.items, status).filter((card) => card.id !== id);
    const shown = column.filter(shows);
    if (index < shown.length) return column.indexOf(shown[index]);
    const last = shown.at(-1);
    return last ? column.indexOf(last) + 1 : column.length;
  };

  const onMove = (id: string, status: TodoStatus, shownIndex: number) => {
    const index = fullIndex(id, status, shownIndex);
    const moved = moveCard(list.items, id, status, index);
    const changed = moved.filter((card, at) => card.status !== list.items[at].status || card.position !== list.items[at].position);
    const target = moved.find((card) => card.id === id);
    if (!target || changed.length === 0) return;

    move({
      variables: { input: { id, status, index } },
      optimisticResponse: {
        moveTodoItem: { __typename: "TodoItem", id, status, position: target.position },
      },
      update: (cache) => {
        for (const card of changed) {
          cache.modify({
            id: cache.identify({ __typename: "TodoItem", id: card.id }),
            fields: { status: () => card.status, position: () => card.position },
          });
        }
      },
    }).catch(reportErrorAs("Couldn't move the item"));
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      {TODO_COLUMNS.filter((column) => !(hideDone && column.status === TodoStatus.Done)).map((column) => (
        <Column
          key={column.status}
          status={column.status}
          label={column.label}
          list={list}
          items={columnOf(list.items, column.status).filter(shows)}
          onMove={onMove}
        />
      ))}
    </div>
  );
};
