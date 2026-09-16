import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLiveTask, useTask } from "@/rekuest/hooks/useTasks";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useEffect, useState } from "react";
import {
  dismiss,
  useTaskNotifications,
} from "../../lib/taskNotifications";
import { TaskStatusLine } from "../task/TaskStatusLine";
import { TaskStatusIcon } from "../../lib/taskStatus";
import {
  borderColorForLiveState,
  DynamicYieldDisplay,
} from "../task/YieldDisplay";

/**
 * A single live task notification card. Ported from the former sonner
 * `TaskToast` — same content (status line, error block, yield display) and the
 * same auto-dismiss behavior, but rendered inside our own animated stack so we
 * own the layout (no sonner height re-measuring).
 */
const TaskNotificationCard = ({ id }: { id: string }) => {
  const task = useTask({ task: id });
  const live = useLiveTask({ task: id });

  // Success and cancellation auto-dismiss after a delay long enough to read the
  // result. Errors AND tasks that yielded a result (e.g. an image) persist
  // until closed via the X button, so the result stays visible to inspect.
  useEffect(() => {
    if ((live.done || live.cancelled) && !live.yield && !live.error) {
      const timer = setTimeout(() => dismiss(id), 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [live.done, live.cancelled, live.yield, live.error, id]);

  if (!task) {
    return null;
  }

  return (
    <div
      className={cn(
        // `w-full`, not a fixed width: the card used to be `w-80` inside a
        // `w-80` container with padding, so it overflowed by exactly that
        // padding. The container owns the width; the card fills it.
        // `min-w-0` lets the truncation inside actually engage.
        "relative flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-md border bg-background p-3 shadow-lg",
        borderColorForLiveState(live),
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="min-w-0 pr-7">
        <TaskStatusLine task={task} showCancel showLink />
      </div>

      {live.error && (
        // Server errors arrive as arbitrary text: a stack trace, or a single
        // unbroken token like a URL or a UUID, which would otherwise push the
        // card wider than its container. Break anywhere, and cap the height so
        // one long failure cannot bury the tasks underneath it.
        <div className="max-h-32 w-full min-w-0 overflow-y-auto break-words whitespace-pre-wrap rounded bg-red-500/10 p-2 text-xs text-red-500">
          {live.error}
        </div>
      )}

      {live.yield && live.actionId && (
        // A yield is a rendered widget — an image, a table — sized by its own
        // registry entry, not by this card. Contain it rather than trust it.
        <div className="min-w-0 overflow-hidden">
          <DynamicYieldDisplay values={live.yield} actionId={live.actionId} />
        </div>
      )}
    </div>
  );
};

/**
 * Compact collapsed trigger: a small pill summarizing the latest task (icon,
 * name, progress) plus a `+N` count. Hovering / clicking it expands the full
 * stack. Re-keyed on the newest id so it pops when a fresh task arrives.
 */
const TaskNotificationPill = ({
  id,
  count,
  onClick,
}: {
  id: string;
  count: number;
  onClick: () => void;
}) => {
  const task = useTask({ task: id });
  const live = useLiveTask({ task: id });

  if (!task) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show tasks"
      // The rail is 240px and an action name can be any length, so every part
      // of this row is either `shrink-0` or allowed to truncate. `min-w-0` on
      // the flexible one is what makes `truncate` engage at all — without it a
      // flex item's automatic minimum size is its content, and the row grows
      // past the rail instead of clipping.
      className={cn(
        "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border bg-background/70 px-2.5 py-1.5 text-left transition-colors hover:bg-background",
        borderColorForLiveState(live),
      )}
    >
      <TaskStatusIcon
        kind={task.latestEventKind}
        isDone={task.isDone}
        className="h-4 w-4 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {live.actionName || "Unknown action"}
      </span>
      {live.progress != null && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {live.progress}%
        </span>
      )}
      {count > 1 && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          +{count - 1}
        </span>
      )}
    </button>
  );
};

const ENTER = { opacity: 0, y: 15, scale: 0.96 };
const SHOWN = { opacity: 1, y: 0, scale: 1 };
const LEAVE = { opacity: 0, y: -10, scale: 0.95 };
const SPRING = { type: "spring", bounce: 0.3, duration: 0.35 } as const;

/**
 * Running tasks, as a strip at the foot of the rail.
 *
 * Deliberately where a browser puts its now-playing control: tasks are ambient
 * and long-running, so they belong in the chrome that is always there rather
 * than floating over the page, where they covered content and moved with
 * nothing.
 *
 * Collapsed is a single row summarising the latest task; hover or focus fans
 * every active task out into a card list to the RIGHT of the rail. Popping out
 * rather than expanding in place matters here — growing inside a 240px column
 * would shove the pinned routes above it around every time a task started.
 *
 * Reads its ids from the `taskNotifications` store, which `TaskUpdater` feeds
 * from the WatchMyTasks subscription, so a fresh task still pops in on create.
 */
export const TaskNotificationStack = () => {
  const ids = useTaskNotifications();
  const [expanded, setExpanded] = useState(false);

  if (ids.length === 0) {
    return null;
  }

  return (
    // `min-w-0` so this section can be narrower than the pill's content wants
    // to be; without it the rail's own flex column would be widened by a long
    // action name rather than the name being truncated. `shrink-0` so a long
    // pin list above squeezes the scrolling list, not this.
    <div className="min-w-0 shrink-0 px-2 pb-2">
      <HoverCard
        open={expanded}
        onOpenChange={setExpanded}
        openDelay={80}
        closeDelay={180}
      >
        <HoverCardTrigger asChild>
          <motion.div
            layout
            initial={ENTER}
            animate={SHOWN}
            transition={SPRING}
            className="w-full min-w-0"
          >
            <TaskNotificationPill
              id={ids[0]}
              count={ids.length}
              onClick={() => setExpanded((current) => !current)}
            />
          </motion.div>
        </HoverCardTrigger>

        <HoverCardContent
          side="right"
          align="end"
          sideOffset={8}
          // Capped against the viewport, not just given a width: at 320px plus
          // the rail plus the gaps, a narrow window would otherwise push this
          // off-screen. Radix flips it on collision, and this keeps it fitting
          // whichever side it lands on.
          className="flex max-h-[70vh] w-80 max-w-[calc(100vw-var(--rail-width)-2.5rem)] flex-col gap-2 overflow-y-auto overflow-x-hidden p-2"
        >
          <AnimatePresence initial={false}>
            {ids.map((id) => (
              <motion.div
                key={id}
                layout
                initial={ENTER}
                animate={SHOWN}
                exit={LEAVE}
                transition={SPRING}
                // `shrink-0`: this is a scrolling flex column, and without it
                // the cards compress into each other as tasks pile up instead
                // of the list scrolling.
                className="w-full min-w-0 shrink-0"
              >
                <TaskNotificationCard id={id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
