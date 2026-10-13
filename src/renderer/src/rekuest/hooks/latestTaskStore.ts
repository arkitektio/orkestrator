import {gql, type ApolloClient} from '@apollo/client';
import {applyTaskUpdate, idleTaskRecord, type BlokTaskRecord} from '@/core/blok/renderer/runtime';
import type {TaskEventKind} from '../api/graphql';
import {taskUpdateFromEvent} from '../components/blokTaskUpdates';
import {createLiveStateStore, type LiveStateSubscribe} from './liveStateStore';

/**
 * The task an agent's action last ran as, whoever started it, kept current.
 *
 * The server's `latestTask(agent, interface)` feed says it first as a snapshot
 * (the task and the few events its record is made of) and then says what
 * changes it: the task's events, and every task of the action as it starts
 * and as it ends. This folds those into the record a blok reads
 * (`self.<action>.latest`) and holds it in a live-state store, so there is one
 * subscription per `(agent, interface)` however many bloks read it, and
 * readers hear of it at most once per animation frame.
 */

/** Written by hand, and typed below: the generated documents are left alone. */
export const WatchLatestTaskDocument = gql`
  subscription WatchLatestTask($agent: ID!, $interface: String!) {
    latestTask(agent: $agent, interface: $interface) {
      __typename
      ... on LatestTaskSnapshot {
        implementation
        latest {
          id
          isDone
          latestEventKind
        }
        events {
          id
          task
          kind
          message
          progress
          returns
        }
      }
      ... on TaskChange {
        id
        isDone
        latestEventKind
      }
      ... on TaskEventChange {
        id
        task
        kind
        message
        progress
        returns
      }
    }
  }
`;

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

export type WatchLatestTaskSubscription = {latestTask: LatestTaskMessage};
export type WatchLatestTaskSubscriptionVariables = {agent: string; interface: string};

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

/**
 * The feed as the live-state store reads one: every change hands it the whole
 * of what is held, which the store publishes once per frame.
 */
export const subscribeLatestTask: LiveStateSubscribe<ApolloClient<unknown>> = (client, variables, handlers) => {
  let held: LatestTaskState | null = null;
  let revision = 0;
  const subscription = client
    .subscribe<WatchLatestTaskSubscription, WatchLatestTaskSubscriptionVariables>({
      query: WatchLatestTaskDocument,
      variables: {agent: variables.agentID, interface: variables.interface},
    })
    .subscribe({
      next: result => {
        const message = result.data?.latestTask;
        if (!message) return;
        const next = foldLatestTask(held, message);
        if (next === held || next === null) return;
        held = next;
        revision += 1;
        handlers.next({__typename: 'StateSnapshotEvent', value: next, globalRevision: revision});
      },
      error: handlers.error,
    });
  return () => subscription.unsubscribe();
};

export const latestTaskStore = createLiveStateStore<ApolloClient<unknown>>({subscribe: subscribeLatestTask});
