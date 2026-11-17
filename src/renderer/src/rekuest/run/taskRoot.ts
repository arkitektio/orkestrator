import {idleTaskRecord, withTaskStatus, type BlokTaskRecord, type BlokTaskStatus} from '@arkitektio/bsx/renderer/runtime/index';
import {TaskEventKind} from '../api/graphql';
import {askClosed, pendingHolds, type HoldRequest} from '../lib/holds';
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
    /** The event itself: what tells one ask of a task from its next (`holdKey`). */
    id?: string | null;
    kind: TaskEventKind;
    value?: unknown;
    /** What a PROGRESS event reported (0-100). */
    progress?: number | null;
    message?: string | null;
    createdAt?: string | null;
    task: {id: string};
  }>;
};

const FAILED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Failed, TaskEventKind.Critical, TaskEventKind.Lost, TaskEventKind.Denied];
const CANCELLED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Cancelled, TaskEventKind.Interrupted];
const QUEUED_KINDS: readonly TaskEventKind[] = [TaskEventKind.Queued, TaskEventKind.Bound];
/** How many log entries `task.log` keeps: the latest. */
const LOG_LIMIT = 100;

/** One thing the run reported, as `task.log` lists it. */
export type TaskLogEntry = {at: string | null; kind: string; message: string | null};

/**
 * The task record with what bsx before it knew them has no field for: the
 * paused state, the run's times and its log.
 */
export type TaskRecord = Omit<BlokTaskRecord, 'status'> & {
  status: BlokTaskStatus | 'paused';
  paused: boolean;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  log: TaskLogEntry[];
};

type Reported = TaskRootSource['events'];

/** When the run started and ended, how long it took, and what it said, from events newest first. */
const historyOf = (events: Reported, ended: boolean): Pick<TaskRecord, 'started_at' | 'ended_at' | 'duration' | 'log'> => {
  const started = events.at(-1)?.createdAt ?? null;
  const finished = ended ? (events[0]?.createdAt ?? null) : null;
  const from = started ? parseTimestamp(started) : NaN;
  const to = finished ? parseTimestamp(finished) : NaN;
  return {
    started_at: started,
    ended_at: finished,
    duration: Number.isNaN(from) || Number.isNaN(to) ? null : Math.max(0, (to - from) / 1000),
    log: events
      .slice(0, LOG_LIMIT)
      .reverse()
      .map(event => ({at: event.createdAt ?? null, kind: event.kind.toLowerCase(), message: event.message ?? null})),
  };
};

/** The record a status gives: a paused run has started and not ended. */
const withStatus = (status: TaskRecord['status']): Omit<TaskRecord, 'started_at' | 'ended_at' | 'duration' | 'log'> => ({
  ...withTaskStatus(idleTaskRecord(), status as BlokTaskStatus),
  status,
  running: status === 'queued' || status === 'running' || status === 'asking' || status === 'paused',
  paused: status === 'paused',
});

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

const statusOf = (kind: TaskEventKind, ended: boolean, asking: boolean): TaskRecord['status'] => {
  if (kind === TaskEventKind.Completed) return 'done';
  if (FAILED_KINDS.includes(kind)) return 'failed';
  if (CANCELLED_KINDS.includes(kind)) return 'cancelled';
  if (ended) return 'done';
  if (asking) return 'asking';
  if (kind === TaskEventKind.Paused) return 'paused';
  return QUEUED_KINDS.includes(kind) ? 'queued' : 'running';
};

const askOf = (hold: HoldRequest | undefined): BlokTaskRecord['ask'] =>
  hold ? {question: hold.title, form: {task: hold.task, kind: hold.kind, description: hold.description ?? null}} : null;

/** The run as a task record; with `at` (ms), as it was at that moment. */
export const taskRecordOf = (task: TaskRootSource, at?: number): TaskRecord => {
  const args = isRecordValue(task.args) ? task.args : {};
  if (at !== undefined) {
    // Events newest first, as the task fragments order them.
    const seen = task.events.filter(event => {
      const moment = typeof event.createdAt === 'string' ? parseTimestamp(event.createdAt) : NaN;
      return Number.isNaN(moment) || moment <= at;
    });
    const latest = seen[0];
    if (!latest) return {...withStatus('queued'), ...historyOf([], false), id: task.id, args};
    const ended = isTerminalEvent(latest.kind);
    const asks = ended ? [] : openAsks({events: seen});
    const status = statusOf(latest.kind, ended, asks.length > 0);
    // The progress the run had reported by then: its newest progress up to the moment.
    const reported = seen.find(event => typeof event.progress === 'number' && Number.isFinite(event.progress))?.progress ?? 0;
    return {
      ...withStatus(status),
      ...historyOf(seen, ended),
      id: task.id,
      args,
      progress: status === 'done' ? 100 : Math.min(100, Math.max(0, reported)),
      message: latest.message ?? null,
      error: status === 'failed' ? (latest.message ?? null) : null,
      ask: askOf(asks.at(-1)),
    };
  }
  const ended = task.isDone || isTerminalEvent(task.latestEventKind);
  // Being stopped, the run asks nothing any more: `task.ask` is empty, so a blok drawing its own form takes no answer.
  const shown = askClosed(task) ? undefined : shownAsk(task);
  const status = statusOf(task.latestEventKind, ended, shown !== undefined);
  const progress = typeof task.latestProgress === 'number' && Number.isFinite(task.latestProgress) ? task.latestProgress : 0;
  return {
    ...withStatus(status),
    ...historyOf(task.events, ended),
    id: task.id,
    args,
    progress: status === 'done' ? 100 : Math.min(100, Math.max(0, progress)),
    message: task.latestMessage ?? null,
    error: status === 'failed' ? (task.latestMessage ?? null) : null,
    ask: askOf(shown),
    returns: isRecordValue(task.latestReturns) ? task.latestReturns : {},
  };
};
