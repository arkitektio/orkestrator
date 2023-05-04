import React, { useEffect, useState } from "react";
import { FiPlay } from "react-icons/fi";
import { AiOutlineReload } from "react-icons/ai";
import { Ri4KFill, RiStopLine } from "react-icons/ri";
import { usePopper } from "react-popper";
import ReactSlider from "react-slider";
import Timestamp from "react-timestamp";
import { min } from "rxjs";
import { TrackRiver } from "../../floating/track/TrackRiver";
import { RunState } from "../../floating/types";
import { ModuleLayout } from "../../layout/ModuleLayout";
import { PageLayout } from "../../layout/PageLayout";
import RunSidebar from "../../pages/flows/runs/RunSidebar";
import {
  RunEventFragment,
  useDetailRunQuery,
  useEventsBetweenLazyQuery,
  useEventsSubscription,
} from "../api/graphql";
import { withFluss } from "../fluss";
import "./run.css";
export type RunProps = {
  id: string;
};

const Run: React.FC<RunProps> = ({ id }) => {
  const { data, refetch } = withFluss(useDetailRunQuery)({
    variables: { id: id },
  });

  const { data: latestEvent } = withFluss(useEventsSubscription)({
    variables: { id: id },
  });

  const [t, setT] = useState(0);
  const [play, setPlay] = useState(false);
  const [triggerRange, setTriggerRange] = useState({ min: 0, max: 10 });

  const [range, setRange] = useState({ min: 0, max: 100, marks: [0] });

  const [rangeEvents, setRangeEvents] = useState<
    (RunEventFragment | null | undefined)[]
  >([]);

  const [state, setState] = useState<RunState>({ t: 0 });
  const [reload, setReload] = useState(false);
  const [live, setLive] = useState<boolean>(false);

  const [fetchInbetweenEvents] = withFluss(useEventsBetweenLazyQuery)();

  useEffect(() => {
    if (!live) {
      let newEvents = rangeEvents?.reduce((prev, event) => {
        if (event && event.t <= t) {
          let prev_node = prev?.find((i) => i.source === event?.source);
          if (prev_node) {
            if (prev_node.t <= event.t) {
              return prev.map((i) => (i.source === event.source ? event : i));
            }
            return prev;
          }
          return [...prev, event];
        }
        return prev;
      }, [] as RunEventFragment[]);

      console.log(newEvents);
      setState({ t: t, events: newEvents });
    }
  }, [rangeEvents, t]);

  useEffect(() => {
    if (latestEvent && live) {
      setRangeEvents((rangeEvents) => [
        ...rangeEvents,
        latestEvent.events?.create,
      ]);
      setRange((range) => ({
        min: range.min,
        max: latestEvent.events?.create?.t ?? 0,
        marks: range.marks,
      }));
      console.log(latestEvent);
      setT(latestEvent.events?.create?.t ?? 0);
    }
  }, [latestEvent]);

  useEffect(() => {}, [live]);

  useEffect(() => {
    if (play) {
      const interval = setInterval(() => {
        setT((t) => (t > range.max ? 0 : t + 1));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [play, range]);

  useEffect(() => {
    let array = data?.run?.snapshots?.map((snapshot) => snapshot.t) || [0, 100];
    setRange({
      min: Math.min(...array),
      max: Math.max(...array),
      marks: array,
    });
  }, [data?.run?.snapshots]);

  useEffect(() => {
    if (t > triggerRange.max || t < triggerRange.min) {
      setTriggerRange({ min: t, max: t + 10 });
    }
  }, [t, triggerRange]);

  useEffect(() => {
    setState((state) => ({
      t: t,
      events: state?.events?.filter((event) => event && event?.t <= t),
    }));
  }, [t]);

  useEffect(() => {
    console.log("fetching events");
    fetchInbetweenEvents({
      variables: {
        id: id,
        min: triggerRange.min,
        max: triggerRange.max,
      },
    })
      .then((res) => {
        console.error(res.data?.eventsBetween);
        setRangeEvents(res.data?.eventsBetween || []);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [triggerRange, fetchInbetweenEvents, id]);

  return <>{data?.run?.id && <TrackRiver id={data?.run.id} />}</>;
};

export { Run };
