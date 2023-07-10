import React, { useEffect, useState } from "react";
import "react-contexify/dist/ReactContexify.css";
import { AiOutlineReload } from "react-icons/ai";
import "react-toastify/dist/ReactToastify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "reactflow";
import { useDetailConditionQuery } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { PageLayout } from "../../layout/PageLayout";
import { Graph } from "../base/Graph";
import { GraphNodeWidget } from "../show/nodes/GraphNodeWidget";
import { ConditionState, FlowNode, NodeTypes } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { DynamicSidebar } from "./DynamicSidebar";
import { LiveTracer } from "./LiveTracer";
import { RiverTraceContext } from "./context";
import { LabeledTraceEdge } from "./edges/LabeledTraceEdge";
import { ArkitektFilterTraceNodeWidget } from "./nodes/ArkitektFilterTraceNodeWidget";
import { ArkitektTraceNodeWidget } from "./nodes/ArkitektTraceNodeWidget";
import { LocalTraceNodeWidget } from "./nodes/LocalTraceNodeWidget";
import { ReactiveTraceNodeWidget } from "./nodes/ReactiveTraceNodeWidget";
import { ArgTraceNodeWidget } from "./nodes/generic/ArgTraceNodeWidget";
import { KwargTraceNodeWidget } from "./nodes/generic/KwargTraceNodeWidget";
import { ReturnTraceNodeWidget } from "./nodes/generic/ReturnTraceNodeWidget";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektTraceNodeWidget,
  ArkitektFilterNode: ArkitektFilterTraceNodeWidget,
  ReactiveNode: ReactiveTraceNodeWidget,
  ArgNode: ArgTraceNodeWidget,
  ReturnNode: ReturnTraceNodeWidget,
  KwargNode: KwargTraceNodeWidget,
  LocalNode: LocalTraceNodeWidget,
  GraphNode: GraphNodeWidget,
};

const edgeTypes: EdgeTypes = {
  LabeledEdge: LabeledTraceEdge,
  FancyEdge: LabeledTraceEdge,
};

export type Props = {
  id: string;
};

export const TraceRiver: React.FC<Props> = ({ id }) => {
  const { data, refetch } = withFluss(useDetailConditionQuery)({
    variables: { id: id },
  });

  const [state, setState] = useState<ConditionState>({ timepoint: new Date() });
  const [live, setLive] = useState<boolean>(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(nodes_to_flownodes(data?.condition?.flow?.graph?.nodes || []));
    setEdges(edges_to_flowedges(data?.condition?.flow?.graph?.edges || []));
  }, [data?.condition?.flow?.graph]);

  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  return (
    <RiverTraceContext.Provider
      value={{
        flow: data?.condition?.flow,
        conditionState: state,
        selectedNode,
        setConditionState: setState,
        condition: data?.condition,
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
            {data?.condition?.latestSnapshot && (
              <div className="flex-grow flex flex-row">
                <LiveTracer
                  startT={data?.condition?.latestSnapshot.createdAt}
                  condition={id}
                />
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </RiverTraceContext.Provider>
  );
};
