import { useRekuest } from "@/rekuest/api/hooks";
import { useEffect, useRef } from "react";
import {
  MyTasksDocument,
  MyTasksQuery,
  TaskChangeFragment,
  TaskEventChangeFragment,
  useMyTasksQuery,
} from "../../api/graphql";
import {
  bufferEvent,
  deliverHeldEvents,
  deliverToCallback,
  holdForCallback,
  consumeSilenced,
  isGloballyNotified,
  isTaskLive,
  mapReference,
  referenceForId,
  registeredCallbacks,
  taskEventChangeToEvent,
} from "../../lib/taskTracker";
import {
  applyTaskChangeScalars,
  catchUpTrackedTasks,
  createTaskEventQueue,
  flushBufferedEvents,
  hydrateAndInsertMyTask,
} from "../../lib/taskCache";
import {
  toTaskChange,
  toTaskEventChange,
  type ListSnapshot,
  type WireTaskChange,
  type WireTaskEvent,
} from "../../session/frames";
import { useRekuestSession } from "../../session/hooks";
import {
  notify as notifyTask,
  notifyMany as notifyTasks,
} from "../../lib/taskNotifications";

export { registeredCallbacks } from "../../lib/taskTracker";

export const TaskUpdater = () => {
  const client = useRekuest();
  const session = useRekuestSession();

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

    // The cache writes are collected (one broadcast per flush); an event
    // whose task is not cached yet is buffered for its hydration to replay.
    const events = createTaskEventQueue(client, (event) => bufferEvent(event.task, event));

    const onChange = ({
      event,
      create,
    }: {
      event?: TaskEventChangeFragment | null;
      create?: TaskChangeFragment | null;
    }) => {
      if (event) {
        const reference = referenceForId(event.task);
        const synth = taskEventChangeToEvent(event, reference);

        // Deliver to locally tracking components at once, outside the
        // (collected) cache update.
        if (reference) {
          deliverToCallback(reference, synth);
        } else {
          // Not routable until the task's reference is known.
          holdForCallback(event.task, event);
        }

        events.push(event, synth);
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
          if (create.reference && consumeSilenced(create.reference)) {
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
    };

    // What a feed that dropped and came back did not send: the list is read
    // again, and the tasks a component tracks locally are told what they
    // missed.
    const catchUp = () => {
      void catchUpTrackedTasks(client).catch((e) =>
        console.warn("[rekuest] catching up tracked tasks failed:", e),
      );
    };

    // The window's caller session: a resume replays nothing of a list, it
    // resends it (`RESYNC resumed`), and a window back after its grace gets it
    // as `session_expired`: then the list is read again and the tasks a
    // component tracks locally are told what they missed.
    const stop = session.watch("tasks:mine", {
      onData: (item) => {
        const change = item as { event?: WireTaskEvent | null; create?: WireTaskChange | null };
        onChange({
          event: change.event ? toTaskEventChange(change.event) : null,
          create: change.create ? toTaskChange(change.create) : null,
        });
      },
      onResync: (snapshot, reason) => {
        if (reason === "new") return;
        for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) {
          applyTaskChangeScalars(client, toTaskChange(row));
        }
        void client
          .refetchQueries({ include: [MyTasksDocument] })
          .catch((e) => console.warn("[rekuest] reading my tasks again failed:", e));
        catchUp();
      },
    });
    return () => {
      stop();
      events.flush();
    };
  }, [client, session]);

  return <></>;
};
