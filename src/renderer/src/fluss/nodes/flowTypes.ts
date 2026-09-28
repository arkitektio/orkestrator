import { EdgeTypes, NodeTypes } from "@/fluss/types";
import { EdgeProps, NodeProps } from "@xyflow/react";
import React from "react";
import { AgentSubflowWidget } from "./AgentSubflowWidget";
import { ArgWidget } from "./ArgWidget";
import { LabeledEdge } from "./LabeledEdge";
import { ReactiveWidget } from "./ReactiveWidget";
import { RekuestFilterWidget } from "./RekuestFilterWidget";
import { RekuestMapWidget } from "./RekuestMapWidget";
import { ReturnWidget } from "./ReturnWidget";

/** The single node/edge type registry shared by the editor, viewer and tracker. */
export const flowNodeTypes: NodeTypes = {
  RekuestFilterActionNode: RekuestFilterWidget as unknown as React.FC<NodeProps>,
  RekuestMapActionNode: RekuestMapWidget as unknown as React.FC<NodeProps>,
  ReactiveNode: ReactiveWidget as unknown as React.FC<NodeProps>,
  ArgNode: ArgWidget as unknown as React.FC<NodeProps>,
  ReturnNode: ReturnWidget as unknown as React.FC<NodeProps>,
  AgentSubFlowNode: AgentSubflowWidget as unknown as React.FC<NodeProps>,
};

export const flowEdgeTypes: EdgeTypes = {
  VanillaEdge: LabeledEdge as unknown as React.FC<EdgeProps>,
  LoggingEdge: LabeledEdge as unknown as React.FC<EdgeProps>,
};
