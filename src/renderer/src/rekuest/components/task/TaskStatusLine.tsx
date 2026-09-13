import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RekuestTask } from "@/linkers";
import { useMemo } from "react";
import {
  TaskEventKind,
  LiveTaskFragment,
  useCancelMutation,
} from "../../api/graphql";
import { deriveLiveState } from "../../hooks/useTasks";
import { isTerminalEvent } from "../../lib/taskTracker";
import { TaskStatusIcon, formatEventKind } from "../hovers/status";

/**
 * Shared status presentation for an task: icon, action name, formatted
 * status, progress bar, latest message and cancel / detail actions. Used by
 * the global toast and the background tasks panel so both stay consistent.
 */
export const TaskStatusLine = (props: {
  task: LiveTaskFragment;
  compact?: boolean;
  showCancel?: boolean;
  showLink?: boolean;
}) => {
  const { task, compact, showCancel, showLink } = props;
  const live = useMemo(() => deriveLiveState(task), [task]);

  const [cancel, { loading: cancelling }] = useCancelMutation({
    variables: { input: { task: task.id } },
  });

  const running =
    !task.isDone && !isTerminalEvent(task.latestEventKind);
  const canceling =
    task.latestEventKind === TaskEventKind.Cancelling;

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-row items-center gap-2">
        <TaskStatusIcon
          kind={task.latestEventKind}
          isDone={task.isDone}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {live.actionName || "Unknown action"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatEventKind(task.latestEventKind)}
        </span>
      </div>

      {running &&
        (live.progress != null ? (
          <div className="flex flex-row items-center gap-2">
            <Progress value={live.progress} className="h-1.5 flex-1" />
            <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
              {live.progress}%
            </span>
          </div>
        ) : (
          // No PROGRESS event yet — show an indeterminate loading bar.
          <div className="h-1.5 w-full animate-pulse rounded-full bg-primary/30" />
        ))}

      {!compact && live.message && !live.error && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {live.message}
        </p>
      )}

      {(showLink || (showCancel && running)) && (
        <div className="flex flex-row items-center gap-2">
          {showLink && (
            <RekuestTask.DetailLink
              object={task}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              View
            </RekuestTask.DetailLink>
          )}
          {showCancel && running && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              disabled={cancelling || canceling}
              onClick={() => cancel()}
            >
              {canceling ? "Canceling…" : "Cancel"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
