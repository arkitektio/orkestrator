import {
  CheckCircle,
  CircleHelp,
  Clock,
  Hand,
  Loader,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { TaskEventKind } from "../api/graphql";

/**
 * Single source of truth for the task status vocabulary: how a task's
 * `latestEventKind` / `isDone` pair maps to lifecycle buckets, labels, icons
 * and colors. Every surface (cards, hero panels, gantt bars, dashboard
 * widgets, filter chips) derives from here so the same state never renders
 * with conflicting semantics.
 */

export type TaskStatusBucket =
  | "done"
  | "error"
  | "cancelled"
  | "lost"
  | "paused"
  | "held"
  | "queued"
  | "running";

/**
 * Coarse lifecycle bucket for a task, from its latest event + done flag.
 *
 * The kind decides first: the server sets `isDone` on EVERY terminal kind, so
 * checking the flag first would file a failed or lost task under "done".
 * `isDone` only settles the kinds that say nothing about the outcome.
 *
 * `lost` is its own bucket, not an error: the agent died while the task ran,
 * so how it ended is unknown (it may even have finished — a later report is
 * kept as `LATE_REPORT`, never replacing the LOST).
 *
 * `held` waits for a person to approve it (a child an agent asked for, or a
 * task's own hold); a `DENIED` child never ran, so it files under cancelled.
 */
export const statusBucket = (
  kind: TaskEventKind | null | undefined,
  isDone?: boolean | null,
): TaskStatusBucket => {
  switch (kind) {
    case TaskEventKind.Completed:
      return "done";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "error";
    case TaskEventKind.Lost:
      return "lost";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
    case TaskEventKind.Denied:
      return "cancelled";
  }
  if (isDone) return "done";
  switch (kind) {
    case TaskEventKind.Queued:
      return "queued";
    case TaskEventKind.Paused:
      return "paused";
    case TaskEventKind.Held:
      return "held";
    default:
      return "running";
  }
};

export const formatEventKind = (kind: TaskEventKind) =>
  kind.charAt(0) + kind.slice(1).toLowerCase().replace(/_/g, " ");

/** Small status icon (check / cross / clock / spinner) for a task. */
export const TaskStatusIcon = ({
  kind,
  isDone,
  className = "h-4 w-4 shrink-0",
}: {
  kind: TaskEventKind;
  isDone: boolean;
  className?: string;
}) => {
  switch (statusBucket(kind, isDone)) {
    case "done":
      return <CheckCircle className={`${className} text-success`} />;
    case "error":
      return <XCircle className={`${className} text-destructive`} />;
    case "cancelled":
      return <XCircle className={`${className} text-muted-foreground`} />;
    case "lost":
      return <CircleHelp className={`${className} text-warning`} />;
    case "paused":
      return <PauseCircle className={`${className} text-warning`} />;
    case "held":
      return <Hand className={`${className} text-warning`} />;
    case "queued":
      return <Clock className={`${className} text-muted-foreground`} />;
    default:
      return (
        <Loader className={`${className} text-muted-foreground animate-spin`} />
      );
  }
};

/** Text color for compact status labels (dashboard widget, list rows). */
export const statusTextColor = (
  kind: TaskEventKind | null | undefined,
  isDone?: boolean | null,
): string => {
  if (kind === TaskEventKind.Bound) return "text-info";
  if (kind === TaskEventKind.Progress) return "text-warning";
  switch (statusBucket(kind, isDone)) {
    case "done":
      return "text-success";
    case "error":
      return "text-destructive";
    case "lost":
    case "paused":
    case "held":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
};

/** Text color for a single event kind in log views (one color per kind). */
export const eventKindColor = (kind: TaskEventKind): string => {
  switch (kind) {
    case TaskEventKind.Completed:
      return "text-success";
    case TaskEventKind.Yield:
      return "text-spectrum-violet";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "text-destructive";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "text-warning";
    case TaskEventKind.Bound:
      return "text-info";
    case TaskEventKind.Delegate:
      return "text-info";
    case TaskEventKind.Progress:
      return "text-warning";
    case TaskEventKind.Lost:
    case TaskEventKind.Paused:
    case TaskEventKind.Held:
      return "text-warning";
    case TaskEventKind.Decided:
      return "text-info";
    case TaskEventKind.Denied:
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
};

/**
 * Background tint for the brief flash a row gives when an event of this kind
 * arrives. Same hue per kind as {@link eventKindColor}, so a yield reads purple
 * and a failure red wherever they show up. Literal class names — Tailwind only
 * sees what is spelled out.
 */
export const eventKindTint = (
  kind: TaskEventKind | null | undefined,
): string => {
  switch (kind) {
    case TaskEventKind.Completed:
      return "bg-success/25";
    case TaskEventKind.Yield:
      return "bg-spectrum-violet/25";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "bg-destructive/25";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "bg-warning/25";
    case TaskEventKind.Bound:
    case TaskEventKind.Delegate:
      return "bg-info/25";
    case TaskEventKind.Progress:
      return "bg-warning/20";
    case TaskEventKind.Lost:
    case TaskEventKind.Paused:
    case TaskEventKind.Held:
      return "bg-warning/25";
    case TaskEventKind.Effect:
    case TaskEventKind.LateReport:
      return "bg-muted";
    default:
      return "bg-primary/15";
  }
};

/** Fill, border and text classes for gantt/timeline bars keyed by event kind. */
export const statusBarColor = (
  status: TaskEventKind | undefined | string,
): string => {
  switch (status) {
    case TaskEventKind.Completed:
      return "bg-success border-success text-success-foreground";
    case TaskEventKind.Yield:
      return "bg-spectrum-violet border-spectrum-violet text-background";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "bg-destructive border-destructive text-background";
    case TaskEventKind.Cancelled:
      return "bg-muted-foreground border-muted-foreground text-background";
    case TaskEventKind.Bound:
      return "bg-info border-info text-info-foreground";
    case TaskEventKind.Lost:
    case TaskEventKind.Paused:
    case TaskEventKind.Held:
      return "bg-warning border-warning text-warning-foreground";
    default:
      return "bg-muted-foreground border-muted-foreground text-background";
  }
};

/**
 * Subtle color theme for hero/status panels, reusing the same vocabulary as
 * {@link TaskStatusIcon}.
 */
export const statusTheme = (task: {
  latestEventKind: TaskEventKind;
  isDone: boolean;
}): { ring: string; bg: string; text: string; label: string } => {
  const kind = task.latestEventKind;
  switch (statusBucket(kind, task.isDone)) {
    case "done":
      return {
        ring: "ring-success/20",
        bg: "bg-success/5",
        text: "text-success",
        label: "Completed",
      };
    case "error":
      return {
        ring: "ring-destructive/20",
        bg: "bg-destructive/5",
        text: "text-destructive",
        label: formatEventKind(kind),
      };
    case "cancelled":
      return {
        ring: "ring-muted-foreground/20",
        bg: "bg-muted/40",
        text: "text-muted-foreground",
        label: formatEventKind(kind),
      };
    case "lost":
    case "paused":
    case "held":
      return {
        ring: "ring-warning/20",
        bg: "bg-warning/5",
        text: "text-warning",
        label: formatEventKind(kind),
      };
    default:
      return {
        ring: "ring-primary/20",
        bg: "bg-primary/5",
        text: "text-primary",
        label: formatEventKind(kind),
      };
  }
};

/** A task can be cancelled/interrupted for as long as it isn't done. */
export const isCancelable = (task: { isDone?: boolean | null }) =>
  task.isDone !== true;

export const isInterruptable = (task: { isDone?: boolean | null }) =>
  task.isDone !== true;

/**
 * A paused task waits for someone to resume it. A task that waits for a
 * decision is HELD instead, and is answered with `decide` (see {@link isHeld}).
 */
export const isResumable = (task: {
  isDone?: boolean | null;
  latestEventKind: TaskEventKind;
}) => task.isDone !== true && task.latestEventKind === TaskEventKind.Paused;

/** A held task waits for a person to approve or deny it (`decide`). */
export const isHeld = (task: {
  isDone?: boolean | null;
  latestEventKind: TaskEventKind;
}) => task.isDone !== true && task.latestEventKind === TaskEventKind.Held;

/** Pausing is offered while the task runs and is not already pausing/paused. */
export const isPausable = (task: {
  isDone?: boolean | null;
  latestEventKind: TaskEventKind;
}) =>
  task.isDone !== true &&
  statusBucket(task.latestEventKind, task.isDone) === "running" &&
  task.latestEventKind !== TaskEventKind.Pausing;

/**
 * Coarse lifecycle filter-chip options shared by the org-wide and per-agent
 * task pages. The server dropped the `TaskStatus` vocabulary in favour of the
 * `isDone` flag; every finer-grained distinction it used to offer (cancelled,
 * critical, assigning) is already covered by {@link TASK_STATE_FILTER_OPTIONS}.
 */
export const TASK_DONE_FILTER_OPTIONS: {
  label: string;
  value: boolean;
}[] = [
  { label: "Running", value: false },
  { label: "Done", value: true },
];

export const TASK_STATE_FILTER_OPTIONS: {
  label: string;
  value: TaskEventKind;
}[] = [
  { label: "Queued", value: TaskEventKind.Queued },
  { label: "Assigned", value: TaskEventKind.Bound },
  { label: "Yielded", value: TaskEventKind.Yield },
  { label: "Done", value: TaskEventKind.Completed },
  { label: "Error", value: TaskEventKind.Failed },
  { label: "Cancelled", value: TaskEventKind.Cancelled },
  { label: "Critical", value: TaskEventKind.Critical },
  { label: "Lost", value: TaskEventKind.Lost },
  { label: "Paused", value: TaskEventKind.Paused },
];
