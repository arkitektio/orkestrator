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
  events: ((RunEventFragment & { offset: number }) | null)[];
};

export const Timeline = ({ id }: { id: string }) => {
  const { data: run } = withFluss(useDetailRunQuery)({
    variables: { id },
  });

  const { data: events } = withFluss(useEventsBetweenQuery)({
    variables: { id },
  });

  const [timeline, setTimeline] = useState<NodeTimeline[]>([]);

  const navigate = useNavigate();
  const { s3resolve } = useDatalayer();

  useEffect(() => {
    let betweens = events?.eventsBetween;
    let graph = run?.run?.flow?.graph;

    if (graph && betweens) {
      let connectionMap = graph.edges.filter(notEmpty).reduce((acc, edge) => {
        if (edge.source && edge.target) {
          if (acc[edge.target]) {
            acc[edge.target].push(edge.source);
          } else {
            acc[edge.target] = [edge.source];
          }
        }
        return acc;
      }, {} as Record<string, string[]>);

      // Create a node map of id to information on the node
      let nodeMap = graph.nodes.filter(notEmpty).reduce((acc, node) => {
        acc[node.id] = {
          ...node,
          events: [],
        };
        return acc;
      }, {} as Record<string, NodeTimeline>);

      let max = betweens.at(-1)?.createdAt;
      let min = betweens.at(0)?.createdAt;
      // Add events to the node map
      betweens
        .filter(notEmpty)
        .filter((e) => e.type == "NEXT")
        .forEach((event) => {
          Object.keys(nodeMap).forEach((value, index) => {
            let pushevent = {
              ...event,
              offset:
                (new Date(event.createdAt).getTime() -
                  new Date(min).getTime()) /
                (new Date(max).getTime() - new Date(min).getTime()),
            };

            if (event?.source === value) {
              nodeMap[value].events.push(pushevent);
            } else if (
              connectionMap[value] &&
              connectionMap[value].includes(event?.source)
            ) {
              nodeMap[value].events.push(pushevent);
            } else {
              nodeMap[value].events.push(null);
            }
          });
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
            <div className="w-full relative">
              <td>{node.id}</td>

              {node.events.map((event) => {
                console.log(event?.offset);
                if (!event) {
                  return <div> </div>;
                }
                return (
                  <div
                    className="bg-green-200 absolute"
                    style={{ left: event.offset * 100 + "%" }}
                  >
                    {" "}
                    x{" "}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
