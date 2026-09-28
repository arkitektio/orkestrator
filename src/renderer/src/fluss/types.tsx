import {
  ArgNodeFragment,
  BaseGraphEdgeFragment,
  BaseGraphNodeFragment,
  StreamItemFragment as FlussStreamItemFragment,
  GlobalArg,
  GlobalArgFragment,
  GlobalArgInput,
  GraphEdgeFragment,
  GraphEdgeInput,
  GraphFragment,
  GraphNodeFragment,
  GraphNodeInput,
  PortKind as FlussPortKind,
  LoggingEdgeFragment,
  ReactiveNodeFragment,
  RekuestFilterActionNodeFragment,
  RekuestMapActionNodeFragment,
  ReturnNodeFragment,
  VanillaEdgeFragment,
  AgentSubFlowNodeFragment,
  FlussArgPortFragment,
  FlussReturnPortFragment,
  FlussArgChildPortFragment,
  FlussReturnChildPortFragment,
} from "@/fluss/api/graphql";
import {
  Connection,
  Edge,
  EdgeProps,
  Node,
  NodeProps,
  XYPosition,
} from "@xyflow/react";

export type DataEnhancer<T, L = {}> = T & { extras?: L };

export type ArgNodeData = DataEnhancer<ArgNodeFragment>;
export type ReturnNodeData = DataEnhancer<ReturnNodeFragment>;
export type RekuestMapNodeData = DataEnhancer<RekuestMapActionNodeFragment>;
export type RekuestFilterNodeData = DataEnhancer<RekuestFilterActionNodeFragment>;
export type ReactiveNodeData = DataEnhancer<ReactiveNodeFragment>;
export type AgentSubFlowNodeData = DataEnhancer<AgentSubFlowNodeFragment>;


export type GeneralPort = FlussArgPortFragment | FlussReturnPortFragment | FlussArgChildPortFragment | FlussReturnChildPortFragment
// A top-level port in a node stream (ins/outs) — always an arg or return port,
// never a child port, so it always carries label/description/effects.
export type StreamPort = FlussArgPortFragment | FlussReturnPortFragment;
export type ArgPort = FlussArgPortFragment;
export type ReturnPort = FlussReturnPortFragment;
export const PortKind = FlussPortKind









export type NodeData =
  | ArgNodeData
  | ReturnNodeData
  | RekuestMapNodeData
  | RekuestFilterNodeData
  | ReactiveNodeData
  | AgentSubFlowNodeData;

export type Elements = Element[];

export type FlowGraph = GraphFragment;
export type FlowEdges = FlowGraph["edges"];

export type NodeTypeUnion = Exclude<
  BaseGraphNodeFragment["__typename"],
  null | undefined
>;

export type EdgeTypeUnion = Exclude<
  BaseGraphEdgeFragment["__typename"],
  null | undefined
>;

export type EnhancedEdge<T = {}> = Edge<T & BaseGraphEdgeFragment> & {
  type: EdgeTypeUnion;
};

export type FlowNodeInherent = "id" | "position" | "__typename";
export type FlowEdgeInherent =
  | "id"
  | "source"
  | "target"
  | "__typename"
  | "sourceHandle"
  | "targetHandle";

export type FlowNodeData<T = GraphNodeFragment> = Omit<
  T & BaseGraphNodeFragment,
  FlowNodeInherent
>;

export type FlowEdgeData<T = GraphEdgeFragment> = Omit<
  T & BaseGraphEdgeFragment,
  FlowEdgeInherent
>;
export type FlowNode<T extends BaseGraphNodeFragment = BaseGraphNodeFragment> =
  Node<FlowNodeData<T>, NodeTypeUnion>;
export type FlowEdge<T = GraphEdgeFragment> = Edge<FlowEdgeData<T>>;

type TypedNodeProps<T extends BaseGraphNodeFragment> = NodeProps<FlowNode<T>>;

export type ArgNodeProps = TypedNodeProps<ArgNodeFragment>;
export type ReturnNodeProps = TypedNodeProps<ReturnNodeFragment>;
export type IONodeProps = ArgNodeProps | ReturnNodeProps;

export type RekuestMapNodeProps = TypedNodeProps<RekuestMapActionNodeFragment>;
export type RekuestFilterNodeProps = TypedNodeProps<RekuestFilterActionNodeFragment>;
export type ReactiveNodeProps = TypedNodeProps<ReactiveNodeFragment>;
export type AgentSubFlownNodeProps = TypedNodeProps<AgentSubFlowNodeFragment>;

export type VanillaEdgeProps = EdgeProps<VanillaEdgeFragment>;
export type LoggingEdgeProps = EdgeProps<LoggingEdgeFragment>;

export type ConnectionError = {
  message: string;
};

export type NewState = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  globals: GlobalArg[];
};

export type ConnectionUpdate = {
  state: NewState;
  errors?: ConnectionError[];
};

export type Connector<
  X extends BaseGraphNodeFragment = BaseGraphNodeFragment,
  Y extends BaseGraphNodeFragment = BaseGraphNodeFragment,
> = (options: {
  params: Connection;
  sourceNode: FlowNode<X>;
  targetNode: FlowNode<Y>;
  sourcePort: GeneralPort[];
  targetPort: GeneralPort[];
  sourceTypes: string[];
  targetTypes: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  args: (GeneralPort | null)[];
  returns: (GeneralPort | null)[];
}) => ConnectionUpdate;

export enum RiverMode {
  EDIT = "EDIT",
  VIEW = "VIEW",
  TASK = "TASK",
  PROVISION = "PROVISION",
}

export type ConnectionMap = {
  [k in NodeTypeUnion]: {
    [t in NodeTypeUnion]: Connector;
  };
};

export type NodeTypes = {
  [l in NodeTypeUnion]: React.FC<NodeProps>;
};
export type EdgeTypes = { [l in EdgeTypeUnion]: React.FC<EdgeProps> };

export type NodeInput = GraphNodeInput;
export type EdgeInput = GraphEdgeInput;
export type GlobalInput = GlobalArgInput;

export type ActionFragment = GraphNodeFragment;
export type EdgeFragement = GraphEdgeFragment;
export type GlobalFragment = GlobalArgFragment;
export type StreamItemFragment = FlussStreamItemFragment;

export type RelativePosition =
  | "bottomright"
  | "bottomleft"
  | "topright"
  | "topleft";

/**
 * Contextual panels are keyed by *ids* into the store. They never carry node
 * or edge objects: those would be frozen copies that go stale the moment the
 * graph changes. Components resolve the live node with `useEditNode(id)`.
 *
 * `position` is the panel's placement relative to the flow wrapper (CSS px);
 * `flowPosition` is where a new node should be placed, in flow coordinates.
 */
export type DropContextualParams = {
  handleType: "source" | "target";
  causingNodeId: string;
  causingStream: number;
  relativePosition: RelativePosition;
  position: { x: number; y: number };
  flowPosition: XYPosition;
};

export type SubflowDropContextualParams = DropContextualParams & {
  subflowNodeId: string;
};

export type ClickContextualParams = {
  position: { x: number; y: number };
  flowPosition: XYPosition;
};

export type EdgeContextualParams = {
  edgeId: string;
  position: { x: number; y: number };
  leftNodeId: string;
  leftStream: number;
  rightNodeId: string;
  rightStream: number;
};

export type ConnectContextualParams = {
  connection: Connection;
  leftNodeId: string;
  leftStream: number;
  rightNodeId: string;
  rightStream: number;
  position: { x: number; y: number };
};

export type NodeContextualParams = {
  nodeId: string;
  position: { x: number; y: number };
};

export type ReactiveNodeSuggestions = {
  node: FlowNode<ReactiveNodeFragment>;
  title: string;
  description: string;
};

export type ContextualParams =
  | ({ kind: "drop"; id: string } & DropContextualParams)
  | ({ kind: "subflowdrop"; id: string } & SubflowDropContextualParams)
  | ({ kind: "click"; id: string } & ClickContextualParams)
  | ({ kind: "edge"; id: string } & EdgeContextualParams)
  | ({ kind: "connect"; id: string } & ConnectContextualParams)
  | ({ kind: "node"; id: string } & NodeContextualParams);



export type AnyNode = Node<ArgNodeData, "ArgNode"> | Node<ReturnNodeData, "ReturnNode"> | Node<RekuestMapNodeData, "RekuestMapNode"> | Node<RekuestFilterNodeData, "RekuestFilterNode"> | Node<ReactiveNodeData, "ReactiveNode"> | Node<AgentSubFlowNodeData, "AgentSubFlowNode">;
