import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { TodoItemStructureFragment, TodoStatus, useDetachFromTodoItemMutation } from "@/kraph/api/graphql";
import { X } from "lucide-react";
import { TodoStatusControl } from "./TodoStatusControl";
import type { StatusItem } from "./useSetTodoStatus";

/**
 * One object on a todo item: its chip and its own To do / Doing / Done (a
 * round tick in a list, the full pill where there is room). Ticking the last
 * one moves the item to Done; the change shows at once (`useSetTodoStatus`).
 */
export const TodoStructureRow = ({
  structure,
  item,
  removable = false,
  control = "check",
}: {
  structure: TodoItemStructureFragment;
  item: StatusItem;
  removable?: boolean;
  control?: "check" | "pill";
}) => {
  // The item's own answer carries only its next objects: the full lists (item page, "+N", the object's track) are read again.
  const [detach] = useDetachFromTodoItemMutation({ refetchQueries: ["TodoItem", "TodoItemObjects", "TodoTrack", "TodoSummary"] });

  return (
    <div className="group/row flex min-w-0 items-center gap-2">
      {control === "check" && <TodoStatusControl structure={structure} item={item} variant="check" />}
      <div className={cn("min-w-0 flex-1 truncate", structure.status === TodoStatus.Done && "opacity-60 line-through")}>
        <StructureDisplay identifier={structure.identifier} id={structure.object} variant="chip" />
      </div>
      {control === "pill" && <TodoStatusControl structure={structure} item={item} variant="pill" className="shrink-0" />}
      {removable && (
        <button
          type="button"
          className="invisible text-muted-foreground hover:text-foreground group-hover/row:visible"
          aria-label="Take off this item"
          onClick={(event) => {
            event.stopPropagation();
            detach({ variables: { id: structure.id } }).catch(reportErrorAs("Couldn't take the object off"));
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};
