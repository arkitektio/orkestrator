import { useEffect, useState } from "react";
import { FiPlay } from "react-icons/fi";
import { RiStopLine } from "react-icons/ri";
import ReactSlider from "react-slider";
import Timestamp from "react-timestamp";
import {
  RunEventFragment,
  RunFragment,
  useEventsBetweenLazyQuery,
} from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useTrackRiver } from "./context";

export const RangeTracker = ({ run }: { run: RunFragment }) => {
  const { setRunState } = useTrackRiver();

  const [t, setT] = useState(0);
  const [play, setPlay] = useState(false);
  const [triggerRange, setTriggerRange] = useState({ min: 0, max: 10 });

  const [range, setRange] = useState({ min: 0, max: 100, marks: [0] });

  const [rangeEvents, setRangeEvents] = useState<
    (RunEventFragment | null | undefined)[]
  >([]);

  const [fetchInbetweenEvents] = withFluss(useEventsBetweenLazyQuery)();

  useEffect(() => {
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
    setRunState({ t: t, events: newEvents });
  }, [rangeEvents, t]);

  useEffect(() => {
    if (play) {
      const interval = setInterval(() => {
        setT((t) => (t > range.max ? 0 : t + 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [play, range]);

  useEffect(() => {
    let array = run?.snapshots?.map((snapshot) => snapshot.t) || [0, 100];
    setRange({
      min: Math.min(...array),
      max: Math.max(...array),
      marks: array,
    });
  }, [run?.snapshots]);

  useEffect(() => {
    if (t > triggerRange.max || t < triggerRange.min) {
      setTriggerRange({ min: t, max: t + 80 });
    }
  }, [t, triggerRange]);

  useEffect(() => {
    setRunState((state) => ({
      t: t,
      events: state?.events?.filter((event) => event && event?.t <= t),
    }));
  }, [t]);

  useEffect(() => {
    console.log("fetching events");

    fetchInbetweenEvents({
      variables: {
        id: run.id,
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
  }, [triggerRange, fetchInbetweenEvents, run.id]);

  return (
    <>
      <div
        className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
        onClick={() => setPlay(!play)}
      >
        {play ? <RiStopLine size={"1em"} /> : <FiPlay size={"1em"} />}
      </div>

      <div className="flex-grow">
        <ReactSlider
          className="horizontal-slider"
          thumbClassName="example-thumb rounded text-white border-[5px] border border-gray-100 transition-all duration-300 ease-linear"
          markClassName="example-thumb border border-indigo-700 bg-indigo-500 cursor-pointer rounded-xs "
          trackClassName="example-track bg-gray-700 cursor-pointer"
          onChange={(val) => {
            setT(val), setPlay(false);
          }}
          value={t}
          step={1}
          renderMark={(props) => <div {...props}></div>}
          renderThumb={(props, state) => (
            <div
              {...props}
              key={props.key}
              className={props.className + "group relative"}
            >
              <div className="absolute bottom-1  group-hover:block -translate-x-[50%] w-[10rem] p-2 text-center  rounded">
                <Timestamp
                  relative
                  date={
                    rangeEvents.find((e) => e?.t === state.valueNow)?.createdAt
                  }
                />
              </div>
            </div>
          )}
          marks={range.marks}
          max={range.max}
          min={range.min}
        />
      </div>
    </>
  );
};
