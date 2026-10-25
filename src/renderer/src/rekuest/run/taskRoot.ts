import {TaskEventKind} from '../api/graphql';
import {pendingHolds, type HoldRequest} from '../lib/holds';
import {isTerminalEvent} from '../lib/taskTracker';

/**
 * `@task` in an action's own blok: the run it is shown for, as the blok reads
 * it. Every field is there before, during and after the run, so a tree reads
 * `@task.progress` or binds `<Popout open="@task.ask">` without asking whether
 * there is a run yet.
 */
export type TaskRoot = {
  /** The run's last event kind, as the server names it (`PROGRESS`, `COMPLETED`…); `IDLE` before a run. */
  status: string;
  running: boolean;
  done: boolean;
  failed: boolean;
  /** 0-100, as last reported; 100 once done. */
  progress: number;
  /** The last progress message. */
  message: string;
  /** Whether the run waits for an answer: true while an ask is open (a boolean, for `open=` and `if`). */
  ask: boolean;
  /** What the open ask asks, in the agent's words; empty while none is open. */
  question: string;
  /** The latest yield, by return port key; null before the first. */
  latest: Record<string, unknown> | null;
};

/** The task fields `@task` is read from. */
export type TaskRootSource = {
  latestEventKind: TaskEventKind;
  latestProgress?: number | null;
  latestMessage?: string | null;
  latestReturns?: unknown;
  isDone: boolean;
  events: ReadonlyArray<{
    kind: TaskEventKind;
    value?: unknown;
    message?: string | null;
    createdAt?: string | null;
    task: {id: string};
  }>;
};

export const IDLE_TASK_ROOT: TaskRoot = {
  status: 'IDLE',
  running: false,
  done: false,
  failed: false,
  progress: 0,
  message: '',
  ask: false,
  question: '',
  latest: null,
};

const FAILED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Failed, TaskEventKind.Critical, TaskEventKind.Lost];

const isReturns = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The open asks of the run, newest last: its own hold, or a child it asked for. */
export const openAsks = (task: Pick<TaskRootSource, 'events'>): HoldRequest[] => pendingHolds(task.events);

export const taskRoot = (task: TaskRootSource): TaskRoot => {
  const ended = task.isDone || isTerminalEvent(task.latestEventKind);
  const done = task.latestEventKind === TaskEventKind.Completed;
  const asks = ended ? [] : openAsks(task);
  const progress = typeof task.latestProgress === 'number' && Number.isFinite(task.latestProgress) ? task.latestProgress : 0;
  return {
    status: task.latestEventKind,
    running: !ended,
    done,
    failed: FAILED_KINDS.includes(task.latestEventKind),
    progress: done ? 100 : Math.min(100, Math.max(0, progress)),
    message: task.latestMessage ?? '',
    ask: asks.length > 0,
    question: asks.at(-1)?.title ?? '',
    latest: isReturns(task.latestReturns) ? task.latestReturns : null,
  };
};
