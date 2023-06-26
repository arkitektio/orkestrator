import { useEffect, useState } from "react";
import Timestamp from "react-timestamp";
import { useTrackRiver } from "../floating/track/context";
import { notEmpty } from "../floating/utils";
import {
  FlowNodeFragment,
  RunEventFragment,
  useDetailRunQuery,
  useEventsBetweenQuery,
} from "../fluss/api/graphql";
import { withFluss } from "../fluss/fluss";
export type Event = {
  timestamp: string;
};

export type NodeTimeline = FlowNodeFragment & {
  events: (RunEventFragment & {
    end: number;
    start: number;
    startTime: Date;
  })[];
};

export const recurseHighlight = (
  event: RunEventFragment,
  events: RunEventFragment[],
  highlighted: number[]
) => {
  if (event.causedBy && event.causedBy.length > 0) {
    event.causedBy.filter(notEmpty).forEach((e) => {
      if (!highlighted.includes(e)) {
        highlighted.push(e);
        let potentialEle = events.find((ev) => ev?.t == e); // might not be found
        if (potentialEle) {
          recurseHighlight(potentialEle, events, highlighted);
        }
      }
    });
  }
};

export const TimelineRender = ({
  node,
  highlighted,
  highlightEvent,
  relativeEvent,
}: {
  node: NodeTimeline;
  highlighted: number[];
  highlightEvent: (event: RunEventFragment) => void;
  relativeEvent?: RunEventFragment;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [displayMode, setDisplayMode] = useState<"waterfall" | "absolute">(
    "waterfall"
  );

  return (
    <>
      <div
        className={
          expanded
            ? "col-span-2 cursor-pointer bg-gray-800 border rounded border-gray-800 "
            : "col-span-2 cursor-pointer border rounded border-gray-800 "
        }
      >
        <div className="w-full flex flex-col relative h-10 text-xl align-center group p-2 truncate ">
          <div onClick={() => setExpanded(!expanded)} className="">
            {node.__typename == "ArkitektNode" && node.name}
            {node.__typename == "ReactiveNode" && node.implementation}
          </div>
        </div>
        {expanded && (
          <div className="flex flex-row flex-wrap gap-2 mt-2 mx-2">
            <button
              onClick={() => setDisplayMode("waterfall")}
              className={`text-xs hover:bg-gray-700 bg-gray-900 px-2 py-1 ${
                displayMode == "waterfall" && "bg-gray-700"
              }`}
            >
              As Waterfall
            </button>
            <button
              onClick={() => setDisplayMode("absolute")}
              className={`text-xs hover:bg-gray-700 bg-gray-900 px-2 py-1 ${
                displayMode == "absolute" && "bg-gray-700"
              }`}
            >
              As Absolute
            </button>
          </div>
        )}
      </div>
      <div className="col-span-10">
        <div className="relative h-10 w-full bg-gray-100 bg-opacity-10 border border-gray-100 border-opacity-0">
          {node.events.map((event) => {
            return (
              <div
                className={`${
                  highlighted.includes(event.t)
                    ? "bg-green-700 border-green-200 border-2"
                    : "border-gray-100 border-1 border-opacity-20"
                } absolute h-10 border  z-1 bg-opacity-80 grid justify-items-center cursor-pointer`}
                style={{
                  left: event.start * 100 + "%",
                  width: (event.end - event.start) * 100 + "%",
                }}
                onClick={(e) => {
                  highlightEvent(event), e.stopPropagation();
                }}
              >
                {highlighted.includes(event.t) && (
                  <Timestamp
                    date={event.startTime}
                    relativeTo={event.createdAt}
                    options={{ includeDay: true }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {expanded && (
          <>
            {node.events.map((event, index) => {
              return (
                <div className="w-full relative h-2">
                  <div
                    className={`${
                      highlighted.includes(event.t)
                        ? "bg-green-700 border-green-200 border-2"
                        : "border-gray-100 border-1 border-opacity-20"
                    } absolute h-2 border  z-1 bg-opacity-80 grid justify-items-end cursor-pointer`}
                    style={{
                      left:
                        displayMode == "waterfall"
                          ? event.start * 100 + "%"
                          : "0%",
                      width: (event.end - event.start) * 100 + "%",
                    }}
                    onClick={(e) => {
                      highlightEvent(event), e.stopPropagation();
                    }}
                  ></div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
};

export const Timeline = ({ id }: { id: string }) => {
  const { data: run } = withFluss(useDetailRunQuery)({
    variables: { id },
  });

  const { data: events } = withFluss(useEventsBetweenQuery)({
    variables: { id },
  });

  const { runState } = useTrackRiver();

  const [timeline, setTimeline] = useState<NodeTimeline[]>([]);
  const [highlighted, setHighlighted] = useState<number[]>([]);
  const [relativeEvent, setRelativeEvent] = useState<
    RunEventFragment | undefined
  >();
  const [showReactive, setShowReactive] = useState(true);

  useEffect(() => {
    if (runState?.t) {
      let x = events?.eventsBetween?.find((e) => e?.t == runState?.t);
      if (x) {
        highlightEvent(x);
      }
    }
  }, [runState?.t]);

  const highlightEvent = (event: RunEventFragment) => {
    let highlighted = [event.t];
    let betweens = events?.eventsBetween?.filter(notEmpty);
    if (betweens) {
      recurseHighlight(event, betweens, highlighted);
    }
    setHighlighted(highlighted);
    setRelativeEvent(event);
  };

  useEffect(() => {
    let betweens = events?.eventsBetween;
    let graph = run?.run?.flow?.graph;

    if (graph && betweens) {
      // Create a node map of id to information on the node
      let nodeMap = graph.nodes.filter(notEmpty).reduce((acc, node) => {
        if (node.id == "1" || node.id == "2" || node.id == "3") {
          return acc;
        }

        acc[node.id] = {
          ...node,
          events: [],
        };
        return acc;
      }, {} as Record<string, NodeTimeline>);

      let max = betweens.at(-1)?.createdAt;
      let min = betweens.at(0)?.createdAt;

      const interpolate = (time: Date) => {
        return (
          (new Date(time).getTime() - new Date(min).getTime()) /
          (new Date(max).getTime() - new Date(min).getTime())
        );
      };

      // Add events to the node map
      betweens
        .filter(notEmpty)
        .filter((e) => e.type == "NEXT")
        .forEach((event) => {
          let correspondingNode = nodeMap[event.source];

          let startTime = betweens?.find(
            (e) =>
              e?.t == Math.min(...(event.causedBy?.filter(notEmpty) || [0]))
          )?.createdAt;

          if (correspondingNode) {
            let pushevent = {
              ...event,
              end: interpolate(event.createdAt),
              start: interpolate(startTime),
              startTime: startTime,
            };

            correspondingNode.events.push(pushevent);
          }
        });

      // Convert the node map to an array
      let timeline = Object.keys(nodeMap).map((value, index) => {
        return nodeMap[value];
      });

      setTimeline(timeline);
    }
  }, [run, events]);

  return (
    <div
      className="flex flex-grow flex-col text-white @container"
      onClick={() => setHighlighted([])}
    >
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold mb-1">Timeline</div>
        <div className="flex items-center">
          <button onClick={() => setShowReactive(!showReactive)}>
            {showReactive ? ">" : "<"}
          </button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2">
          {timeline.map((node) => (
            <>
              {node.typename == "ReactiveNode" && !showReactive ? (
                <></>
              ) : (
                <TimelineRender
                  key={node.id}
                  node={node}
                  highlighted={highlighted}
                  highlightEvent={highlightEvent}
                  relativeEvent={relativeEvent}
                />
              )}
            </>
          ))}
        </div>
      </div>
    </div>
  );
};
