import {loadVocabulary} from '../../spec/vocabulary';
import type {BlokRuntimeStore, BlokTaskObserver, BlokTaskUpdate} from './types';

/**
 * The task record, one shape for `task`, `deps.<key>.tasks.<action>`,
 * `self.tasks.<action>` and every `into` name (vocabulary `records.task`).
 * The record has the same shape before, during and after a run, so a
 * component reads `move.progress` or `move.returns.arrived` without asking
 * whether there is a run yet.
 *
 * An `into` record is the viewer's own state: nothing is published to the
 * agent, and a reload forgets it.
 */
export type BlokTaskStatus = 'idle' | 'queued' | 'running' | 'asking' | 'done' | 'failed' | 'cancelled';

export type BlokTaskAsk = {question: string; form: Record<string, unknown>};

export type BlokTaskRecord = {
  /** The task's id; null before it was started. */
  id: string | null;
  status: BlokTaskStatus;
  /** queued, running or asking. */
  running: boolean;
  done: boolean;
  failed: boolean;
  /** 0-100, as last reported; 100 once done. */
  progress: number;
  /** The last progress message. */
  message: string | null;
  /** Why it failed. */
  error: string | null;
  /** What it was called with, filled in by the renderer at dispatch. */
  args: Record<string, unknown>;
  /** The open ask, or null. */
  ask: BlokTaskAsk | null;
  /** The values returned for the ask. */
  answer: Record<string, unknown> | null;
  /** The latest yield, by return port key. */
  returns: Record<string, unknown>;
};

const TASK_STATUSES: readonly BlokTaskStatus[] = ['idle', 'queued', 'running', 'asking', 'done', 'failed', 'cancelled'];
export const isTaskStatus = (value: unknown): value is BlokTaskStatus =>
  typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);

/** The record before a run: the vocabulary's `records.task.idle`. */
export const idleTaskRecord = (): BlokTaskRecord => {
  const idle = loadVocabulary().records.task.idle ?? {};
  return {
    id: null,
    status: 'idle',
    running: false,
    done: false,
    failed: false,
    progress: 0,
    message: null,
    error: null,
    args: {},
    ask: null,
    answer: null,
    returns: {},
    ...(idle as Partial<BlokTaskRecord>),
  };
};

/** Whether a status is one a task ends in. */
export const isSettledStatus = (status: BlokTaskStatus): boolean =>
  status === 'done' || status === 'failed' || status === 'cancelled';

/** The record a status gives, with the flags beside it. */
export const withTaskStatus = (record: BlokTaskRecord, status: BlokTaskStatus): BlokTaskRecord => ({
  ...record,
  status,
  running: status === 'queued' || status === 'running' || status === 'asking',
  done: status === 'done',
  failed: status === 'failed',
});

const runningTaskRecord = (args: Record<string, unknown>): BlokTaskRecord =>
  withTaskStatus({...idleTaskRecord(), args}, 'queued');

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** One reported step of a task, folded into its record. */
export const applyTaskUpdate = (record: BlokTaskRecord, update: BlokTaskUpdate): BlokTaskRecord => {
  let next: BlokTaskRecord = {...record};

  if (typeof update.id === 'string' && update.id) next.id = update.id;
  if (typeof update.progress === 'number' && Number.isFinite(update.progress)) {
    next.progress = Math.min(100, Math.max(0, update.progress));
  }
  if (typeof update.message === 'string') next.message = update.message;
  if (isRecordValue(update.returns)) next.returns = update.returns;
  if (update.ask !== undefined) next.ask = update.ask;
  if (isRecordValue(update.answer)) next.answer = update.answer;
  if (update.status) next = withTaskStatus(next, update.status);

  if (update.end === 'done') return {...withTaskStatus(next, 'done'), progress: 100, ask: null};
  if (update.end === 'failed') return {...withTaskStatus(next, 'failed'), error: update.error ?? null, ask: null};
  if (update.end === 'cancelled') return {...withTaskStatus(next, 'cancelled'), ask: null};
  return next;
};

/** The run each name is on, per runtime: only the latest one may write. */
const runs = new WeakMap<BlokRuntimeStore, Map<string, number>>();

export type BlokTaskBinding = {
  /** What the host reports the task's steps to. */
  observe: BlokTaskObserver;
  /** The host does not follow tasks (the preview): nothing is running. */
  release: () => void;
};

/**
 * Starts a run under `name`: the record is replaced by a fresh queued one
 * holding what the call was made with (`args`), so it always describes a
 * single run, and every later update is folded into it. A newer run under the
 * same name supersedes this one, whose updates are then dropped rather than
 * overwriting what the user asked for last.
 */
export const bindTask = (store: BlokRuntimeStore, name: string, args: Record<string, unknown> = {}): BlokTaskBinding => {
  const perStore = runs.get(store) ?? new Map<string, number>();
  runs.set(store, perStore);
  const run = (perStore.get(name) ?? 0) + 1;
  perStore.set(name, run);

  let record = runningTaskRecord(args);
  const write = (next: BlokTaskRecord) => {
    if (perStore.get(name) !== run) return;
    record = next;
    store.getState().setRuntimeValue(name, next);
  };

  let reported = false;
  write(record);
  return {
    observe: update => {
      // A task that has ended reports nothing further worth showing.
      if (!record.running) return;
      reported = true;
      write(applyTaskUpdate(record, update));
    },
    release: () => {
      // Unless the host did say something on its way out (it refused the call).
      if (!reported) write({...idleTaskRecord(), args});
    },
  };
};
