import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Checkbox } from "@/core/ui/checkbox";
import { cn } from "@/core/util/utils";
import {
  TodoItemStructureFragment,
  TodoStatus,
  useDetachFromTodoItemMutation,
  useSetTodoStructureDoneMutation,
} from "@/kraph/api/graphql";
import { Play, X } from "lucide-react";

/**
 * One object on a todo item: its chip, its own Done, and a mark while it is Doing. Ticking the last one
 * moves the item to Done on the server; the item comes back in the answer, so
 * the board follows without a refetch.
 */
export const TodoStructureRow = ({
  structure,
  removable = false,
}: {
  structure: TodoItemStructureFragment;
  removable?: boolean;
}) => {
  const [setDone, { loading }] = useSetTodoStructureDoneMutation();
  const [detach] = useDetachFromTodoItemMutation();

  return (
    <div className="group/row flex min-w-0 items-center gap-2">
      <Checkbox
        checked={structure.done}
        disabled={loading}
        aria-label={structure.done ? "Mark as not done" : "Mark as done"}
        onClick={(event) => event.stopPropagation()}
        onCheckedChange={(checked) =>
          setDone({ variables: { id: structure.id, done: checked === true } }).catch(
            reportErrorAs("Couldn't change the tick"),
          )
        }
      />
      <div className={cn("min-w-0 flex-1 truncate", structure.done && "opacity-60 line-through")}>
        <StructureDisplay identifier={structure.identifier} id={structure.object} variant="chip" />
      </div>
      {structure.status === TodoStatus.Doing && (
        <Play className="size-3.5 shrink-0 text-primary" aria-label="Doing" />
      )}
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
