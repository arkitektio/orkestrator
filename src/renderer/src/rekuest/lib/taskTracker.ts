import {
  LogLevel,
  TaskEventChangeFragment,
  TaskEventFragment,
  TaskEventKind,
} from "../api/graphql";

/**
 * Callbacks keyed by the client-generated task reference. Components
 * that track an task locally register here BEFORE firing the assign
 * mutation, so the subscription can both deliver events to them and suppress
 * the global toast for that task.
 */
export const registeredCallbacks = new Map<
  string,
  (event: TaskEventFragment) => void
>();

/**
 * Kinds that end a task. Drives the callback teardown in `TaskUpdater`, the
 * `finishedAt` write in `taskCache`, and the stream teardown in `useProbe`.
 *
 * `UNASSIGN` (added to `TaskEventKind` in the probe-path API update) is
 * deliberately NOT here: the schema declares the enum in lifecycle order and
 * places it mid-flight, next to `DISCONNECTED`, which this client also treats
 * as non-terminal — an unassigned task can be re-bound and keep streaming.
 * The schema carries no per-member docstring, so this is an inference; if the
 * backend confirms a task can *end* in UNASSIGN, add it here.
 */
export const TERMINAL_EVENT_KINDS = [
  TaskEventKind.Completed,
  TaskEventKind.Cancelled,
  TaskEventKind.Critical,
  TaskEventKind.Failed,
  TaskEventKind.Interrupted,
] as const;

export const isTerminalEvent = (kind: TaskEventKind) =>
  (TERMINAL_EVENT_KINDS as readonly TaskEventKind[]).includes(kind);

/**
 * A task that can still produce events: not flagged done and not ended by a
 * terminal kind. `CANCELLING` / `INTERRUPTING` are still live — the task has
 * been asked to stop, it has not stopped. The one definition every surface
 * (rail island, status line, reload seed) shares, so none of them disagrees
 * about whether a task is "still working".
 */
export const isTaskLive = (task: {
  isDone?: boolean | null;
  latestEventKind: TaskEventKind;
}) => !task.isDone && !isTerminalEvent(task.latestEventKind);

/**
 * Register a callback for an task reference. Call this BEFORE awaiting
 * the assign mutation so no early subscription events are missed. Returns an
 * unregister function for cleanup (also called automatically by the
 * subscription handler when a terminal event arrives).
 */
export const trackTask = (
  reference: string,
  callback: (event: TaskEventFragment) => void,
): (() => void) => {
  registeredCallbacks.set(reference, callback);
  return () => {
    registeredCallbacks.delete(reference);
  };
};

/**
 * Bridge between a task's id and its client-generated reference.
 *
 * The non-traversable `TaskEventChange` only carries the task **id**, while
 * local trackers (`registeredCallbacks`) are keyed by the client `reference`.
 * The `TaskChange` (create) payload carries both, so we record the mapping on
 * create and use it to route later id-only events back to the right callback.
 */
const idToReference = new Map<string, string>();
const MAX_ID_REFERENCE = 1000;

export const mapReference = (id: string, reference?: string | null) => {
  if (!reference) return;
  if (!idToReference.has(id) && idToReference.size >= MAX_ID_REFERENCE) {
    const oldest = idToReference.keys().next().value;
    if (oldest !== undefined) idToReference.delete(oldest);
  }
  idToReference.set(id, reference);
};

export const referenceForId = (id: string): string | undefined =>
  idToReference.get(id);

export const forgetId = (id: string) => idToReference.delete(id);

/**
 * Hand an event to whoever tracks its task locally. The terminal event is the
 * last one a task produces, so it also ends the tracking: the callback is
 * unregistered and the id → reference bridge forgotten.
 */
export const deliverToCallback = (
  reference: string,
  event: TaskEventFragment,
) => {
  registeredCallbacks.get(reference)?.(event);
  if (isTerminalEvent(event.kind)) {
    registeredCallbacks.delete(reference);
    forgetId(event.task.id);
  }
};

/**
 * Synthesize a cache-shaped `TaskEvent` from the thin `TaskEventChange` delta.
 * The immutable event metadata the subscription no longer sends (`name`,
 * `level`, `delegatedTo`) is filled with placeholders — live readers only need
 * `kind`/`progress`/`returns`/`message`/`createdAt`. `reference` is the resolved
 * task reference so callback consumers that match on `event.task.reference`
 * keep working.
 */
export const taskEventChangeToEvent = (
  change: TaskEventChangeFragment,
  reference?: string | null,
): TaskEventFragment => ({
  __typename: "TaskEvent",
  id: change.id,
  kind: change.kind,
  level: LogLevel.Info,
  returns: change.returns,
  progress: change.progress,
  reference: reference ?? "",
  createdAt: change.createdAt,
  message: change.message,
  task: { __typename: "Task", id: change.task, reference: reference ?? null },
  delegatedTo: null,
});

/**
 * Events can arrive over the subscription before their task's `create`
 * payload (and before the task is hydrated into the cache). Buffer the raw
 * changes per task id and flush them once the task exists.
 */
const bufferedEvents: Record<string, TaskEventChangeFragment[]> = {};

// Cap the number of distinct tasks we buffer. A buffer orphans forever if
// its `create` payload never arrives (so takeBufferedEvents is never called), so
// evict the oldest buffer once we exceed this bound.
const MAX_BUFFERED_TASKS = 500;

export const bufferEvent = (
  taskId: string,
  event: TaskEventChangeFragment,
) => {
  if (
    !(taskId in bufferedEvents) &&
    Object.keys(bufferedEvents).length >= MAX_BUFFERED_TASKS
  ) {
    const oldestKey = Object.keys(bufferedEvents)[0];
    if (oldestKey !== undefined) delete bufferedEvents[oldestKey];
  }
  (bufferedEvents[taskId] ??= []).push(event);
};

export const takeBufferedEvents = (
  taskId: string,
): TaskEventChangeFragment[] => {
  const events = bufferedEvents[taskId] || [];
  delete bufferedEvents[taskId];
  return events;
};

/**
 * Events no local tracker could be told about yet. An id-only event cannot be
 * routed until its task's reference is known — from the subscription's `create`
 * payload or the assign response, whichever lands first — and the buffer above
 * feeds the cache alone. Held here separately so handing them over consumes
 * them: both channels may call {@link deliverHeldEvents}, only the first
 * delivers.
 */
const heldForCallback = new Map<string, TaskEventChangeFragment[]>();
const MAX_HELD_PER_TASK = 50;

export const holdForCallback = (
  taskId: string,
  event: TaskEventChangeFragment,
) => {
  if (!heldForCallback.has(taskId) && heldForCallback.size >= MAX_BUFFERED_TASKS) {
    const oldest = heldForCallback.keys().next().value;
    if (oldest !== undefined) heldForCallback.delete(oldest);
  }
  // Most held tasks are never claimed — anything not started from this window
  // has no local tracker — so a chatty one must not grow without bound.
  heldForCallback.set(
    taskId,
    [...(heldForCallback.get(taskId) ?? []), event].slice(-MAX_HELD_PER_TASK),
  );
};

/** The task's reference is known now: hand over what was held, oldest first. */
export const deliverHeldEvents = (taskId: string) => {
  const reference = referenceForId(taskId);
  if (!reference) return;

  const held = heldForCallback.get(taskId) ?? [];
  heldForCallback.delete(taskId);
  for (const change of held) {
    deliverToCallback(reference, taskEventChangeToEvent(change, reference));
  }
};
