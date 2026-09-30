import { cn } from "@/core/util/utils";
import { RekuestTask } from "@/core/linkers";
import { DetailTaskFragment, LogLevel } from "@/rekuest/api/graphql";
import { formatDuration, getEndTime } from "@/rekuest/lib/taskTimeline";
import { eventKindColor, formatEventKind } from "@/rekuest/lib/taskStatus";
import { TaskArgsSection, TaskResultSection } from "./TaskEventLog";
import { TaskStatusLine } from "./TaskStatusLine";
import { describeLaneEvent, formatMarkTime } from "./lane/LaneMark";
import { isYieldLike, ResolvedSelection } from "./lane/selection";

const Heading = (props: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
    {props.children}
  </h3>
);

const LEVEL_COLOR: Partial<Record<LogLevel, string>> = {
  [LogLevel.Warn]: "text-amber-500",
  [LogLevel.Error]: "text-red-500",
  [LogLevel.Critical]: "text-red-500",
};

/** What the lane has selected, in words. */
const SelectedPanel = (props: { resolved: ResolvedSelection }) => {
  const { resolved } = props;
  if (!resolved) return null;

  if (resolved.kind === "child") {
    const child = resolved.child;
    const ms = getEndTime(child) - new Date(child.createdAt).getTime();
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <Heading>Call</Heading>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <TaskStatusLine task={child} compact showLink />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatMarkTime(child.createdAt)}</span>
            <span className="tabular-nums">{formatDuration(ms)}</span>
            {child.parentStep != null && <span>step {child.parentStep}</span>}
          </div>
          {child.callKey && (
            <div className="truncate font-mono text-[10px] text-muted-foreground/70">
              {child.callKey}
            </div>
          )}
        </div>
      </div>
    );
  }

  const e = resolved.event;
  const text = describeLaneEvent(e);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Heading>Event</Heading>
      <div className="flex flex-col gap-1.5 rounded-md border p-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              eventKindColor(e.kind),
            )}
          >
            {formatEventKind(e.kind)}
          </span>
          {e.level && e.level !== LogLevel.Info && (
            <span className={cn("text-[10px] uppercase", LEVEL_COLOR[e.level])}>
              {e.level.toLowerCase()}
            </span>
          )}
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {formatMarkTime(e.createdAt)}
            {e.step != null && ` · step ${e.step}`}
          </span>
        </div>
        {text && (
          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
            {text}
          </p>
        )}
        {e.delegatedTo && (
          <RekuestTask.DetailLink
            object={e.delegatedTo}
            className="text-xs underline-offset-2 hover:underline"
          >
            open delegated task
          </RekuestTask.DetailLink>
        )}
      </div>
    </div>
  );
};

/**
 * Below the lane, side by side: what went in, what the lane has selected, and
 * what came out (the selected yield, else the latest). Columns with nothing to
 * show are left out; it stacks only when the page is narrow.
 */
export const TaskDetailStrip = (props: {
  task: DetailTaskFragment;
  resolved: ResolvedSelection;
}) => {
  const { task, resolved } = props;
  const selectedYield =
    resolved?.kind === "event" && isYieldLike(resolved.event)
      ? resolved.event
      : null;
  // A selected yield is shown as the result, not twice.
  const showSelected = resolved != null && !selectedYield;

  return (
    <div className="@container w-full">
      <div className="grid gap-4 @3xl:grid-flow-col @3xl:auto-cols-fr">
        <TaskArgsSection task={task} />
        {showSelected && <SelectedPanel resolved={resolved} />}
        <TaskResultSection task={task} event={selectedYield} />
      </div>
    </div>
  );
};
