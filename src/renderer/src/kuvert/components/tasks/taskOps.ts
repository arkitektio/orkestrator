import { ListTaskListsDocument, ListTasksDocument, TaskFilter, TasksCountDocument, TaskStatus } from "../../api/graphql";

/** What task lists and counts show; refetched (when mounted) after a change to a task. */
export const TASK_VIEWS = [ListTasksDocument, TasksCountDocument, ListTaskListsDocument];

/** Which tasks a view shows: what is to do now, what waits, what is finished. */
export type TaskView = "active" | "snoozed" | "done";

export const TASK_VIEW_FILTERS: Record<TaskView, TaskFilter> = {
  active: { active: true },
  snoozed: { snoozed: true },
  done: { status: TaskStatus.Done },
};

/** Which list a view is narrowed to: every list, tasks on no list, or one list. */
export type ListScope = "all" | "none" | string;

export const listFilter = (scope: ListScope): TaskFilter =>
  scope === "all" ? {} : scope === "none" ? { noList: true } : { list: scope };

/** `<input type="datetime-local">` value for an ISO time (local wall clock), and back. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export const isOverdue = (dueAt: string | null | undefined, now = new Date()) => !!dueAt && new Date(dueAt) < now;

/** "Today 17:00", "Tomorrow", "Mon 3 Oct": short enough for a row. */
export const formatDue = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (diff === 0) return hasTime ? `Today ${time}` : "Today";
  if (diff === 1) return hasTime ? `Tomorrow ${time}` : "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: Math.abs(diff) < 7 ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

/** Snooze presets, as Inbox had them: later today, tomorrow morning, next week. */
export const snoozePresets = (now = new Date()) => {
  const at = (days: number, hour: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
    return d;
  };
  const laterToday = new Date(now.getTime() + 3 * 3_600_000);
  laterToday.setMinutes(0, 0, 0);
  const nextMonday = at(((8 - now.getDay()) % 7) || 7, 8);
  const presets = [
    { label: "Later today", at: laterToday },
    { label: "Tomorrow morning", at: at(1, 8) },
    { label: "Next week", at: nextMonday },
  ];
  // Late in the evening, "later today" is tomorrow already.
  return presets.filter((p) => p.label !== "Later today" || laterToday.getDate() === now.getDate());
};

/** Pinned tasks first; otherwise the server's order stays. */
export const pinnedFirst = <T extends { pinned: boolean }>(tasks: readonly T[]) => [
  ...tasks.filter((t) => t.pinned),
  ...tasks.filter((t) => !t.pinned),
];

/** Colours offered for a task list (user data: shown as a dot, never as chrome). */
export const LIST_COLORS = ["#4f86f7", "#34a853", "#f4b400", "#ea4335", "#a142f4", "#12b5cb", "#ff6d01", "#9aa0a6"];
