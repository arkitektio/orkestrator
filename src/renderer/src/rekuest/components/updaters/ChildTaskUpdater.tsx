import { useRekuest } from "@/rekuest/api/hooks";
import {
  TaskChangeFragment,
  useDetailTaskQuery,
} from "@/rekuest/api/graphql";
import {
  applyTaskChangeScalars,
  hydrateChildIntoDetailTask,
} from "@/rekuest/lib/taskCache";
import { mapReference } from "@/rekuest/lib/taskTracker";
import { toTaskChange, type ListSnapshot, type WireTaskChange } from "@/rekuest/session/frames";
import { useRekuestSession } from "@/rekuest/session/hooks";
import { useEffect } from "react";

/** Whether a task the `childTasks` feed announces is a child of `taskId` itself, not a grandchild. */
export const isDirectChild = (change: { parent?: string | null }, taskId: string): boolean =>
  change.parent != null && String(change.parent) === String(taskId);

export const ChildTaskUpdater = (props: { taskId: string }) => {
  const { taskId } = props;
  const client = useRekuest();
  const session = useRekuestSession();
  // A second hook instance of the query the detail page already watches
  // (Apollo dedups the request): its `refetch` reads the tree again after a drop.
  const { refetch } = useDetailTaskQuery({ variables: { id: taskId } });

  useEffect(() => {
    if (!client) return undefined;

    const onChange = (change: {
      create?: TaskChangeFragment | null;
      update?: TaskChangeFragment | null;
    }) => {
      if (change.update) {
        mapReference(change.update.id, change.update.reference);
        applyTaskChangeScalars(client, change.update);
        return;
      }
      if (change.create) {
        mapReference(change.create.id, change.create.reference);
        // The feed carries every descendant (its root's and its parent's
        // topic); `children` holds the direct ones only.
        if (isDirectChild(change.create, taskId)) {
          // Hydrate + append asynchronously; the cache write updates the query.
          void hydrateChildIntoDetailTask(client, change.create.id, taskId);
        }
      }
    };

    return session.watch(`children:${taskId}`, {
      onData: (item) => {
        const change = item as { create?: WireTaskChange | null; update?: WireTaskChange | null };
        onChange({
          create: change.create ? toTaskChange(change.create) : null,
          update: change.update ? toTaskChange(change.update) : null,
        });
      },
      onResync: (snapshot, reason) => {
        if (reason === "new") return;
        // Back after a drop: what changed meanwhile, then the tree as it is.
        for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) {
          applyTaskChangeScalars(client, toTaskChange(row));
        }
        void refetch().catch((e) => console.warn("[rekuest] reading the task again failed:", e));
      },
    });
  }, [taskId, client, session, refetch]);

  return <> </>;
};
