import React, { useEffect, useState } from "react";
import "react-contexify/dist/ReactContexify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "reactflow";
import { AiOutlineReload } from "react-icons/ai";
import { FiPlay } from "react-icons/fi";
import { RiStopLine } from "react-icons/ri";
import ReactSlider from "react-slider";
import Timestamp from "react-timestamp";
import "react-toastify/dist/ReactToastify.css";
import {
  FlowFragment,
  RunEventFragment,
  useDetailRunQuery,
  useEventsBetweenLazyQuery,
  useEventsSubscription,
} from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { PageLayout } from "../../layout/PageLayout";
import { Graph } from "../base/Graph";
import { FlowNode, NodeTypes, RunState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { RiverTrackContext } from "./context";
import { DynamicSidebar } from "./DynamicSidebar";
import { FancyTrackEdge } from "./edges/FancyTrackEdge";
import { LabeledTrackEdge } from "./edges/LabeledTrackEdge";
import { ArkitektTrackNodeWidget } from "./nodes/ArkitektTrackNodeWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgTrackNodeWidget";
import { KwargTrackNodeWidget } from "./nodes/generic/KwargTrackNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnTrackNodeWidget";
import { ReactiveTrackNodeWidget } from "./nodes/ReactiveTrackNodeWidget";
import { BottomSlider } from "./Slider";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektTrackNodeWidget,
  ReactiveNode: ReactiveTrackNodeWidget,
  ArgNode: ArgTrackNodeWidget,
  ReturnNode: ReturnTrackNodeWidget,
  KwargNode: KwargTrackNodeWidget,
};

const edgeTypes: EdgeTypes = {
  LabeledEdge: LabeledTrackEdge,
  FancyEdge: FancyTrackEdge,
};

export type Props = {
  id: string;
};

export const TrackRiver: React.FC<Props> = ({ id }) => {
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
      }, 1000);
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(nodes_to_flownodes(data?.run?.flow?.graph?.nodes || []));
    setEdges(edges_to_flowedges(data?.run?.flow?.graph?.edges || []));
  }, [data?.run?.flow?.graph]);

  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  return (
    <RiverTrackContext.Provider
      value={{
        flow: data?.run?.flow,
        runState: state,
        selectedNode,
        setRunState: setState,
      }}
    >
      <PageLayout
        sidebars={[{ key: "flow", label: "Flow", content: <DynamicSidebar /> }]}
      >
        <div className="flex flex-col flex-grow h-full overflow-x-hidden">
          <div className="flex-grow">
            <Graph
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              elementsSelectable={true}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={(e, n) => setSelectedNode(n)}
              onPaneClick={(e) => setSelectedNode(null)}
              fitView
              attributionPosition="top-right"
            />
          </div>
          <div className="flex-initial flex row pl-3 pr-3">
            <div
              className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
              onClick={() => refetch()}
            >
              {<AiOutlineReload />}
            </div>
            <div
              className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
              onClick={() => setPlay(!play)}
            >
              {play ? <RiStopLine size={"1em"} /> : <FiPlay size={"1em"} />}
            </div>
            <div
              className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
              onClick={() => setLive(!live)}
            >
              {live ? "IS live" : "is past"}
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
                          rangeEvents.find((e) => e?.t === state.valueNow)
                            ?.createdAt
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
          </div>
        </div>
      </PageLayout>
    </RiverTrackContext.Provider>
  );
};
