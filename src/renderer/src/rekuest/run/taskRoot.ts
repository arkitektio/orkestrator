import {idleTaskRecord, withTaskStatus, type BlokTaskRecord, type BlokTaskStatus} from '@arkitektio/bsx/renderer/runtime/index';
import {TaskEventKind} from '../api/graphql';
import {pendingHolds, type HoldRequest} from '../lib/holds';
import {isTerminalEvent} from '../lib/taskTracker';
import {parseTimestamp} from '../travel/travelSource';

/**
 * `task` in an action's own blok (and a task blok): the run it is shown for,
 * as the one task record of blok language v2 (`runtime/task.ts`). Every field
 * is there before, during and after the run.
 *
 * With a moment (time travel) it is the task as it was then: task events are
 * time-ordered, so what it had reported by that moment decides.
 */

/** The task fields `task` is read from. */
export type TaskRootSource = {
  id: string;
  args?: unknown;
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

const FAILED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Failed, TaskEventKind.Critical, TaskEventKind.Lost, TaskEventKind.Denied];
const CANCELLED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Cancelled, TaskEventKind.Interrupted];
const QUEUED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Queued, TaskEventKind.Bound];

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The open asks of the run, newest last: its own hold, or a child it asked for. */
export const openAsks = (task: Pick<TaskRootSource, 'events'>): HoldRequest[] => pendingHolds(task.events);

/**
 * The ask `task.ask` shows: the run's newest open ask, none once it ended.
 * `task.answer(values)` in an action's blok answers exactly this one.
 */
export const shownAsk = (task: Pick<TaskRootSource, 'events' | 'isDone' | 'latestEventKind'>): HoldRequest | undefined =>
  task.isDone || isTerminalEvent(task.latestEventKind) ? undefined : openAsks(task).at(-1);

const statusOf = (kind: TaskEventKind, ended: boolean, asking: boolean): BlokTaskStatus => {
  if (kind === TaskEventKind.Completed) return 'done';
  if (FAILED_KINDS.includes(kind)) return 'failed';
  if (CANCELLED_KINDS.includes(kind)) return 'cancelled';
  if (ended) return 'done';
  if (asking) return 'asking';
  return QUEUED_KINDS.includes(kind) ? 'queued' : 'running';
};

const askOf = (hold: HoldRequest | undefined): BlokTaskRecord['ask'] =>
  hold ? {question: hold.title, form: {task: hold.task, kind: hold.kind, description: hold.description ?? null}} : null;

/** The run as a task record; with `at` (ms), as it was at that moment. */
export const taskRecordOf = (task: TaskRootSource, at?: number): BlokTaskRecord => {
  const args = isRecordValue(task.args) ? task.args : {};
  if (at !== undefined) {
    // Events newest first, as the task fragments order them.
    const seen = task.events.filter(event => {
      const moment = typeof event.createdAt === 'string' ? parseTimestamp(event.createdAt) : NaN;
      return Number.isNaN(moment) || moment <= at;
    });
    const latest = seen[0];
    if (!latest) return {...withTaskStatus(idleTaskRecord(), 'queued'), id: task.id, args};
    const ended = isTerminalEvent(latest.kind);
    const asks = ended ? [] : openAsks({events: seen});
    const status = statusOf(latest.kind, ended, asks.length > 0);
    return {
      ...withTaskStatus(idleTaskRecord(), status),
      id: task.id,
      args,
      progress: status === 'done' ? 100 : 0,
      message: latest.message ?? null,
      error: status === 'failed' ? (latest.message ?? null) : null,
      ask: askOf(asks.at(-1)),
    };
  }
  const ended = task.isDone || isTerminalEvent(task.latestEventKind);
  const shown = shownAsk(task);
  const status = statusOf(task.latestEventKind, ended, shown !== undefined);
  const progress = typeof task.latestProgress === 'number' && Number.isFinite(task.latestProgress) ? task.latestProgress : 0;
  return {
    ...withTaskStatus(idleTaskRecord(), status),
    id: task.id,
    args,
    progress: status === 'done' ? 100 : Math.min(100, Math.max(0, progress)),
    message: task.latestMessage ?? null,
    error: status === 'failed' ? (task.latestMessage ?? null) : null,
    ask: askOf(shown),
    returns: isRecordValue(task.latestReturns) ? task.latestReturns : {},
  };
};
