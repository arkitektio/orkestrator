import { Background, EdgeTypes, ReactFlow, ReactFlowProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React from "react";
import { FlowEdge, FlowNode, NodeTypes } from "../types";

type Props = {
  edgeTypes: EdgeTypes;
  nodeTypes: NodeTypes;
  nodes: FlowNode[];
  edges: FlowEdge[];
  children?: React.ReactNode;
} & ReactFlowProps<FlowNode, FlowEdge>;

const onInit = (reactFlowInstance: any) =>
  console.log("flow loaded:", reactFlowInstance);

export const Graph: React.FC<Props> = ({
  edgeTypes,
  nodeTypes,
  nodes,
  edges,
  children,
  ...props
}) => {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onInit={onInit}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      attributionPosition="top-right"
      {...props}
    >
      <Background />
      {children}
    </ReactFlow>
  );
};
