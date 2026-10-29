import {applyTaskUpdate, idleTaskRecord, withTaskStatus, type BlokTaskRecord} from '@arkitektio/bsx/renderer/runtime/index';
import type {TaskEventFragment} from '../api/graphql';
import {parseTimestamp} from '../travel/travelSource';
import {taskUpdateFromEvent} from './blokTaskUpdates';

/**
 * Where a blok reads the latest task of an action of a bound agent:
 * `deps.<key>.tasks.<action>` (`self.tasks.<action>` for `deps.self`), the one
 * task record (`runtime/task.ts`) for a run the blok did not start itself.
 */
export const latestTaskPath = (dependencyKey: string, action: string) => `deps.${dependencyKey}.tasks.${action}`;

type ReportedEvent = Pick<TaskEventFragment, 'kind' | 'progress' | 'message' | 'returns'> & {createdAt?: unknown};

/** The fields of a task this needs; `events` newest first, as the task fragments order them. */
export type LatestTaskSource = {
  id: string;
  createdAt?: unknown;
  implementation?: {id: string} | null;
  events: ReadonlyArray<ReportedEvent>;
};

/** The server's clock, read as the travel clock reads it. Without a time: the beginning. */
const momentOf = (createdAt: unknown): number => {
  const time = typeof createdAt === 'string' ? parseTimestamp(createdAt) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const startedAt = (task: LatestTaskSource): number => momentOf(task.createdAt);

/**
 * The task an implementation last ran as, among the tasks the viewer can see.
 * Later in the list wins a tie: the task list is appended to as tasks start.
 *
 * With `at` (ms) it is the task it last ran as at that moment: what started
 * later had not started yet.
 */
export const pickLatestTask = <T extends LatestTaskSource>(
  tasks: ReadonlyArray<T | null | undefined>,
  implementationId: string,
  at?: number,
): T | undefined => {
  let latest: T | undefined;
  for (const task of tasks) {
    if (!task || task.implementation?.id !== implementationId) continue;
    if (at !== undefined && startedAt(task) > at) continue;
    if (!latest || startedAt(task) >= startedAt(latest)) latest = task;
  }
  return latest;
};

/**
 * A task's events folded into the record a blok reads. No task is an idle
 * record; a task that has reported nothing yet is a running one.
 *
 * With `at` (ms) only what it had reported by then counts: a task that has
 * ended since was still running at that moment.
 */
export const latestTaskRecord = (task: LatestTaskSource | undefined, at?: number): BlokTaskRecord => {
  if (!task) return idleTaskRecord();

  let record: BlokTaskRecord = {...withTaskStatus(idleTaskRecord(), 'running'), id: task.id};
  for (let index = task.events.length - 1; index >= 0; index -= 1) {
    // A task that has ended reports nothing further worth showing.
    if (!record.running) break;
    const event = task.events[index];
    if (at !== undefined && momentOf(event.createdAt) > at) continue;
    const update = taskUpdateFromEvent(event);
    if (update) record = applyTaskUpdate(record, update);
  }
  return record;
};

/**
 * The runs of one implementation around a moment: enough to say what its
 * latest task was at any moment from `from` to `to` (ms) without asking again.
 */
export type LatestTaskWindow<T extends LatestTaskSource> = {
  implementationId: string;
  from: number;
  to: number;
  tasks: ReadonlyArray<T>;
};

/**
 * `before`: the last tasks started up to `at`, newest first, at most
 * `beforeLimit`. `after`: the first ones started after it, oldest first, at
 * most `afterLimit`. A list shorter than its limit is all there is on that
 * side: nothing ran earlier, and nothing later up to `fetchedAt`, the moment
 * the lists were asked for. What ran or was reported since is not in them.
 */
export const latestTaskWindow = <T extends LatestTaskSource>(args: {
  implementationId: string;
  at: number;
  fetchedAt: number;
  before: ReadonlyArray<T>;
  beforeLimit: number;
  after: ReadonlyArray<T>;
  afterLimit: number;
}): LatestTaskWindow<T> => {
  const {after, afterLimit, at, before, beforeLimit, fetchedAt, implementationId} = args;
  const seen = new Set<string>();
  const tasks = [...before, ...after].filter(task => !seen.has(task.id) && seen.add(task.id));

  return {
    implementationId,
    // The oldest task held is the latest one at its own start, and not before.
    from: before.length < beforeLimit ? -Infinity : Math.min(at, ...before.map(startedAt)),
    to: after.length < afterLimit ? Math.max(at, fetchedAt) : Math.max(at, ...after.map(startedAt)),
    tasks,
  };
};

export const windowCovers = (
  window: LatestTaskWindow<LatestTaskSource> | null,
  implementationId: string,
  at: number,
): boolean =>
  window !== null && window.implementationId === implementationId && at >= window.from && at <= window.to;
