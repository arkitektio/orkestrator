import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import {
  TodoItemStructureFragment,
  TodoStatus,
  useSetTodoStructureStatusMutation,
} from "@/kraph/api/graphql";
import { Check, Play } from "lucide-react";

/**
 * Doing and Done for one object on a todo item: on the object's own page the
 * object needs no chip, only "who is on this, is it finished?". The active one
 * is filled; pressing it again takes it back to To do. The item comes back in
 * the answer (its column may have moved), so boards and lists follow without a
 * refetch.
 */
export const TodoStatusButtons = ({ structure }: { structure: TodoItemStructureFragment }) => {
  const [setStatus, { loading }] = useSetTodoStructureStatusMutation();
  const move = (status: TodoStatus) =>
    setStatus({ variables: { id: structure.id, status } }).catch(
      reportErrorAs(
        status === TodoStatus.Done
          ? "Couldn't mark it done"
          : status === TodoStatus.Doing
            ? "Couldn't mark it as doing"
            : "Couldn't put it back to To do",
      ),
    );

  const doing = structure.status === TodoStatus.Doing;
  const done = structure.status === TodoStatus.Done;
  const who = done ? structure.doneBy : doing ? structure.startedBy : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant={doing ? "default" : "outline"}
          disabled={loading}
          aria-pressed={doing}
          title={doing ? "Back to To do" : "I'm on it"}
          onClick={() => move(doing ? TodoStatus.Todo : TodoStatus.Doing)}
        >
          <Play className="size-4" />
          Doing
        </Button>
        <Button
          size="sm"
          variant={done ? "default" : "outline"}
          disabled={loading}
          aria-pressed={done}
          title={done ? "Back to To do" : "Mark as done"}
          onClick={() => move(done ? TodoStatus.Todo : TodoStatus.Done)}
        >
          <Check className="size-4" />
          Done
        </Button>
      </div>
      {who && (
        <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
          {done ? "by" : "with"} <StructureDisplay identifier="@lok/user" id={who} variant="chip" />
        </span>
      )}
    </div>
  );
};
