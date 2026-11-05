import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { TodoItemStructureFragment, TodoStatus } from "@/kraph/api/graphql";
import { SkipForward } from "lucide-react";
import { useDoneAndNext } from "./useDoneAndNext";
import type { StatusItem } from "./useSetTodoStatus";

/**
 * "Done & next" for an object on an item with more to do: tick it and open the
 * next one. Nothing for a Done object, or for an item it is the only object on.
 * `icon` is the page bar chip's size; `label` names it where there is room.
 */
export const DoneAndNextButton = ({
  structure,
  item,
  variant = "icon",
  className,
}: {
  structure: TodoItemStructureFragment;
  item: StatusItem;
  variant?: "icon" | "label";
  className?: string;
}) => {
  const { doneAndNext, loading } = useDoneAndNext(structure, item);
  if (structure.status === TodoStatus.Done || item.progress.total - item.progress.done < 2) return null;

  return (
    <Button
      size={variant === "icon" ? "icon" : "sm"}
      variant="ghost"
      className={cn(variant === "icon" ? "size-6 rounded-full text-foreground/70 hover:text-foreground" : "h-6 gap-1 px-2 text-xs", className)}
      disabled={loading}
      title="Done, and open the next object on this item"
      aria-label="Done and next"
      onClick={(event) => {
        event.stopPropagation();
        void doneAndNext();
      }}
    >
      <SkipForward className="size-3" />
      {variant === "label" && "Done & next"}
    </Button>
  );
};
