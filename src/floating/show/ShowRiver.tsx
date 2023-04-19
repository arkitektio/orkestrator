import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { EdgeTypes, useEdgesState, useNodesState } from "reactflow";
import "react-toastify/dist/ReactToastify.css";
import { FlowFragment } from "../../fluss/api/graphql";
import { Graph } from "../base/Graph";
import { NodeTypes, ReserveState } from "../types";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { ShowRiverContext } from "./context";
import { LabeledShowEdge } from "./edges/LabeledShowEdge";
import { ArkitektTrackNodeWidget } from "./nodes/ArkitektTrackNodeWidget";
import { ArgTrackNodeWidget } from "./nodes/generic/ArgTrackNodeWidget";
import { KwargTrackNodeWidget } from "./nodes/generic/KwargTrackNodeWidget";
import { ReturnTrackNodeWidget } from "./nodes/generic/ReturnTrackNodeWidget";
import { ReactiveTrackNodeWidget } from "./nodes/ReactiveTrackNodeWidget";
import { LocalShowNodeWIdget } from "./nodes/LocalShowNodeWidget";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektTrackNodeWidget,
  ReactiveNode: ReactiveTrackNodeWidget,
  LocalNode: LocalShowNodeWIdget,
  ArgNode: ArgTrackNodeWidget,
  ReturnNode: ReturnTrackNodeWidget,
  KwargNode: KwargTrackNodeWidget,
};

const edgeTypes: EdgeTypes = {
  LabeledEdge: LabeledShowEdge,
  FancyEdge: LabeledShowEdge,
};

export type Props = {
  flow: FlowFragment;
};

export const ShowRiver: React.FC<Props> = ({ flow }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodes_to_flownodes(flow.graph?.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edges_to_flowedges(flow.graph?.edges)
  );

  return (
    <ShowRiverContext.Provider
      value={{
        flow,
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
        attributionPosition="bottom-right"
      />
    </ShowRiverContext.Provider>
  );
};
