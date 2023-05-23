import { useEffect, useState } from "react";
import { FiPlay } from "react-icons/fi";
import { RiStopLine } from "react-icons/ri";
import ReactSlider from "react-slider";
import Timestamp from "react-timestamp";
import {
  ConditionEventFragment,
  ConditionFragment,
  useConditionEventsBetweenLazyQuery,
} from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useTraceRiver } from "./context";

export const RangeTracer = ({ run }: { run: ConditionFragment }) => {
  const { setConditionState } = useTraceRiver();

  const [t, setT] = useState<Date>(new Date());
  const [triggerRange, setTriggerRange] = useState({ min: 0, max: 10 });

  const [range, setRange] = useState({ min: 0, max: 100, marks: [0] });

  const [rangeEvents, setRangeEvents] = useState<
    (ConditionEventFragment | null | undefined)[]
  >([]);

  const [fetchInbetweenEvents] = withFluss(
    useConditionEventsBetweenLazyQuery
  )();

  useEffect(() => {
    let highest_t: Date | undefined = undefined;
    let newEvents = rangeEvents.reduce((prev, event) => {
      if (event) {
        let prev_node = prev?.find((i) => i.source === event?.source);
        if (prev_node) {
          if (prev_node.createdAt <= event.createdAt) {
            let new_date = new Date(event.createdAt);

            if (highest_t) {
              highest_t = new_date > highest_t ? new_date : highest_t;
            } else {
              highest_t = new_date;
            }
            return prev.map((i) => (i.source === event.source ? event : i));
          }
          return prev;
        }
        return [...prev, event];
      }
      return prev;
    }, [] as ConditionEventFragment[]);

    console.log(newEvents);
    if (highest_t && newEvents) {
      setConditionState({ timepoint: highest_t, events: newEvents });
    }
  }, [rangeEvents, t]);

  useEffect(() => {
    let array = run?.snapshots?.map((snapshot) => snapshot.createdAt) || [
      0, 100,
    ];
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
    setConditionState((state) => ({
      timepoint: t,
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
        console.error(res.data?.conditionEventsBetween);
        setRangeEvents(res.data?.conditionEventsBetween || []);
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
