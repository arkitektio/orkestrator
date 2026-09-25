import { useRekuest } from "@/rekuest/api/hooks";
import {
  WatchOrgTasksDocument,
  WatchOrgTasksSubscription,
  WatchOrgTasksSubscriptionVariables,
} from "@/rekuest/api/graphql";
import { writeTaskEventToCache } from "@/rekuest/lib/taskCache";
import {
  referenceForId,
  taskEventChangeToEvent,
} from "@/rekuest/lib/taskTracker";
import { useEffect } from "react";

const REFETCH_DEBOUNCE_MS = 750;

/**
 * Keeps `ListTasks`-backed views live while an org-wide task list is on
 * screen. Mounted per-page (TasksPage / OrgTasksPage) so the org firehose
 * only runs while someone is actually looking at a list.
 *
 * - `event` deltas are written straight onto the normalized `Task:<id>`
 *   entity: every mounted list row referencing it (status chip, isDone)
 *   updates in place, and the write no-ops for uncached tasks.
 * - `create` deltas trigger ONE debounced refetch of all active `ListTasks`
 *   watchers instead of a client-side insert: the refetch re-runs with each
 *   page's current filter/ordering variables, so status chips, date ranges
 *   and pagination stay correct without replicating server-side TaskFilter
 *   semantics in the client.
 */
export const OrgTasksUpdater = () => {
  const client = useRekuest();

  useEffect(() => {
    if (!client) return undefined;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleListRefetch = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = undefined;
        void client.refetchQueries({ include: ["ListTasks"] });
      }, REFETCH_DEBOUNCE_MS);
    };

    const subscription = client
      .subscribe<
        WatchOrgTasksSubscription,
        WatchOrgTasksSubscriptionVariables
      >({
        query: WatchOrgTasksDocument,
        variables: {},
      })
      .subscribe((res) => {
        const event = res.data?.tasks.event;
        const create = res.data?.tasks.create;

        if (event) {
          writeTaskEventToCache(
            client,
            event,
            taskEventChangeToEvent(event, referenceForId(event.task)),
          );
        }

        if (create) {
          scheduleListRefetch();
        }
      });

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [client]);

  return null;
};
