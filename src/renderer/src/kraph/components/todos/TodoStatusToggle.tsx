import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { TodoItemStructureFragment, TodoStatus, useSetTodoStructureStatusMutation } from "@/kraph/api/graphql";
import { Check, Play } from "lucide-react";

/**
 * Doing and Done as two small symbols, for a tight row (the page bar). The
 * active one is filled; pressing it again puts the object back to To do.
 * `TodoStatusButtons` is the labelled form of the same thing.
 */
export const TodoStatusToggle = ({ structure }: { structure: TodoItemStructureFragment }) => {
  const [setStatus, { loading }] = useSetTodoStructureStatusMutation();
  const move = (status: TodoStatus) =>
    setStatus({ variables: { id: structure.id, status } }).catch(reportErrorAs("Couldn't change the status"));

  const toggle = (status: TodoStatus, Icon: typeof Play, label: string) => {
    const active = structure.status === status;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={active ? "default" : "ghost"}
            className={cn("size-7", !active && "text-muted-foreground")}
            disabled={loading}
            aria-pressed={active}
            aria-label={active ? `${label} — press to put it back to To do` : label}
            onClick={() => move(active ? TodoStatus.Todo : status)}
          >
            <Icon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{active ? `${label} · press again for To do` : `Mark as ${label.toLowerCase()}`}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      {toggle(TodoStatus.Doing, Play, "Doing")}
      {toggle(TodoStatus.Done, Check, "Done")}
    </div>
  );
};
