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
      events(existing, { toReference, readField }) {
        const list: readonly Reference[] = Array.isArray(existing)
          ? existing
          : [];
        if (list.some((ref) => readField("id", ref) === synth.id)) {
          return list;
        }
        // Write the nested task back-ref as id-only so Apollo's merge never
        // clobbers the real `reference` already on the normalized Task entity.
        const ref = toReference(
          { ...synth, task: { __typename: "Task", id: event.task } },
          true,
        );
        return ref ? [ref, ...list] : list;
      },
      latestEventKind: () => event.kind,
      isDone: (prev: boolean) => prev || event.kind === TaskEventKind.Completed,
      finishedAt: (prev: string | null) =>
        isTerminalEvent(event.kind) ? event.createdAt : prev,
    },
  });

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
