import { useEffect, useMemo } from "react";

import { useListCallsQuery, useWatchCallsSubscription } from "@/lovekit/api/graphql";

import { callAnnouncementStore, useCallAnnouncements } from "./announcements";
import { useCallState } from "./store";

/**
 * Hears of the calls the organization starts and ends, and keeps the
 * announcements honest: lovekit's `calls` subscription delivers a call the
 * moment someone else starts it (never the user's own) and the moment LiveKit
 * closes its room (`ended`), so an ended call stops being offered. The same
 * subscription carries a call's new topics ("Add to the call") to every open
 * app, and re-reads the call lists (Calls, "Join calls", an object's calls), which
 * therefore do not poll. A `background` builtin, mounted for as long as lovekit is up.
 */
export const CallAnnouncementsWatcher = () => {
  const joined = useCallState((state) => state.call?.id);
  const announced = useCallAnnouncements((state) => state.calls);
  const ids = useMemo(() => announced.map((call) => call.id), [announced]);

  useWatchCallsSubscription({
    onData: ({ data, client }) => {
      // A new topic needs nothing for the pages: the answer lands in the
      // cache. The announcement holds its own copy of the row.
      const event = data.data?.calls;
      if (!event) return;
      const changed = event.update;
      if (changed) callAnnouncementStore.getState().sync([changed.id], [changed]);
      if (event.ended) callAnnouncementStore.getState().sync([event.ended.id], []);
      const call = event.create ?? event.resumed;
      if (call) callAnnouncementStore.getState().announce(call);
      if (!event.create && !event.ended && !event.resumed) return;
      // "Join calls" and the calls about an object list it, or drop it, as it
      // happens. Filtered rather than named: naming a query nobody has
      // mounted is a console warning.
      void client.refetchQueries({ include: "active", onQueryUpdated: (query) => query.queryName === "ListCalls" });
    },
  });

  const { data, variables } = useListCallsQuery({
    variables: { filter: { live: true, ids }, pagination: { limit: Math.max(ids.length, 1) } },
    skip: ids.length === 0,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (!data) return;
    callAnnouncementStore.getState().sync(variables?.filter?.ids ?? [], data.calls);
  }, [data, variables]);

  // Joining is the answer: the call is not offered again after leaving it.
  useEffect(() => {
    if (joined) callAnnouncementStore.getState().dismiss(joined);
  }, [joined]);

  // Another profile is another organization: its calls are not this one's.
  useEffect(() => () => callAnnouncementStore.getState().clear(), []);

  return null;
};
