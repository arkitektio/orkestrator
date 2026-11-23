import {applyTaskUpdate, idleTaskRecord, type BlokTaskRecord} from '@arkitektio/bsx/renderer/runtime/index';
import type {TaskEventKind} from '../api/graphql';
import {taskUpdateFromEvent} from '../components/blokTaskUpdates';
import type {RekuestSession} from '../session/client';
import {createLiveStateStore, type LiveStateSubscribe} from './liveStateStore';

/**
 * The task an agent's action last ran as, whoever started it, kept current.
 *
 * The session's `latest:<agent>/<interface>` topic says it first as a snapshot
 * (the task and the few events its record is made of) and then says what
 * changes it: the task's events, and every task of the action as it starts
 * and as it ends. This folds those into the record a blok reads
 * (`self.tasks.<action>`, `deps.<key>.tasks.<action>`) and holds it in a live-state store, so there is one
 * subscription per `(agent, interface)` however many bloks read it, and
 * readers hear of it at most once per animation frame.
 */

type TaskRow = {id: string; isDone: boolean; latestEventKind: TaskEventKind};

type ReportedEvent = {
  task: string;
  kind: TaskEventKind;
  message?: string | null;
  progress?: number | null;
  returns?: unknown;
};

export type LatestTaskMessage =
  | {__typename: 'LatestTaskSnapshot'; implementation?: string | null; latest?: TaskRow | null; events: ReportedEvent[]}
  | ({__typename: 'TaskChange'} & TaskRow)
  | ({__typename: 'TaskEventChange'} & ReportedEvent);


/** What is held for one action of one agent. Replaced, never mutated. */
export type LatestTaskState = {
  /** The implementation the agent offers under the name; `null` if the name is no action of it. */
  implementation: string | null;
  /** The task the record describes; `null` while the action has never run. */
  task: string | null;
  record: BlokTaskRecord;
};

const running = (): BlokTaskRecord => ({...idleTaskRecord(), status: 'running', running: true});

const report = (record: BlokTaskRecord, event: Omit<ReportedEvent, 'task'>): BlokTaskRecord => {
  // A task that has ended reports nothing further worth showing.
  if (!record.running) return record;
  const update = taskUpdateFromEvent(event);
  return update ? applyTaskUpdate(record, update) : record;
};

/** A task row that says the task is over ends a record that has not heard so from an event. */
const settle = (record: BlokTaskRecord, task: TaskRow): BlokTaskRecord =>
  task.isDone ? report(record, {kind: task.latestEventKind}) : record;

/** Task ids only grow: the higher one started later. */
const order = (task: string, held: string | null): number => (held === null ? 1 : Number(task) - Number(held));

/**
 * One message of the feed folded into what is held. Returns `state` itself
 * when the message changes nothing, so nothing downstream is told.
 *
 * The feed may lose a message (the channel layer drops under load). That
 * heals: an event of a task newer than the held one starts that task's record
 * though its start was never heard of, and a task's end is said twice, by its
 * terminal event and by its row.
 */
export const foldLatestTask = (state: LatestTaskState | null, message: LatestTaskMessage): LatestTaskState | null => {
  if (message.__typename === 'LatestTaskSnapshot') {
    const implementation = message.implementation ?? null;
    if (!message.latest) return {implementation, task: null, record: idleTaskRecord()};
    const record = message.events.reduce(report, running());
    return {implementation, task: message.latest.id, record: settle(record, message.latest)};
  }

  // Before the snapshot there is nothing to change.
  if (!state) return state;

  if (message.__typename === 'TaskChange') {
    const position = order(message.id, state.task);
    if (position < 0) return state;
    const record = settle(position > 0 ? running() : state.record, message);
    return position === 0 && record === state.record ? state : {...state, task: message.id, record};
  }

  const position = order(message.task, state.task);
  if (position < 0) return state;
  const record = report(position > 0 ? running() : state.record, message);
  return position === 0 && record === state.record ? state : {...state, task: message.task, record};
};

/** A task record as the session carries it (`TaskChangePayload`). */
type WireTaskRow = {id: string; is_done: boolean; latest_event_kind: string};
/** A reported event as the session carries it (`TaskEventPayload`). */
type WireReported = {
  task: string;
  kind: string;
  message?: string | null;
  progress?: number | null;
  returns?: unknown;
};

const reported = (event: WireReported): ReportedEvent => ({
  task: event.task,
  kind: event.kind as TaskEventKind,
  message: event.message ?? null,
  progress: event.progress ?? null,
  returns: event.returns ?? null,
});

const taskRow = (task: WireTaskRow): TaskRow => ({
  id: task.id,
  isDone: task.is_done,
  latestEventKind: task.latest_event_kind as TaskEventKind,
});

/** The session's `latest:` snapshot as the feed's first message. */
export const snapshotMessage = (snapshot: {
  implementation?: string | null;
  latest?: WireTaskRow | null;
  events?: WireReported[];
}): LatestTaskMessage => ({
  __typename: 'LatestTaskSnapshot',
  implementation: snapshot.implementation ?? null,
  latest: snapshot.latest ? taskRow(snapshot.latest) : null,
  events: (snapshot.events ?? []).map(reported),
});

/** One item of the session's `latest:` topic as the feed's message, or null. */
export const itemMessage = (item: {create?: WireTaskRow | null; event?: WireReported | null}): LatestTaskMessage | null => {
  if (item.create) return {__typename: 'TaskChange', ...taskRow(item.create)};
  if (item.event) return {__typename: 'TaskEventChange', ...reported(item.event)};
  return null;
};

/**
 * The feed as the live-state store reads one, over the window's caller session
 * (`latest:<agent>/<interface>`): every change hands it the whole of what is
 * held, which the store publishes once per frame. A resume resends the
 * snapshot, which replaces what is held.
 */
export const subscribeLatestTask: LiveStateSubscribe<RekuestSession> = (session, variables, handlers) => {
  let held: LatestTaskState | null = null;
  let revision = 0;
  const fold = (message: LatestTaskMessage | null) => {
    if (!message) return;
    const next = foldLatestTask(held, message);
    if (next === held || next === null) return;
    held = next;
    revision += 1;
    handlers.next({__typename: 'StateSnapshotEvent', value: next, globalRevision: revision});
  };
  return session.watch(`latest:${variables.agentID}/${variables.interface}`, {
    onResync: snapshot => fold(snapshotMessage(snapshot as Parameters<typeof snapshotMessage>[0])),
    onData: item => fold(itemMessage(item as Parameters<typeof itemMessage>[0])),
    onRefused: error => handlers.error(new Error(error)),
  });
};

export const latestTaskStore = createLiveStateStore<RekuestSession>({subscribe: subscribeLatestTask});
