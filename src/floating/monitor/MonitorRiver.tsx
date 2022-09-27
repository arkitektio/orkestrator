import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "react-flow-renderer";
import "react-toastify/dist/ReactToastify.css";
import { FlowFragment } from "../../fluss/api/graphql";
import { Graph } from "../base/Graph";
import { NodeTypes, ReserveState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { RiverMonitorContext } from "./context";
import { FancyTrackEdge } from "./edges/FancyTrackEdge";
import { LabeledTrackEdge } from "./edges/LabeledTrackEdge";
import { ArkitektTrackNodeWidget } from "./nodes/ArkitektTrackNodeWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgTrackNodeWidget";
import { KwargTrackNodeWidget } from "./nodes/generic/KwargTrackNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnTrackNodeWidget";
import { ReactiveTrackNodeWidget } from "./nodes/ReactiveTrackNodeWidget";

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
