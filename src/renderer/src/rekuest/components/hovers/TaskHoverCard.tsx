import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "@/components/hover/HoverShell";
import { Progress } from "@/components/ui/progress";
import { Object } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useHoverTaskQuery } from "../../api/graphql";
import { TaskStatusIcon, formatEventKind } from "../../lib/taskStatus";

export const TaskHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useHoverTaskQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load task details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const task = data.task;
  const latestProgress = task.events.find(
    (event) => event.progress != null,
  )?.progress;
  const latestMessage = task.events.find(
    (event) => event.message,
  )?.message;

  return (
    <HoverShell
      title={task.action.name}
      subtitle={task.reference ?? undefined}
      icon={
        <TaskStatusIcon
          kind={task.latestEventKind}
          isDone={task.isDone}
        />
      }
    >
      <div className="flex flex-col gap-1">
        <HoverRow
          label="Status"
          value={formatEventKind(task.latestEventKind)}
        />
        {task.implementation?.agent && (
          <HoverRow
            label="Agent"
            value={task.implementation.agent.name}
          />
        )}
        <HoverRow
          label="Started"
          value={formatDistanceToNow(new Date(task.createdAt), {
            addSuffix: true,
          })}
        />
        {task.finishedAt && (
          <HoverRow
            label="Finished"
            value={formatDistanceToNow(new Date(task.finishedAt), {
              addSuffix: true,
            })}
          />
        )}
      </div>

      {!task.isDone && latestProgress != null && (
        <div className="flex flex-col gap-1">
          <Progress value={latestProgress} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground text-right">
            {latestProgress}%
          </span>
        </div>
      )}

      {latestMessage && (
        <div className="flex flex-col gap-1">
          <HoverSectionLabel>Latest</HoverSectionLabel>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {latestMessage}
          </p>
        </div>
      )}
    </HoverShell>
  );
};

export default TaskHoverCard;
