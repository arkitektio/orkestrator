import { useDragSource } from "@/core/dnd/react";
import { KraphTodoItem } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListTodoItemFragment } from "@/kraph/api/graphql";
import { structureProgress } from "@/kraph/lib/todos";
import { GripVertical } from "lucide-react";
import { DeleteTodoItemButton } from "./DeleteTodoItemButton";
import { TodoAssignee } from "./TodoAssignee";
import { TodoStructureRow } from "./TodoStructureRow";

/** The kind a todo card's grip drags: only the board's columns take it. */
export const TODO_CARD_DRAG = "kraph-todo-card";

export type TodoCardDrag = { id: string; list: string };

/**
 * One card on a todo board. The card itself is the item's smart object: drop
 * images on it for "Attach to todo item", right-click for its actions. Moving
 * it between columns is the grip's job, so the two drags never meet.
 */
export const TodoItemCard = ({
  item,
  listId,
  listAssignee,
}: {
  item: ListTodoItemFragment;
  listId: string;
  listAssignee?: string | null;
}) => {
  const grip = useDragSource({
    kind: TODO_CARD_DRAG,
    getData: (): TodoCardDrag => ({ id: item.id, list: listId }),
  });
  const progress = structureProgress(item.structures);

  return (
    <div data-todo-card={item.id} className="group/card has-[[data-dragging=true]]:opacity-40">
      <KraphTodoItem.Smart object={{ id: item.id }} className="rounded-lg border bg-card p-2 shadow-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-1">
            <div
              ref={grip}
              className="-ml-1 mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to another column"
            >
              <GripVertical className="size-4" />
            </div>
            <KraphTodoItem.DetailLink object={item} className="min-w-0 flex-1 text-sm font-medium leading-snug hover:underline">
              {item.title}
            </KraphTodoItem.DetailLink>
            {progress.total > 0 && (
              <span className={cn("text-xs tabular-nums text-muted-foreground", progress.done === progress.total && "text-primary")}>
                {progress.done}/{progress.total}
              </span>
            )}
            <span className="invisible group-hover/card:visible">
              <DeleteTodoItemButton item={item} />
            </span>
          </div>
          {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
          {item.structures.length > 0 && (
            <div className="flex flex-col gap-1">
              {item.structures.map((structure) => (
                <TodoStructureRow key={structure.id} structure={structure} removable />
              ))}
            </div>
          )}
          <TodoAssignee own={item.assignee} inherited={listAssignee} />
        </div>
      </KraphTodoItem.Smart>
    </div>
  );
};
