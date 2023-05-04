import React from "react";
import "react-contexify/dist/ReactContexify.css";
import "react-toastify/dist/ReactToastify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "reactflow";
import { FlowFragment } from "../../fluss/api/graphql";
import { Graph } from "../base/Graph";
import { NodeTypes, ReserveState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { RiverMonitorContext } from "./context";
import { LabeledMonitorEdge } from "./edges/LabeledMonitorEdge";
import { ArkitektTrackNodeWidget } from "./nodes/ArkitektTrackNodeWidget";
import { GraphNodeMonitorWidget } from "./nodes/GraphNodeMonitorWidget";
import { LocalMonitorNodeWidget } from "./nodes/LocalMonitorNodeWidget";
import { ReactiveNodeMonitorWidget } from "./nodes/ReactiveNodeMonitorWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgTrackNodeWidget";
import { KwargTrackNodeWidget } from "./nodes/generic/KwargTrackNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnTrackNodeWidget";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektTrackNodeWidget,
  ReactiveNode: ReactiveNodeMonitorWidget,
  ArgNode: ArgTrackNodeWidget,
  LocalNode: LocalMonitorNodeWidget,
  ReturnNode: ReturnTrackNodeWidget,
  KwargNode: KwargTrackNodeWidget,
  GraphNode: GraphNodeMonitorWidget,
};

const edgeTypes: EdgeTypes = {
  LabeledEdge: LabeledMonitorEdge,
  FancyEdge: LabeledMonitorEdge,
};

export type Props = {
  flow: FlowFragment;
  reserveState: ReserveState;
};

export const MonitorRiver: React.FC<Props> = ({ flow, reserveState }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodes_to_flownodes(flow.graph?.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edges_to_flowedges(flow.graph?.edges)
  );

  return (
    <RiverMonitorContext.Provider
      value={{
        flow,
        reserveState,
      }}
    >
      <Graph
        nodes={nodes}
        edges={edges}
        elementsSelectable={true}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
      />
    </RiverMonitorContext.Provider>
  );
};
