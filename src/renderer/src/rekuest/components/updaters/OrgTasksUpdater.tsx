import { useRekuest } from "@/rekuest/api/hooks";
import {
  TaskEventChangeFragment,
} from "@/rekuest/api/graphql";
import { writeTaskEventToCache } from "@/rekuest/lib/taskCache";
import {
  referenceForId,
  taskEventChangeToEvent,
} from "@/rekuest/lib/taskTracker";
import { toTaskEventChange, type WireTaskEvent } from "@/rekuest/session/frames";
import { useRekuestSession } from "@/rekuest/session/hooks";
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
  const session = useRekuestSession();

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

    const onChange = ({
      event,
      create,
    }: {
      event?: TaskEventChangeFragment | null;
      create?: unknown;
    }) => {
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
    };

    const stop = session.watch("tasks:org", {
        onData: (item) => {
          const change = item as { event?: WireTaskEvent | null; create?: unknown };
          onChange({
            event: change.event ? toTaskEventChange(change.event) : null,
            create: change.create,
          });
        },
        // Back after a drop: the lists as they are now.
        onResync: (_, reason) => {
          if (reason !== "new") scheduleListRefetch();
        },
      });

    return () => {
      stop();
      if (timeout) clearTimeout(timeout);
    };
  }, [client, session]);

  return null;
};
