import { GlobalArgFragment } from "@/fluss/api/graphql";
import { FlowEdge, FlowNode, FlowNodeData, NodeData, StreamPort } from "../types";

export type Compare = {
  sourceStreamIndex: number;
  sourceItemIndex: number;
  targetStreamIndex: number;
  targetItemIndex: number;
};

export type ValidationError = {
  type: "node" | "edge" | "global" | "graph";
  level: "critical" | "warning";
  comparing?: Compare;
  path?: string; // only for node where the error occured
  id: string;
  message: string;
};

export type SolvedError = ValidationError & {
  solvedBy: string;
};

export type ValidationResult = FlowState & {
  valid: boolean;
  solvedErrors: SolvedError[];
  remainingErrors: ValidationError[];
};

export type FlowState = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  globals: GlobalArgFragment[];
};

export type PortType = "source" | "target";

export type Transform =
  | "to_list"
  | "from_list"
  | "ensure"
  | "round_float"
  | "to_float";

export type ChangeEvent = {
  stream: StreamPort[];
  type: PortType;
  index: number;
};

// Source means that this nodes source port has changed
// Target means that this nodes target port has changed
export type CausedChange = ChangeEvent[];

// Source means that a we are changing a source port

export type ChangeOutcome = {
  data?: FlowNodeData;
  changes?: ChangeEvent[];
  needsTransform?: Transform;
  denied?: string;
};

export type ChangeNodeFunction = (
  data: NodeData,
  event: ChangeEvent,
) => ChangeOutcome;
