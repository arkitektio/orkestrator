import { TaskEventFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { isTaskLive, isTerminalEvent } from "@/rekuest/lib/taskTracker";

/**
 * The replyer pills above the chat composer, as plain state transitions.
 *
 * A pill is settled by exactly one terminal event, and the callback that
 * delivers it is torn down right after — so anything that drops or overwrites
 * that one update leaves a spinner forever. Everything here is written against
 * that: a settled pill never goes back, and a pill can also be settled from the
 * task itself (the assign result, the cache, a re-query), not only from the
 * event stream.
 */
export type ActiveTaskStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR" | "CANCELLED";

export interface ActiveTask {
  id: string;
  reference: string;
  actionName: string;
  status: ActiveTaskStatus;
  progress?: number | null;
  message?: string | null;
  delegatedName?: string | null;
}

type SettledStatus = Exclude<ActiveTaskStatus, "PENDING" | "RUNNING">;

/** How long a settled pill stays. A failure is read, so it stays longer. */
export const DISMISS_AFTER_MS: Record<SettledStatus, number> = {
  DONE: 3000,
  CANCELLED: 3000,
  ERROR: 10000,
};

export const isSettled = (status: ActiveTaskStatus): status is SettledStatus =>
  status === "DONE" || status === "ERROR" || status === "CANCELLED";

/**
 * Every terminal kind settles — gated on `isTerminalEvent` rather than a
 * hand-picked list, which is how CRITICAL and INTERRUPTED used to fall through
 * to "still running".
 */
export const statusForKind = (kind: TaskEventKind): ActiveTaskStatus => {
  if (!isTerminalEvent(kind)) return "RUNNING";
  if (kind === TaskEventKind.Completed) return "DONE";
  if (kind === TaskEventKind.Cancelled || kind === TaskEventKind.Interrupted) {
    return "CANCELLED";
  }
  return "ERROR";
};

const update = (
  tasks: ActiveTask[],
  reference: string,
  change: (task: ActiveTask) => ActiveTask,
): ActiveTask[] =>
  tasks.map((task) =>
    // Settled is final: a straggling LOG or the assign result must not put the
    // spinner back on a pill nothing will ever settle again.
    task.reference === reference && !isSettled(task.status) ? change(task) : task,
  );

export const startTask = (
  tasks: ActiveTask[],
  reference: string,
  actionName: string,
): ActiveTask[] => [
  ...tasks,
  {
    id: "",
    reference,
    actionName,
    status: "PENDING",
    progress: null,
    message: "Assigning...",
  },
];

export const applyTaskEvent = (
  tasks: ActiveTask[],
  event: TaskEventFragment,
): ActiveTask[] => {
  const reference = event.task.reference;
  if (!reference) return tasks;

  return update(tasks, reference, (task) => ({
    ...task,
    status: statusForKind(event.kind),
    progress: event.progress ?? task.progress,
    message: event.message || task.message,
    delegatedName: event.delegatedTo?.implementation?.action?.name || task.delegatedName,
  }));
};

type TaskState = { isDone?: boolean | null; latestEventKind: TaskEventKind };

const settledStatusOf = (task: TaskState): SettledStatus | null => {
  if (isTaskLive(task)) return null;
  // How it ended, when the task says; flagged done with no terminal kind on
  // record is simply done.
  const status = statusForKind(task.latestEventKind);
  return isSettled(status) ? status : "DONE";
};

/**
 * The assign mutation came back. It races the event stream: a fast replyer can
 * finish before it resolves, so this only ever moves a pill forward — it gives
 * it its id, and settles it if the returned task has already ended.
 */
export const bindTask = (
  tasks: ActiveTask[],
  reference: string,
  task: { id: string } & TaskState,
): ActiveTask[] =>
  update(tasks, reference, (pill) => ({
    ...pill,
    id: task.id,
    status: settledStatusOf(task) ?? "RUNNING",
  }));

export const failTask = (
  tasks: ActiveTask[],
  reference: string,
  message: string,
): ActiveTask[] =>
  update(tasks, reference, (task) => ({ ...task, status: "ERROR", message }));

/**
 * Settle pills from what the tasks themselves say. The event callback is the
 * fast path; this is the one that cannot be missed — it reads the task, which
 * `TaskUpdater` keeps current whether or not the callback saw the event.
 * Returns the same array when nothing changed.
 */
export const settleFromTasks = (
  tasks: ActiveTask[],
  known: readonly ({ id: string } & TaskState)[],
): ActiveTask[] => {
  let changed = false;

  const next = tasks.map((pill) => {
    if (!pill.id || isSettled(pill.status)) return pill;
    const task = known.find((candidate) => candidate.id === pill.id);
    const status = task && settledStatusOf(task);
    if (!status) return pill;
    changed = true;
    return { ...pill, status };
  });

  return changed ? next : tasks;
};
