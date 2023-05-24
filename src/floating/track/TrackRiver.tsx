import React, { useEffect, useState } from "react";
import "react-contexify/dist/ReactContexify.css";
import { AiOutlineReload } from "react-icons/ai";
import { Link } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "reactflow";
import { useDetailRunQuery } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { PageLayout } from "../../layout/PageLayout";
import { Graph } from "../base/Graph";
import { GraphNodeWidget } from "../show/nodes/GraphNodeWidget";
import { FlowNode, NodeTypes, RunState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { DynamicSidebar } from "./DynamicSidebar";
import { LiveTracker } from "./LiveTracker";
import { RangeTracker } from "./RangeTracker";
import { RiverTrackContext } from "./context";
import { FancyTrackEdge } from "./edges/FancyTrackEdge";
import { LabeledTrackEdge } from "./edges/LabeledTrackEdge";
import { ArkitektTrackNodeWidget } from "./nodes/ArkitektTrackNodeWidget";
import { LocalTrackNodeWidget } from "./nodes/LocalTrackNodeWidget";
import { ReactiveTrackNodeWidget } from "./nodes/ReactiveTrackNodeWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgTrackNodeWidget";
import { KwargTrackNodeWidget } from "./nodes/generic/KwargTrackNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnTrackNodeWidget";
import { TimelineSidebar } from "./sidebars/TimelineSidebar";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektTrackNodeWidget,
  ReactiveNode: ReactiveTrackNodeWidget,
  ArgNode: ArgTrackNodeWidget,
  ReturnNode: ReturnTrackNodeWidget,
  KwargNode: KwargTrackNodeWidget,
  LocalNode: LocalTrackNodeWidget,
  GraphNode: GraphNodeWidget,
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

  const [state, setState] = useState<RunState>({ t: 0 });
  const [live, setLive] = useState<boolean>(false);

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
        run: data?.run,
      }}
    >
      <PageLayout
        sidebars={[
          { key: "flow", label: "Flow", content: <DynamicSidebar /> },
          ,
          { key: "timeline", label: "Timeline", content: <TimelineSidebar /> },
        ]}
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
          <div className="flex-initial flex row pl-3 pr-3 h-10">
            <div
              className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
              onClick={() => refetch()}
            >
              {<AiOutlineReload />}
            </div>
            <div
              className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
              onClick={() => setLive(!live)}
            >
              {live ? "Live" : "Range"}
            </div>
            {data?.run?.latestSnapshot && (
              <div className="flex-grow flex flex-row">
                {live ? (
                  <LiveTracker startT={data?.run?.latestSnapshot.t} run={id} />
                ) : (
                  <RangeTracker run={data?.run} />
                )}

                <Link
                  to={`/user/mikro/provenances/${data?.run?.assignation}`}
                  className="flex-initial  my-auto ml-3 dark:text-white cursor-pointer"
                >
                  Prov
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </RiverTrackContext.Provider>
  );
};
