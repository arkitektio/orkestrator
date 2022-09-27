import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "react-flow-renderer";
import "react-toastify/dist/ReactToastify.css";
import { FlowFragment } from "../../fluss/api/graphql";
import { Graph } from "../base/Graph";
import { NodeTypes, RunState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { RiverTrackContext } from "./context";
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
  runState: RunState;
};

export const TrackRiver: React.FC<Props> = ({ flow, runState }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodes_to_flownodes(flow.graph?.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edges_to_flowedges(flow.graph?.edges)
  );

  return (
    <RiverTrackContext.Provider
      value={{
        flow,
        runState,
      }}
    >
      <Graph
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        elementsSelectable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
      />
    </RiverTrackContext.Provider>
  );
};
