import { CheckCircle, Clock, Loader, XCircle } from "lucide-react";
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
  | "queued"
  | "running";

/** Coarse lifecycle bucket for a task, from its latest event + done flag. */
export const statusBucket = (
  kind: TaskEventKind | null | undefined,
  isDone?: boolean | null,
): TaskStatusBucket => {
  if (isDone || kind === TaskEventKind.Completed) return "done";
  switch (kind) {
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "error";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "cancelled";
    case TaskEventKind.Queued:
      return "queued";
    default:
      return "running";
  }
};

export const formatEventKind = (kind: TaskEventKind) =>
  kind.charAt(0) + kind.slice(1).toLowerCase();

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
      return <CheckCircle className={`${className} text-green-500`} />;
    case "error":
      return <XCircle className={`${className} text-destructive`} />;
    case "cancelled":
      return <XCircle className={`${className} text-muted-foreground`} />;
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
  if (kind === TaskEventKind.Bound) return "text-blue-500";
  if (kind === TaskEventKind.Progress) return "text-yellow-500";
  switch (statusBucket(kind, isDone)) {
    case "done":
      return "text-green-500";
    case "error":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
};

/** Text color for a single event kind in log views (one color per kind). */
export const eventKindColor = (kind: TaskEventKind): string => {
  switch (kind) {
    case TaskEventKind.Completed:
      return "text-green-500";
    case TaskEventKind.Yield:
      return "text-purple-500";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "text-red-500";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "text-orange-400";
    case TaskEventKind.Bound:
      return "text-blue-500";
    case TaskEventKind.Delegate:
      return "text-blue-400";
    case TaskEventKind.Progress:
      return "text-yellow-500";
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
      return "bg-green-500/25";
    case TaskEventKind.Yield:
      return "bg-purple-500/25";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "bg-red-500/25";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "bg-orange-400/25";
    case TaskEventKind.Bound:
    case TaskEventKind.Delegate:
      return "bg-blue-500/25";
    case TaskEventKind.Progress:
      return "bg-yellow-500/20";
    default:
      return "bg-primary/15";
  }
};

/** Fill + border classes for gantt/timeline bars keyed by event kind. */
export const statusBarColor = (
  status: TaskEventKind | undefined | string,
): string => {
  switch (status) {
    case TaskEventKind.Completed:
      return "bg-green-500 border-green-600";
    case TaskEventKind.Yield:
      return "bg-purple-500 border-purple-600";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "bg-red-500 border-red-600";
    case TaskEventKind.Cancelled:
      return "bg-gray-500 border-gray-600";
    case TaskEventKind.Bound:
      return "bg-blue-500 border-blue-600";
    default:
      return "bg-slate-500 border-slate-600";
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
        ring: "ring-green-500/20",
        bg: "bg-green-500/5",
        text: "text-green-600 dark:text-green-400",
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
];
