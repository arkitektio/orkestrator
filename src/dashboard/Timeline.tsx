import { useDatalayer } from "@jhnnsrs/datalayer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { first } from "rxjs";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";
import {
  FlowNodeFragment,
  RunEventFragment,
  useDetailRunQuery,
  useEventsBetweenQuery,
} from "../fluss/api/graphql";
import { withFluss } from "../fluss/fluss";
import { OptimizedImage } from "../layout/OptimizedImage";
import { PageLayout } from "../layout/PageLayout";
import { Representation } from "../linker";
import { useDashboardQueryQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export type Event = {
  timestamp: string;
};

export type NodeTimeline = FlowNodeFragment & {
  events: (RunEventFragment & { end: number; start: number })[];
};

export const recurseHighlight = (
  event: RunEventFragment,
  events: RunEventFragment[],
  highlighted: number[]
) => {
  if (event.causedBy && event.causedBy.length > 0) {
    event.causedBy.filter(notEmpty).forEach((e) => {
      console.log(highlighted, e);
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

export const Timeline = ({ id }: { id: string }) => {
  const { data: run } = withFluss(useDetailRunQuery)({
    variables: { id },
  });

  const { data: events } = withFluss(useEventsBetweenQuery)({
    variables: { id },
  });

  const [timeline, setTimeline] = useState<NodeTimeline[]>([]);
  const [highlighted, setHighlighted] = useState<number[]>([]);

  const highlightEvent = (event: RunEventFragment) => {
    let highlighted = [event.t];
    let betweens = events?.eventsBetween?.filter(notEmpty);
    if (betweens) {
      recurseHighlight(event, betweens, highlighted);
    }
    setHighlighted(highlighted);
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

          if (correspondingNode) {
            let pushevent = {
              ...event,
              end: interpolate(event.createdAt),
              start: interpolate(
                betweens?.find(
                  (e) =>
                    e?.t ==
                    Math.min(...(event.causedBy?.filter(notEmpty) || [0]))
                )?.createdAt
              ),
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
    <div className="flex flex-grow flex-col text-white @container">
      <div className="font-light text-xl flex mr-2 text-slate-2 mb-2">
        Live Monitoring
      </div>
      <div>
        {timeline.map((node) => {
          return (
            <div className="w-full relative h-10">
              <div className="absolute h-10 z-10">
                {node.__typename == "ArkitektNode" && node.name}
                {node.__typename == "ReactiveNode" && node.implementation}
              </div>

              {node.events.map((event) => {
                console.log(event?.end, console.log(event?.start));
                return (
                  <div
                    className={`${
                      highlighted.includes(event.t)
                        ? "bg-green-700 border-green-200 border-2"
                        : "border-gray-100 border-1 border-opacity-20"
                    } absolute h-10 border  z-1 bg-opacity-80 grid justify-items-end cursor-pointer`}
                    style={{
                      left: event.start * 100 + "%",
                      width: (event.end - event.start) * 100 + "%",
                    }}
                    onClick={() => highlightEvent(event)}
                  ></div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
