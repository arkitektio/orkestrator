import { useEffect } from "react";
import {
  ConditionEventFragment,
  ConditionEventsSubscription,
  EventsDocument,
  useConditionEventsBetweenQuery,
} from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useTraceRiver } from "./context";

export const LiveTracer = ({
  startT,
  condition,
}: {
  startT: Date;
  condition: string;
}) => {
  const { setConditionState } = useTraceRiver();

  const { data: events, subscribeToMore } = withFluss(
    useConditionEventsBetweenQuery
  )({
    variables: {
      id: condition,
      min: startT,
    },
  });

  useEffect(() => {
    console.log("HALLO", events);
    let highest_t: Date | undefined = undefined;
    let newEvents = events?.conditionEventsBetween?.reduce((prev, event) => {
      if (event) {
        if (!highest_t) {
          highest_t = new Date(event.createdAt);
        }

        let prev_node = prev?.find((i) => i.source === event?.source);
        if (prev_node) {
          let prevtime = new Date(prev_node.createdAt);
          let eventtime = new Date(event.createdAt);

          if (prevtime > eventtime) {
            if (highest_t) {
              highest_t = eventtime > highest_t ? eventtime : highest_t;
            } else {
              highest_t = eventtime;
            }
            return prev.map((i) => (i.source === event.source ? event : i));
          }
          return prev;
        }
        return [...prev, event];
      }
      return prev;
    }, [] as ConditionEventFragment[]);

    console.log(highest_t);
    console.log(newEvents);
    if (highest_t && newEvents) {
      setConditionState({ timepoint: highest_t, events: newEvents });
    }
  }, [events?.conditionEventsBetween]);

  useEffect(() => {
    console.log("fetching events");

    let unsubscripe = subscribeToMore<ConditionEventsSubscription>({
      document: EventsDocument,
      variables: { id: condition },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newEvent = subscriptionData.data.conditionevents?.create;
        if (!newEvent) return prev;
        return {
          conditionEventsBetween: [
            ...(prev.conditionEventsBetween || []),
            newEvent,
          ],
        };
      },
    });

    return () => {
      unsubscripe();
    };
  }, []);

  return <></>;
};
