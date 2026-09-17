import { useRekuest } from "@/app/Arkitekt";
import { useEffect, useRef } from "react";
import {
  MyTasksDocument,
  MyTasksQuery,
  useMyTasksQuery,
  WatchMyTasksDocument,
  WatchMyTasksSubscription,
  WatchMyTasksSubscriptionVariables,
} from "../../api/graphql";
import {
  bufferEvent,
  deliverHeldEvents,
  deliverToCallback,
  holdForCallback,
  isGloballyNotified,
  isTaskLive,
  mapReference,
  referenceForId,
  registeredCallbacks,
  taskEventChangeToEvent,
} from "../../lib/taskTracker";
import {
  flushBufferedEvents,
  hydrateAndInsertMyTask,
  writeTaskEventToCache,
} from "../../lib/taskCache";
import {
  notify as notifyTask,
  notifyMany as notifyTasks,
} from "../../lib/taskNotifications";

export { registeredCallbacks } from "../../lib/taskTracker";

export const TaskUpdater = () => {
  const client = useRekuest();

  // The single network query for the global "my tasks" list: TaskUpdater is
  // mounted exactly once at the app root, so this fires once on startup (and on
  // a full reload) to seed the list before any view renders. The subscription
  // below keeps the cache live afterwards, and every consumer reads from cache
  // (`useTasks` is cache-first) so they never re-query and clobber it.
  const { data, loading } = useMyTasksQuery({
    fetchPolicy: "cache-and-network",
  });

  // The notification store lives in memory and the subscription only reports
  // tasks created from now on, so after a reload the rail's task island was
  // empty even with tasks still running. Seed it ONCE from the first settled
  // result: re-seeding on every cache change would re-surface tasks that a
  // component deliberately tracks locally (see the `registeredCallbacks` skip
  // below).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || loading || !data) return;
    seeded.current = true;
    const running = data.myTasks
      .filter(isTaskLive)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((task) => task.id);
    notifyTasks(running);
  }, [data, loading]);

  useEffect(() => {
    if (!client) return undefined;

    const subscription = client
      .subscribe<WatchMyTasksSubscription, WatchMyTasksSubscriptionVariables>({
        query: WatchMyTasksDocument,
        variables: {},
      })
      .subscribe((res) => {
        const event = res.data?.mytasks.event;
        const create = res.data?.mytasks.create;

        if (event) {
          const reference = referenceForId(event.task);
          const synth = taskEventChangeToEvent(event, reference);

          // Deliver to locally tracking components outside the cache update
          // (cache writes no-op when the entity isn't cached yet).
          if (reference) {
            deliverToCallback(reference, synth);
          } else {
            // Not routable until the task's reference is known.
            holdForCallback(event.task, event);
          }

          const existed = writeTaskEventToCache(client, event, synth);
          if (!existed) {
            // The event arrived before its task was hydrated; replay it once
            // the create/hydration completes.
            bufferEvent(event.task, event);
          }
        }

        if (create) {
          mapReference(create.id, create.reference);
          // Events that arrived before this payload had no reference to be
          // routed by; the local tracker gets them now.
          deliverHeldEvents(create.id);

          const existing = client.readQuery<MyTasksQuery>({
            query: MyTasksDocument,
          });
          if (existing?.myTasks.some((t) => t.id === create.id)) {
            flushBufferedEvents(client, create.id);
            return;
          }

          void hydrateAndInsertMyTask(client, create).then((task) => {
            if (!task) {
              return;
            }
            if (
              create.reference &&
              registeredCallbacks.has(create.reference) &&
              !isGloballyNotified(create.reference)
            ) {
              // Already tracked locally by a component that is showing the
              // progress itself, so skip the global notification — unless it
              // asked for both, which is what a tracker inside a surface that
              // closes (the command palette) does.
              return;
            }
            notifyTask(create.id);
          });
        }
      });

    return () => subscription.unsubscribe();
  }, [client]);

  return <></>;
};
