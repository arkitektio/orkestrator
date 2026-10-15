import type { ApolloClient, DocumentNode, Reference } from "@apollo/client";
import {
  DetailTaskDocument,
  DetailTaskQuery,
  FullTaskDocument,
  FullTaskQuery,
  LiveTaskFragment,
  PostmanTaskFragment,
  TaskChangeFragment,
  TaskDocument,
  TaskEventChangeFragment,
  TaskEventFragment,
  TaskEventKind,
  TaskQuery,
  TaskQueryVariables,
  MyTasksDocument,
  MyTasksQuery,
} from "../api/graphql";
import {
  isTerminalEvent,
  referenceForId,
  takeBufferedEvents,
  taskEventChangeToEvent,
} from "./taskTracker";

/**
 * Cache-merge helpers shared by every subscription updater (TaskUpdater,
 * ChildTaskUpdater, OrgTasksUpdater, AgentPage). The rekuest subscriptions
 * carry thin, non-traversable deltas (scalar ids only), so the pattern is
 * always: hydrate the full task graph once via a query, then merge the hot
 * scalars/events into the normalized `Task:<id>` entity.
 */

type RekuestClient = ApolloClient<unknown>;

/**
 * The window a paginated `events` entry holds, read off its store field name
 * (`events({"ordering":…,"pagination":{"limit":25}})`); `undefined` for the
 * unpaginated entry, which is a detail view's full history.
 */
export const eventWindowOf = (storeFieldName: string): number | undefined => {
  const match = /"pagination":\{[^}]*"limit":(\d+)/.exec(storeFieldName);
  return match ? Number(match[1]) : undefined;
};

/**
 * Merge a single (synthesized) task event into the normalized `Task:<id>` entity.
 * Works for any cached task — top-level or child — and returns whether the
 * entity existed (so the caller can buffer events that raced ahead of hydration).
 */
export const writeTaskEventToCache = (
  client: RekuestClient,
  event: TaskEventChangeFragment,
  synth: TaskEventFragment,
): boolean =>
  client.cache.modify({
    id: client.cache.identify({ __typename: "Task", id: event.task }),
    fields: {
      events(existing, { toReference, readField, storeFieldName }) {
        const list: readonly Reference[] = Array.isArray(existing)
          ? existing
          : [];
        if (list.some((ref) => readField("id", ref) === synth.id)) {
          return list;
        }
        // The event's back-ref to its task is written as a REFERENCE to the
        // normalized `Task:<id>`, never as an object. `toReference(…, true)`
        // stores the event's fields as they are — it does not normalize what
        // is nested in them — so an id-only object here stayed an embedded
        // `{ id }` with no `reference`. Every query selecting
        // `events { task { reference } }` (the global `MyTasks` list among
        // them) then read as INCOMPLETE, and Apollo answered by refetching it
        // from the network: one request per event, and on a terminal event a
        // list the server had already dropped the task from — a task that
        // failed disappeared from the rail island the moment it did.
        const ref = toReference(
          { ...synth, task: toReference({ __typename: "Task", id: event.task }) },
          true,
        );
        if (!ref) return list;
        // The modifier runs on EVERY stored variant of `events`. The live list
        // (`LiveTask`, paginated) keeps its window, so a long-running task
        // costs the same on its 10 000th event as on its 10th; the
        // unpaginated variant is a detail page's full history and stays whole.
        const size = eventWindowOf(storeFieldName);
        const next = [ref, ...list];
        return size !== undefined && next.length > size ? next.slice(0, size) : next;
      },
      // An ended task stays ended: what arrives after it (a LATE_REPORT) is
      // an annotation, never a new state.
      latestEventKind: (prev: TaskEventKind) =>
        prev && isTerminalEvent(prev) && !isTerminalEvent(event.kind)
          ? prev
          : event.kind,
      // The server sets isDone on EVERY terminal kind, not just COMPLETED;
      // mirror it, or a failed / cancelled / lost task reads as running (and
      // every clock keyed on isDone ticks on forever).
      isDone: (prev: boolean) => prev || isTerminalEvent(event.kind),
      finishedAt: (prev: string | null) =>
        isTerminalEvent(event.kind) ? event.createdAt : prev,
      // The task's latest report, as the server keeps it (takt `insert_event`).
      latestProgress: (prev: number | null) =>
        event.kind === TaskEventKind.Progress && event.progress != null ? event.progress : prev,
      latestMessage: (prev: string | null) => event.message ?? prev,
      latestReturns: (prev: unknown) => (event.kind === TaskEventKind.Yield ? (event.returns ?? null) : prev),
    },
  });

/**
 * How long task events collect before they reach the cache. A task reporting
 * progress at 20 Hz was 20 broadcasts a second, each one re-reading every
 * query that holds the task; collected, it is one. A timer, not a frame:
 * frames stop while the window is hidden, timers only slow down.
 */
export const TASK_EVENT_FLUSH_MS = 50;

/**
 * Collects task events and writes them in one `cache.batch` (one broadcast).
 * Whether the task was cached is decided when the event is WRITTEN, not when
 * it arrived — an event for a task still being hydrated is handed to
 * `onMissing` (the caller buffers it for the hydration to replay).
 */
export const createTaskEventQueue = (
  client: RekuestClient,
  onMissing: (event: TaskEventChangeFragment) => void,
  flushMs: number = TASK_EVENT_FLUSH_MS,
) => {
  let pending: { event: TaskEventChangeFragment; synth: TaskEventFragment }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    const missing: TaskEventChangeFragment[] = [];
    client.cache.batch({
      update: () => {
        for (const { event, synth } of batch) {
          if (!writeTaskEventToCache(client, event, synth)) missing.push(event);
        }
      },
    });
    missing.forEach(onMissing);
  };

  return {
    push: (event: TaskEventChangeFragment, synth: TaskEventFragment) => {
      pending.push({ event, synth });
      if (!timer) timer = setTimeout(flush, flushMs);
    },
    flush,
  };
};

/** Flush events that were buffered before the task was hydrated. */
export const flushBufferedEvents = (client: RekuestClient, id: string) => {
  const buffered = takeBufferedEvents(id);
  if (!buffered.length) return;
  const reference = referenceForId(id);
  // Buffered oldest-first; apply in order so the newest ends up at the front.
  for (const change of buffered) {
    writeTaskEventToCache(
      client,
      change,
      taskEventChangeToEvent(change, reference),
    );
  }
};

const fetchTask = async <Q extends { task?: unknown }>(
  client: RekuestClient,
  query: DocumentNode,
  id: string,
): Promise<Q["task"] | undefined> => {
  try {
    const result = await client.query<Q, TaskQueryVariables>({
      query,
      variables: { id },
      fetchPolicy: "network-only",
    });
    return result.data?.task ?? undefined;
  } catch (error) {
    console.error("Failed to hydrate task", id, error);
    return undefined;
  }
};

/**
 * Fetch a task once (network-only) in the slim `LiveTask` shape shared with the
 * global `MyTasks` list, normalizing it into the cache.
 */
export const hydrateTask = (
  client: RekuestClient,
  id: string,
): Promise<LiveTaskFragment | undefined> =>
  fetchTask<TaskQuery>(client, TaskDocument, id);

/**
 * Fetch a task once with its full `action { ...Ports }` (`PostmanTask`), for
 * readers that render ports — `DetailTask.children` (timeline / task-space).
 */
export const hydrateFullTask = (
  client: RekuestClient,
  id: string,
): Promise<PostmanTaskFragment | undefined> =>
  fetchTask<FullTaskQuery>(client, FullTaskDocument, id);

/**
 * A thin `create` carries only ids, so fetch the full task once and insert it
 * into the global list cache. Returns the hydrated task (for the toast decision).
 */
export const hydrateAndInsertMyTask = async (
  client: RekuestClient,
  create: TaskChangeFragment,
): Promise<LiveTaskFragment | undefined> => {
  const task = await hydrateTask(client, create.id);
  if (!task) return undefined;

  // Apply any events that arrived during the hydration round-trip.
  flushBufferedEvents(client, create.id);

  client.cache.updateQuery<MyTasksQuery>({ query: MyTasksDocument }, (data) => {
    if (!data) return { myTasks: [task] };
    if (data.myTasks.some((t) => t.id === task.id)) return data;
    return { myTasks: data.myTasks.concat([task]) };
  });

  return task;
};

/**
 * A task `update` is a non-traversable `TaskChange` (`__typename: "TaskChange"`),
 * so it does NOT auto-normalize into the `Task:<id>` entity. Write its hot
 * scalars onto the normalized task explicitly — every query referencing that
 * entity (detail children, list rows, …) updates in place.
 */
export const applyTaskChangeScalars = (
  client: RekuestClient,
  change: TaskChangeFragment,
) => {
  client.cache.modify({
    id: client.cache.identify({ __typename: "Task", id: change.id }),
    fields: {
      latestEventKind: () => change.latestEventKind,
      isDone: () => change.isDone,
      finishedAt: () => change.finishedAt ?? null,
    },
  });
};

/**
 * A new child arrives non-traversable, so fetch its full graph once and append
 * it to the parent's `children`. Timeline/store readers need the full child.
 */
export const hydrateChildIntoDetailTask = async (
  client: RekuestClient,
  childId: string,
  parentId: string,
) => {
  const child = await hydrateFullTask(client, childId);
  if (!child) return;

  client.cache.updateQuery<DetailTaskQuery>(
    { query: DetailTaskDocument, variables: { id: parentId } },
    (prev) => {
      if (!prev?.task) return prev;
      if ((prev.task.children || []).some((c) => c.id === child.id)) {
        return prev;
      }
      return {
        ...prev,
        task: {
          ...prev.task,
          children: [...(prev.task.children || []), child],
        },
      };
    },
  );
};

/** How many tasks the agent fragment asks for (`agent.graphql`, `limit: 5`). */
const AGENT_TASKS_LIMIT = 5;

/**
 * `WatchAgentTasks` creates arrive as thin `TaskChange` deltas, so fetch the
 * full task once and prepend a reference to it on the agent's `tasks` field.
 * Writing a reference (rather than the payload) is what lets the agent list —
 * which reads `ListTask` — resolve every field off the normalized entity.
 */
export const hydrateAndInsertAgentTask = async (
  client: RekuestClient,
  create: TaskChangeFragment,
  agentId: string,
): Promise<LiveTaskFragment | undefined> => {
  const task = await hydrateTask(client, create.id);
  if (!task) return undefined;

  // Apply any events that arrived during the hydration round-trip.
  flushBufferedEvents(client, create.id);

  client.cache.modify({
    id: client.cache.identify({ __typename: "Agent", id: agentId }),
    fields: {
      tasks(existing, { toReference, readField }) {
        const list: readonly Reference[] = Array.isArray(existing)
          ? existing
          : [];
        if (list.some((ref) => readField("id", ref) === task.id)) {
          return list;
        }
        const ref = toReference({ __typename: "Task", id: task.id });
        return ref ? [ref, ...list].slice(0, AGENT_TASKS_LIMIT) : list;
      },
    },
  });

  return task;
};
