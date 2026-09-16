// Shared test fixtures for the reaktion validation / store suites.
// Node data is a minimal structural subset cast to the (large) generated types.
import { GraphNodeKind, PortKind } from "@/reaktion/api/graphql";
import type { FlowEdge, FlowNode, StreamPort } from "../types";

export const intPort = (key: string, over: Record<string, unknown> = {}): StreamPort =>
  ({
    __typename: "ArgPort",
    key,
    kind: PortKind.Int,
    identifier: null,
    nullable: false,
    label: key,
    ...over,
  }) as unknown as StreamPort;

export const stringPort = (key: string): StreamPort =>
  intPort(key, { kind: PortKind.String });

type NodeOpts = {
  type?: FlowNode["type"];
  kind?: GraphNodeKind;
  ins?: StreamPort[][];
  outs?: StreamPort[][];
  constants?: StreamPort[];
  constantsMap?: Record<string, unknown>;
  globalsMap?: Record<string, unknown>;
  parentId?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
};

export const makeNode = (id: string, opts: NodeOpts = {}): FlowNode =>
  ({
    id,
    type: opts.type ?? "ReactiveNode",
    position: opts.position ?? { x: 0, y: 0 },
    parentId: opts.parentId,
    extent: opts.parentId ? "parent" : undefined,
    data: {
      kind: opts.kind ?? GraphNodeKind.Reactive,
      title: id,
      description: "",
      ins: opts.ins ?? [[intPort("x")]],
      outs: opts.outs ?? [[intPort("x")]],
      constants: opts.constants ?? [],
      voids: [],
      constantsMap: opts.constantsMap ?? {},
      globalsMap: opts.globalsMap ?? {},
      ...opts.data,
    },
  }) as unknown as FlowNode;

export const argsNode = (id = "args", outs: StreamPort[][] = [[intPort("x")]]) =>
  makeNode(id, { type: "ArgNode", kind: GraphNodeKind.Args, ins: [], outs });

export const returnsNode = (id = "returns", ins: StreamPort[][] = [[intPort("x")]]) =>
  makeNode(id, { type: "ReturnNode", kind: GraphNodeKind.Returns, ins, outs: [] });

export const subflowNode = (id: string, appFilter = "app") =>
  makeNode(id, {
    type: "AgentSubFlowNode",
    kind: GraphNodeKind.AgentSubflow,
    ins: [],
    outs: [],
    data: { appFilter },
  });

export const makeEdge = (
  id: string,
  source: string,
  target: string,
  sourceStream = 0,
  targetStream = 0,
): FlowEdge =>
  ({
    id,
    type: "VanillaEdge",
    source,
    sourceHandle: `return_${sourceStream}`,
    target,
    targetHandle: `arg_${targetStream}`,
    data: { kind: "VANILLA", stream: [] },
  }) as unknown as FlowEdge;

/** args -> mid -> returns, all int streams. */
export const linearGraph = () => {
  const nodes = [argsNode(), makeNode("mid"), returnsNode()];
  const edges = [makeEdge("e1", "args", "mid"), makeEdge("e2", "mid", "returns")];
  return { nodes, edges, globals: [] };
};
