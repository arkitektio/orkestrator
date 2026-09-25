import { Button } from "@/core/ui/button";
import { Progress } from "@/core/ui/progress";
import { RekuestTask } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import {
  LiveTaskFragment,
  TaskEventKind,
  useCancelMutation,
} from "@/rekuest/api/graphql";
import { deriveLiveState } from "@/rekuest/hooks/useTasks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Loader, Square, X } from "lucide-react";
import { memo, useMemo, useState } from "react";
import {
  eventKindTint,
  formatEventKind,
  statusTextColor,
} from "../../lib/taskStatus";
import { formatDuration } from "../../lib/taskTimeline";
import { isTaskLive } from "../../lib/taskTracker";
import { TaskProgressRing } from "../task/TaskProgressRing";
import { DynamicYieldDisplay } from "../task/YieldDisplay";

export const taskIslandHeaderId = (id: string) => `task-island-header-${id}`;
const detailId = (id: string) => `task-island-detail-${id}`;

/**
 * A stable head start for a row's sweep, from its id. Three working rows
 * sweeping in lockstep read as one banner flashing; out of step they read as
 * three things happening. Derived from the id, not the row's index, so a
 * re-sort does not change it.
 */
const sweepDelay = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) % 6;
  }
  return `${-hash * 0.3}s`;
};

/**
 * Open / cancel / dismiss. Its own component so the cancel mutation hook only
 * exists for the one row that is open, not for every row in the island.
 */
const RowControls = ({
  task,
  live,
  onDismiss,
}: {
  task: LiveTaskFragment;
  live: boolean;
  onDismiss: () => void;
}) => {
  const [cancel, { loading: cancelRequested }] = useCancelMutation({
    variables: { input: { task: task.id } },
  });
  const cancelling =
    cancelRequested ||
    task.latestEventKind === TaskEventKind.Cancelling ||
    task.latestEventKind === TaskEventKind.Interrupting;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <RekuestTask.DetailLink
        object={task}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open task"
        title="Open task"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </RekuestTask.DetailLink>
      {live ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          disabled={cancelling}
          onClick={() => cancel()}
          aria-label="Cancel task"
          title={cancelling ? "Cancelling…" : "Cancel task"}
        >
          {cancelling ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Square className="h-3 w-3 fill-current" />
          )}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="Dismiss task"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

/** Everything a row shows once it is open. */
const RowDetail = ({
  task,
  live,
  onDismiss,
}: {
  task: LiveTaskFragment;
  live: ReturnType<typeof deriveLiveState>;
  onDismiss: () => void;
}) => {
  const working = isTaskLive(task);
  const failed = !working && live.error != undefined;
  const yieldEventId = task.events.find(
    (event) => event.kind === TaskEventKind.Yield,
  )?.id;

  const duration =
    !working && task.finishedAt
      ? formatDuration(
          new Date(task.finishedAt).getTime() -
            new Date(task.createdAt).getTime(),
        )
      : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-2.5 pb-2">
      {live.message && !failed && (
        <p className="line-clamp-2 min-w-0 break-words text-[11px] leading-snug text-muted-foreground">
          {live.message}
        </p>
      )}

      {failed && (
        // Server errors arrive as arbitrary text: a stack trace, or a single
        // unbroken token like a URL or a UUID, which would otherwise push the
        // row wider than the rail. Break anywhere, and cap the height so one
        // long failure cannot take the rail over.
        <div className="max-h-24 w-full min-w-0 overflow-y-auto whitespace-pre-wrap break-words rounded bg-red-500/10 p-1.5 text-[11px] leading-snug text-red-500">
          {live.error}
        </div>
      )}

      {live.yield && live.actionId && (
        // A yield is a rendered widget — an image, a table — sized by its own
        // registry entry, not by this island. Contain it rather than trust it;
        // the mask fades an over-tall one out instead of hard-clipping it.
        // Keyed on the YIELD event's id, so each new result fades in — even
        // when its values equal the last one's.
        <motion.div
          key={yieldEventId ?? "yield"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="max-h-24 min-w-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        >
          <DynamicYieldDisplay
            values={live.yield}
            actionId={live.actionId}
            minimal
          />
        </motion.div>
      )}

      {working &&
        (live.progress != null ? (
          <Progress value={live.progress} className="h-1" />
        ) : (
          // No PROGRESS event yet: a travelling segment instead of a bar that
          // would claim 0%.
          <div
            aria-hidden
            className="h-1 w-full overflow-hidden rounded-md bg-muted"
          >
            <div className="h-full w-1/3 rounded-md bg-primary/70 animate-task-sweep" />
          </div>
        ))}

      {/* The strip is anchored at its bottom, so an opening row grows upward
          and this line ends up where the collapsed row was — the controls land
          under the pointer that opened it. */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[11px]",
            statusTextColor(task.latestEventKind, task.isDone),
          )}
        >
          {formatEventKind(task.latestEventKind)}
          {duration && (
            <span className="text-muted-foreground"> · {duration}</span>
          )}
        </span>
        <RowControls task={task} live={working} onDismiss={onDismiss} />
      </div>
    </div>
  );
};

export type TaskIslandRowProps = {
  id: string;
  task: LiveTaskFragment;
  expanded: boolean;
  pinned: boolean;
  /** Changes only when the rows re-sort; the one thing that animates position. */
  orderKey: string;
  onHover: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCollapse: (id: string) => void;
  onDismiss: (id: string) => void;
};

/**
 * One task in the rail's island.
 *
 * Collapsed it is a single line — ring, name, percentage — that still shows
 * the task is alive: a band of light sweeps across it while it works, and it
 * flashes in the colour of each event as the event arrives. Open, it unfolds
 * in place to the latest message, the error, the latest result, a progress bar
 * and the controls.
 *
 * A disclosure: the header is a real `<button aria-expanded>` holding nothing
 * interactive, and the controls live in the region it discloses.
 *
 * Takes its task as a prop rather than looking it up: every event on ANY task
 * gives the task list a new identity, so a lookup hook in here would re-render
 * every row on every event. With the task passed in, `memo` holds for the rows
 * whose task did not change.
 */
export const TaskIslandRow = memo(function TaskIslandRow({
  id,
  task,
  expanded,
  pinned,
  orderKey,
  onHover,
  onTogglePin,
  onCollapse,
  onDismiss,
}: TaskIslandRowProps) {
  const reduceMotion = useReducedMotion();
  const live = useMemo(() => deriveLiveState(task), [task]);
  const working = isTaskLive(task);

  // The event that was already the latest when this row appeared is not news.
  // `useState` rather than a ref: it is read during render.
  const eventId = live.event?.id;
  const [seenAtMount] = useState(eventId);
  const pulsing = eventId !== undefined && eventId !== seenAtMount;

  const unfold = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", bounce: 0, duration: 0.35 } as const);

  return (
    <motion.div
      // `position`, not plain `layout`: the row's height animates on its own
      // below, and a full layout animation would scale the text while it does.
      layout="position"
      layoutDependency={orderKey}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={unfold}
      className="min-w-0 overflow-hidden [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/50"
    >
      <div
        data-testid="task-island-row"
        data-expanded={expanded}
        data-pinned={pinned}
        aria-busy={working}
        onKeyDown={(event) => {
          if (event.key === "Escape" && expanded) {
            event.stopPropagation();
            onCollapse(id);
          }
        }}
        className={cn(
          "relative min-w-0 transition-colors duration-200",
          expanded && "bg-muted/40",
        )}
      >
        {/* Busy sweep: a soft band of light travelling across a working row. */}
        {working && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-task-sweep"
            style={{ animationDelay: sweepDelay(id) }}
          />
        )}

        {/* Event pulse. Re-keyed per event so each one restarts the animation
            — including two events of the same kind in a row. */}
        {pulsing && (
          <span
            key={eventId}
            aria-hidden
            data-testid="task-event-pulse"
            className={cn(
              "pointer-events-none absolute inset-0 animate-task-pulse",
              eventKindTint(live.event?.kind),
            )}
          />
        )}

        {/* The rail is 240px and an action name can be any length, so every
            part of this line is either `shrink-0` or allowed to truncate.
            `min-w-0` on the flexible one is what makes `truncate` engage at
            all — without it a flex item's automatic minimum size is its
            content, and the row grows past the rail instead of clipping. */}
        <button
          type="button"
          id={taskIslandHeaderId(id)}
          aria-expanded={expanded}
          aria-controls={expanded ? detailId(id) : undefined}
          // `pointermove`, not `mouseenter`: a row opening moves its
          // neighbours, and browsers fire `mouseenter` on whatever slid under
          // a pointer that never moved. Only a real movement is intent.
          onPointerMove={() => onHover(id)}
          onClick={() => onTogglePin(id)}
          className="relative flex w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden px-2.5 py-2 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <TaskProgressRing
            kind={task.latestEventKind}
            isDone={task.isDone}
            progress={live.progress}
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-xs font-medium",
              !working && "text-foreground/70",
            )}
          >
            {live.actionName || "Unknown action"}
          </span>
          {live.progress != null && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {live.progress}%
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="detail"
              id={detailId(id)}
              role="region"
              aria-labelledby={taskIslandHeaderId(id)}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={unfold}
              className="relative min-w-0 overflow-hidden"
            >
              <RowDetail
                task={task}
                live={live}
                onDismiss={() => onDismiss(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
