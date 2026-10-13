import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { describe, expect, it } from "vitest";

import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import rekuestResult from "../api/fragments";
import { MyTasksDocument, TaskEventKind, type MyTasksQuery, type TaskEventChangeFragment } from "../api/graphql";
import { writeTaskEventToCache } from "./taskCache";
import { shouldAutoDismiss, taskRank } from "./taskIsland";
import { taskEventChangeToEvent } from "./taskTracker";

/** One running task, in the `LiveTask` shape the server answers `myTasks` with. */
const runningTask = (id: string) => ({
  __typename: "Task",
  id,
  latestEventKind: TaskEventKind.Started,
  args: {},
  reference: `ref-${id}`,
  isDone: false,
  events: [
    {
      __typename: "TaskEvent",
      id: `started-${id}`,
      kind: TaskEventKind.Started,
      level: "INFO",
      returns: null,
      task: { __typename: "Task", id, reference: `ref-${id}` },
      progress: null,
      reference: `ref-${id}`,
      createdAt: "2026-10-13T10:00:00Z",
      message: null,
      step: null,
      agentTs: null,
      effect: null,
      key: null,
      value: null,
      delegatedTo: null,
    },
  ],
  action: { __typename: "Action", hash: "h", id: "a1", name: "Segment", args: [] },
  dependencyMethod: null,
  dependency: null,
  dependencies: [],
  implementation: { __typename: "Implementation", id: "i1", interface: "segment", higherOrderFor: null },
  createdAt: "2026-10-13T10:00:00Z",
  finishedAt: null,
});

const change = (kind: TaskEventKind, id: string, extra: Partial<TaskEventChangeFragment> = {}) =>
  ({
    __typename: "TaskEventChange",
    id,
    task: "1",
    kind,
    message: null,
    progress: null,
    returns: null,
    value: null,
    createdAt: "2026-10-13T10:00:05Z",
    ...extra,
  }) as TaskEventChangeFragment;

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

/**
 * The app's arrangement: `TaskUpdater` seeds `MyTasks` once from the network
 * (cache-and-network), and the rail island reads it cache-first. The server's
 * `myTasks` only lists tasks that are NOT done.
 */
const setup = async () => {
  const state = { requests: 0, serverTasks: [runningTask("1")] as unknown[] };
  const link = new ApolloLink(
    () =>
      new Observable((observer) => {
        state.requests += 1;
        observer.next({ data: { myTasks: state.serverTasks } });
        observer.complete();
      }),
  );
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache({ possibleTypes: rekuestResult.possibleTypes, typePolicies: REKUEST_TYPE_POLICIES }),
  });
  const seed = client.watchQuery<MyTasksQuery>({ query: MyTasksDocument, fetchPolicy: "cache-and-network" }).subscribe(() => {});
  const island = { tasks: [] as MyTasksQuery["myTasks"] };
  const reader = client
    .watchQuery<MyTasksQuery>({ query: MyTasksDocument, fetchPolicy: "cache-first" })
    .subscribe((result) => {
      island.tasks = result.data?.myTasks ?? [];
    });
  await settle();
  const apply = (event: TaskEventChangeFragment) =>
    writeTaskEventToCache(client, event, taskEventChangeToEvent(event, "ref-1"));
  return { state, island, apply, close: () => (seed.unsubscribe(), reader.unsubscribe()) };
};

describe("writeTaskEventToCache", () => {
  it("leaves the task list complete, so an event never sends it back to the network", async () => {
    const { state, island, apply, close } = await setup();
    expect(state.requests).toBe(1);
    expect(apply(change(TaskEventKind.Progress, "p1", { progress: 40 }))).toBe(true);
    expect(apply(change(TaskEventKind.Progress, "p2", { progress: 80 }))).toBe(true);
    await settle();
    expect(state.requests).toBe(1); // still only the seed
    expect(island.tasks[0].events.map((event) => event.id)).toEqual(["p2", "p1", "started-1"]);
    // The synthesized event resolves its task through the normalized entity.
    expect(island.tasks[0].events[0].task).toEqual({ __typename: "Task", id: "1", reference: "ref-1" });
    close();
  });

  it("keeps a task that FAILED in the list, as a failure, for the island to go on showing", async () => {
    const { state, island, apply, close } = await setup();
    // From here on the server no longer lists the task: it is done. A refetch
    // would drop it, and with it the island's row — the error unread.
    state.serverTasks = [];
    apply(change(TaskEventKind.Failed, "f1", { message: "boom" }));
    await settle();
    expect(state.requests).toBe(1);
    expect(island.tasks).toHaveLength(1);
    const [task] = island.tasks;
    expect(task.latestEventKind).toBe(TaskEventKind.Failed);
    expect(task.isDone).toBe(true);
    expect(task.events[0].message).toBe("boom");
    expect(taskRank(task)).toBe(1);
    expect(shouldAutoDismiss(task, false)).toBe(false);
    close();
  });

  it("answers false for a task that is not in the cache yet, so the caller can buffer the event", async () => {
    const { apply, close } = await setup();
    expect(apply({ ...change(TaskEventKind.Progress, "p1"), task: "unknown" })).toBe(false);
    close();
  });
});
