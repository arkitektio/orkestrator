import {
  Connection,
  Edge,
  EdgeProps,
  Node,
  NodeProps,
} from "react-flow-renderer";
import {
  DetailNodeFragment,
  ListReservationFragment,
} from "../rekuest/api/graphql";
import {
  ArgNodeFragment,
  ArgPort,
  ArgPortFragment,
  ArkitektNodeFragment,
  FancyEdgeFragment,
  FlowEdgeCommonsFragment,
  FlowFragment,
  FlowNodeCommonsFragment,
  KwargNodeFragment,
  LabeledEdgeFragment,
  ReactiveNodeFragment,
  ReturnNodeFragment,
  ReturnPortFragment,
  RunEventFragment,
  StreamItem,
} from "../fluss/api/graphql";

export type LoadingEnhanced<T, L = {}> = T & { extras?: L };

export type ArgNodeData = LoadingEnhanced<ArgNodeFragment>;
export type ReturnNodeData = LoadingEnhanced<ReturnNodeFragment>;
export type KwargNodeData = LoadingEnhanced<KwargNodeFragment>;

export type ArkitektNodeData = LoadingEnhanced<
  ArkitektNodeFragment,
  DetailNodeFragment
>;

export type ReactiveNodeData = LoadingEnhanced<ReactiveNodeFragment>;

export type ArgNodeProps = NodeProps<ArgNodeData>;
export type ReturnNodeProps = NodeProps<ReturnNodeData>;
export type KwargNodeProps = NodeProps<KwargNodeData>;
export type IONodeProps = ArgNodeProps | ReturnNodeProps | KwargNodeProps;

export type ArkitektNodeProps = NodeProps<ArkitektNodeData>;

export type ReactiveNodeProps = NodeProps<ReactiveNodeData>;

export type Elements = Element[];

export type FlowGraph = FlowFragment["graph"];
export type FlowEdges = FlowGraph["edges"];

export type FlowNode<T = {}> = Node<T & FlowNodeCommonsFragment>;
export type FlowEdge<T = {}> = Edge<T & FlowEdgeCommonsFragment>;

export type FancyEdgeProps = EdgeProps<FancyEdgeFragment>;
export type LabeledEdgeProps = EdgeProps<LabeledEdgeFragment>;

export type Event = "next" | "error" | "complete";

export type ReserveState = {
  reservations?: (ListReservationFragment | null)[];
};

export type RunState = {
  events?: (RunEventFragment | null)[];
  t: number;
};

export type ConnectionUpdate = {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  errors?: ConnectionError[];
  args?: (ArgPortFragment | null)[];
  returns?: (ReturnPortFragment | null)[];
};

export type ConnectionError = {
  message: string;
};

export type CommonNode = FlowNodeCommonsFragment;

export type Connector<
  X extends FlowNodeCommonsFragment = FlowNodeCommonsFragment,
  Y extends FlowNodeCommonsFragment = FlowNodeCommonsFragment
> = (options: {
  params: Connection;
  sourceNode: FlowNode<X>;
  targetNode: FlowNode<Y>;
  sourceStream: StreamItem[];
  targetStream: StreamItem[];
  sourceTypes: string[];
  targetTypes: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  args: (ArgPortFragment | null)[];
  returns: (ReturnPortFragment | null)[];
}) => ConnectionUpdate;

export enum RiverMode {
  EDIT = "EDIT",
  VIEW = "VIEW",
  ASSIGNATION = "ASSIGNATION",
  PROVISION = "PROVISION",
}

export type NodeTypeUnion = Exclude<
  FlowNodeCommonsFragment["__typename"],
  null | undefined
>;

export type dddd = Exclude<FlowNodeCommonsFragment, null | undefined>;

export type EdgeTypeUnion = Exclude<
  FlowEdgeCommonsFragment["__typename"],
  null | undefined
>;

export type ConnectionMap = {
  [k in NodeTypeUnion]: {
    [t in NodeTypeUnion]: Connector;
  };
};

export type NodeTypes = {
  [l in NodeTypeUnion]: React.FC<NodeProps>;
};
export type EdgeTypes = { [l in EdgeTypeUnion]: React.FC<EdgeProps> };
