import { useRekuest } from "@/rekuest/api/hooks";
import {
  useDetailTaskQuery,
  WatchChildTasksDocument,
  WatchChildTasksSubscription,
  WatchChildTasksSubscriptionVariables,
} from "@/rekuest/api/graphql";
import {
  applyTaskChangeScalars,
  hydrateChildIntoDetailTask,
} from "@/rekuest/lib/taskCache";
import { mapReference } from "@/rekuest/lib/taskTracker";
import { useEffect } from "react";

export const ChildTaskUpdater = (props: { taskId: string }) => {
  const { taskId } = props;
  const client = useRekuest();
  // This is a second hook instance of the query the detail page already
  // watches — Apollo dedups the network request; we only need its
  // `subscribeToMore` so the subscription's lifetime is tied to this mount.
  const { subscribeToMore } = useDetailTaskQuery({ variables: { id: taskId } });

  useEffect(() => {
    if (!client) return undefined;
    const unsubscribe = subscribeToMore<
      WatchChildTasksSubscription,
      WatchChildTasksSubscriptionVariables
    >({
      document: WatchChildTasksDocument,
      variables: { parentId: taskId },
      updateQuery: (prev, { subscriptionData }) => {
        const change = subscriptionData.data?.childTasks;
        if (!change) return prev;

        if (change.update) {
          mapReference(change.update.id, change.update.reference);
          applyTaskChangeScalars(client, change.update);
          return prev;
        }

        if (change.create) {
          mapReference(change.create.id, change.create.reference);
          // Hydrate + append asynchronously; the cache write updates the query.
          void hydrateChildIntoDetailTask(client, change.create.id, taskId);
          return prev;
        }

        return prev;
      },
    });
    return () => {
      unsubscribe();
    };
  }, [taskId, subscribeToMore, client]);

  return <> </>;
};
