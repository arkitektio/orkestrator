import { useEffect } from "react";

import {
  DetailRunFragment,
  EventsDocument,
  EventsSubscription,
  RunEventFragment,
  useEventsBetweenQuery,
} from "@/reaktion/api/graphql";
import { FiPlay } from "react-icons/fi";
import { useTrackRiver } from "../../context";
import { latestEventPerSource } from "./latestEvents";

/**
 * Upper bound on the events kept in the cached `eventsBetween` list. The
 * tracker only ever shows the latest event per source, so older entries are
 * superseded long before this cap bites; without it a long-running flow grew
 * the list (and the per-event reduce over it) without limit.
 */
const MAX_LIVE_EVENTS = 2000;

export const LiveTracker = ({
  startT,
  run,
}: {
  startT: number;
  run: DetailRunFragment;
}) => {
  const { setRunState } = useTrackRiver();

  const { data: events, subscribeToMore } = useEventsBetweenQuery({
    variables: {
      id: run.id,
      min: startT,
    },
  });

  useEffect(() => {
    const { events: newEvents, highestT } = latestEventPerSource(
      events?.eventsBetween,
    );
    setRunState({ t: highestT, events: newEvents });
  }, [events?.eventsBetween]);

  useEffect(() => {
    const unsubscripe = subscribeToMore<EventsSubscription>({
      document: EventsDocument,
      variables: { id: run.id },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newEvent = subscriptionData.data.events;
        if (!newEvent) return prev;
        const previous = prev.eventsBetween || [];
        const next: RunEventFragment[] =
          previous.length >= MAX_LIVE_EVENTS
            ? [...previous.slice(previous.length - MAX_LIVE_EVENTS + 1), newEvent]
            : [...previous, newEvent];
        return { eventsBetween: next };
      },
    });

    return () => {
      unsubscripe();
    };
  }, [run.id]);

  return (
    <div className="flex flex-row z-50">
      <div className="flex-initial my-auto mr-4 dark:text-white cursor-pointer my-auto">
        <FiPlay size={"1em"} />
      </div>

      <div className="flex-grow relative group my-auto">Live...</div>
    </div>
  );
};
