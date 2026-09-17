import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { TaskEventKind } from "../../api/graphql";
import { statusBucket } from "../../lib/taskStatus";
import { isTaskLive } from "../../lib/taskTracker";

/**
 * What the ring is showing. The first three are a task that is still working;
 * the rest are how it ended.
 */
export type TaskRingState =
  | "queued"
  | "running"
  | "stopping"
  | "done"
  | "error"
  | "cancelled";

export const taskRingState = (task: {
  latestEventKind: TaskEventKind;
  isDone?: boolean | null;
}): TaskRingState => {
  if (isTaskLive(task)) {
    switch (task.latestEventKind) {
      case TaskEventKind.Queued:
        return "queued";
      case TaskEventKind.Cancelling:
      case TaskEventKind.Interrupting:
        return "stopping";
      default:
        return "running";
    }
  }
  switch (statusBucket(task.latestEventKind, task.isDone)) {
    case "done":
      return "done";
    case "error":
      return "error";
    default:
      return "cancelled";
  }
};

const COLOR: Record<TaskRingState, string> = {
  queued: "text-muted-foreground",
  running: "text-primary",
  stopping: "text-orange-400",
  done: "text-green-500",
  error: "text-destructive",
  cancelled: "text-muted-foreground",
};

const RADIUS = 6.25;
/** Arc shown while a task works without reporting how far along it is. */
const INDETERMINATE_ARC = 0.28;
/** Smallest determinate arc: 1% should still be visible as "it has begun". */
const MIN_ARC = 0.04;

/**
 * A task's state as a small ring — the status icon of the rail's task island.
 *
 * One shape carries the whole lifecycle, so a change of state is a change *of*
 * the ring rather than a swap between unrelated icons: dashed and breathing
 * while queued, an arc chasing itself while the task works, the same arc
 * filling up once PROGRESS events say how far along it is, then closing into a
 * full circle with a check or a cross drawn inside when it ends.
 *
 * The spin is CSS (`animate-spin`), not a JS loop — it runs for as long as the
 * task does. Reduced motion holds the arc still; the state is still readable
 * from its colour, its length and the glyph.
 */
export const TaskProgressRing = ({
  kind,
  isDone,
  progress,
  className,
}: {
  kind: TaskEventKind;
  isDone?: boolean | null;
  /** 0–100 from the latest PROGRESS event, if any arrived. */
  progress?: number | null;
  className?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const state = taskRingState({ latestEventKind: kind, isDone });

  const working = state === "running" || state === "stopping";
  const determinate = state === "running" && progress != null;
  const spinning = working && !determinate;

  const arc =
    state === "queued"
      ? 0
      : determinate
        ? Math.max(MIN_ARC, Math.min(1, (progress ?? 0) / 100))
        : working
          ? INDETERMINATE_ARC
          : 1;

  const glyph =
    state === "done"
      ? "M5.1 8.3 7.1 10.3 10.9 5.9"
      : state === "error" || state === "cancelled"
        ? "M5.7 5.7 10.3 10.3 M10.3 5.7 5.7 10.3"
        : null;

  const transition = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", bounce: 0, duration: 0.5 } as const);

  return (
    <span
      aria-hidden
      data-state={state}
      className={cn(
        "relative inline-flex h-4 w-4 shrink-0",
        COLOR[state],
        state === "queued" && !reduceMotion && "animate-pulse",
        className,
      )}
    >
      {/* Rotated so the arc starts at twelve o'clock. Its own layer, because it
          is the one that spins — the glyph above must stay upright. */}
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className={cn(
          "absolute inset-0 h-full w-full -rotate-90",
          spinning && !reduceMotion && "animate-spin",
        )}
      >
        <circle
          cx="8"
          cy="8"
          r={RADIUS}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeDasharray={state === "queued" ? "2.2 2.2" : undefined}
          opacity={state === "queued" ? 0.7 : 0.2}
        />
        {arc > 0 && (
          <motion.circle
            cx="8"
            cy="8"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: arc }}
            transition={transition}
          />
        )}
      </svg>
      {glyph && (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="absolute inset-0 h-full w-full"
        >
          <motion.path
            d={glyph}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.15 }
            }
          />
        </svg>
      )}
    </span>
  );
};
