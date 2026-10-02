import type {BlokRuntimeStore, BlokTaskObserver, BlokTaskUpdate} from './types';

/**
 * A call bound to a name (`@self.run(...).into(job)`): its task is a value of
 * the blok, held under that name in the data model. The record has the same
 * shape before, during and after a run, so a component reads `job.progress` or
 * `job.result` without asking whether there is a run yet.
 *
 * It is the viewer's own state. Nothing is published to the agent, and a
 * reload forgets it.
 */
export type BlokTaskRecord = {
  status: 'idle' | 'running' | 'done' | 'failed' | 'cancelled';
  /** Booleans beside `status`: `disabled` and `if` want one, not a comparison. */
  running: boolean;
  done: boolean;
  failed: boolean;
  /** 0-100, as last reported; 100 once done. */
  progress: number;
  /** The last progress message. */
  message: string;
  /** Why it failed; empty otherwise. */
  error: string;
  /** The return value: the first return, or a generator's latest yield. */
  result: unknown;
  /** Every return, by port key. */
  returns: Record<string, unknown>;
};

/** The spelling a blok payload's `demo_state` seeds the name with. */
export const idleTaskRecord = (): BlokTaskRecord => ({
  status: 'idle',
  running: false,
  done: false,
  failed: false,
  progress: 0,
  message: '',
  error: '',
  result: null,
  returns: {},
});

const runningTaskRecord = (): BlokTaskRecord => ({
  ...idleTaskRecord(),
  status: 'running',
  running: true,
});

const isReturns = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** One reported step of a task, folded into its record. */
export const applyTaskUpdate = (record: BlokTaskRecord, update: BlokTaskUpdate): BlokTaskRecord => {
  const next = {...record};

  if (typeof update.progress === 'number' && Number.isFinite(update.progress)) {
    next.progress = Math.min(100, Math.max(0, update.progress));
  }
  if (typeof update.message === 'string') {
    next.message = update.message;
  }
  if (isReturns(update.returns)) {
    next.returns = update.returns;
    next.result = Object.values(update.returns)[0] ?? null;
  }

  if (update.end === 'done') {
    return {...next, status: 'done', running: false, done: true, progress: 100};
  }
  if (update.end === 'failed') {
    return {...next, status: 'failed', running: false, failed: true, error: update.error ?? ''};
  }
  if (update.end === 'cancelled') {
    return {...next, status: 'cancelled', running: false};
  }
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
 * Starts a run under `name`: the record is replaced by a fresh running one, so
 * it always describes a single run, and every later update is folded into it.
 * A newer run under the same name supersedes this one, whose updates are then
 * dropped rather than overwriting what the user asked for last.
 */
export const bindTask = (store: BlokRuntimeStore, name: string): BlokTaskBinding => {
  const perStore = runs.get(store) ?? new Map<string, number>();
  runs.set(store, perStore);
  const run = (perStore.get(name) ?? 0) + 1;
  perStore.set(name, run);

  let record = runningTaskRecord();
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
      if (!reported) write(idleTaskRecord());
    },
  };
};
