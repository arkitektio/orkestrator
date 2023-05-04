import { useEffect } from "react";
import {
  EventsDocument,
  EventsSubscription,
  RunEventFragment,
  useEventsBetweenQuery,
} from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useTrackRiver } from "./context";

export const LiveTracker = ({
  startT,
  run,
}: {
  startT: number;
  run: string;
}) => {
  const { setRunState } = useTrackRiver();

  const { data: events, subscribeToMore } = withFluss(useEventsBetweenQuery)({
    variables: {
      id: run,
      min: startT,
    },
  });

  useEffect(() => {
    let highest_t = 0;
    let newEvents = events?.eventsBetween?.reduce((prev, event) => {
      if (event) {
        let prev_node = prev?.find((i) => i.source === event?.source);
        if (prev_node) {
          if (prev_node.t <= event.t) {
            highest_t = Math.max(highest_t, event.t);
            return prev.map((i) => (i.source === event.source ? event : i));
          }
          return prev;
        }
        return [...prev, event];
      }
      return prev;
    }, [] as RunEventFragment[]);

    console.log(newEvents);
    setRunState({ t: highest_t, events: newEvents });
  }, [events?.eventsBetween]);

  useEffect(() => {
    console.log("fetching events");

    let unsubscripe = subscribeToMore<EventsSubscription>({
      document: EventsDocument,
      variables: { id: run },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newEvent = subscriptionData.data.events?.create;
        if (!newEvent) return prev;
        return { eventsBetween: [...(prev.eventsBetween || []), newEvent] };
      },
    });

    return () => {
      unsubscripe();
    };
  }, [startT]);

  return <></>;
};
