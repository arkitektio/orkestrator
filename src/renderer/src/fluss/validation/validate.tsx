import { GraphNodeKind } from "@/fluss/api/graphql";
import { handleToStream } from "@/fluss/utils";
import { PortKind } from "@/rekuest/api/graphql";
import { buildZodSchema, portHash } from "@/core/lib/ports/utils";
import { ZodError, ZodTypeAny } from "zod";
import { FlowEdge, FlowNode } from "../types";
import {
  FlowState,
  SolvedError,
  ValidationError,
  ValidationResult,
} from "./types";

/**
 * Validation is a pure function of a `FlowState`.
 *
 * Invariants (tested in validate.test.ts):
 * - the input state, its arrays and its objects are never mutated;
 * - `remainingErrors` / `solvedErrors` are fresh arrays on every call and only
 *   describe THIS run (nothing accumulates across calls);
 * - `nodes` keeps its identity; `edges` keeps its identity and order unless an
 *   edge was actually removed.
 *
 * Every validator receives a `GraphIndex` built once per run so lookups are
 * O(1) instead of `.find` over the node/edge arrays.
 */

export type GraphIndex = {
  nodeById: Map<string, FlowNode>;
  edgesBySource: Map<string, FlowEdge[]>;
  edgesByTarget: Map<string, FlowEdge[]>;
  childrenByParent: Map<string, FlowNode[]>;
};

const EMPTY_EDGES: readonly FlowEdge[] = Object.freeze([]);

export const buildGraphIndex = (
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): GraphIndex => {
  const nodeById = new Map<string, FlowNode>();
  const childrenByParent = new Map<string, FlowNode[]>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId);
      if (siblings) siblings.push(node);
      else childrenByParent.set(node.parentId, [node]);
    }
  }

  const edgesBySource = new Map<string, FlowEdge[]>();
  const edgesByTarget = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    const outgoing = edgesBySource.get(edge.source);
    if (outgoing) outgoing.push(edge);
    else edgesBySource.set(edge.source, [edge]);
    const incoming = edgesByTarget.get(edge.target);
    if (incoming) incoming.push(edge);
    else edgesByTarget.set(edge.target, [edge]);
  }

  return { nodeById, edgesBySource, edgesByTarget, childrenByParent };
};

const outgoing = (index: GraphIndex, id: string): readonly FlowEdge[] =>
  index.edgesBySource.get(id) ?? EMPTY_EDGES;
const incoming = (index: GraphIndex, id: string): readonly FlowEdge[] =>
  index.edgesByTarget.get(id) ?? EMPTY_EDGES;

type ValidatorOutput = {
  /** Only set when at least one edge was removed. Order is preserved. */
  edges?: FlowEdge[];
  remaining?: ValidationError[];
  solved?: SolvedError[];
};

type Validator = (state: FlowState, index: GraphIndex) => ValidatorOutput;

const graphError = (message: string): ValidationError => ({
  type: "graph",
  id: "",
  level: "critical",
  message,
});

/** Edges whose endpoint no longer exists (node removed) are dropped. */
const pruneDanglingEdges: Validator = (state, index) => {
  const solved: SolvedError[] = [];
  const kept: FlowEdge[] = [];
  for (const edge of state.edges) {
    if (index.nodeById.has(edge.source) && index.nodeById.has(edge.target)) {
      kept.push(edge);
      continue;
    }
    solved.push({
      type: "edge",
      id: edge.id,
      level: "warning",
      message: "Edge points to a node that no longer exists",
      solvedBy: "Removing the edge",
    });
  }
  return solved.length > 0 ? { edges: kept, solved } : {};
};

const validateMatchingPorts: Validator = (state, index) => {
  const solved: SolvedError[] = [];
  const kept: FlowEdge[] = [];

  for (const edge of state.edges) {
    const sourceNode = index.nodeById.get(edge.source);
    const targetNode = index.nodeById.get(edge.target);

    const sourceStreamIndex = handleToStream(edge.sourceHandle);
    const targetStreamIndex = handleToStream(edge.targetHandle);

    const sourceStream = sourceNode?.data.outs?.at(sourceStreamIndex);
    const targetStream = targetNode?.data.ins?.at(targetStreamIndex);

    if (sourceStream == undefined || targetStream == undefined) {
      solved.push({
        type: "edge",
        id: edge.id,
        level: "critical",
        message: "Edge with non existing handles. This is bad",
        solvedBy: "Removing the edge",
      });
      continue;
    }

    if (sourceStream.length != targetStream.length) {
      solved.push({
        type: "edge",
        id: edge.id,
        level: "warning",
        message: "Connecting edge does not have correct number of ports",
        solvedBy: "Removing the edge",
      });
      continue;
    }

    let streamsMatch = true;
    for (let i = 0; i < sourceStream.length; i++) {
      const comparing = {
        sourceItemIndex: i,
        sourceStreamIndex,
        targetItemIndex: i,
        targetStreamIndex,
      };
      if (sourceStream[i].kind != targetStream[i].kind) {
        solved.push({
          type: "edge",
          id: edge.id,
          comparing,
          level: "warning",
          message: "Port Kind mismatch",
          solvedBy: "Removing the edge",
        });
        streamsMatch = false;
      }
      if (sourceStream[i].identifier != targetStream[i].identifier) {
        solved.push({
          type: "edge",
          id: edge.id,
          comparing,
          level: "warning",
          message: "Port Identifier mismatch",
          solvedBy: "Removing the edge",
        });
        streamsMatch = false;
      }
    }

    if (streamsMatch) kept.push(edge);
  }

  return solved.length > 0 ? { edges: kept, solved } : {};
};

const validateNoUnconnectedNodes: Validator = (state, index) => {
  const remaining: ValidationError[] = [];
  for (const node of state.nodes) {
    if (node.type === "AgentSubFlowNode") continue;
    if (incoming(index, node.id).length > 0) continue;
    if (outgoing(index, node.id).length > 0) continue;
    remaining.push({
      type: "node",
      id: node.id,
      level: "critical",
      message: "Node with no ins and outs. This is bad",
    });
  }
  return remaining.length > 0 ? { remaining } : {};
};

/**
 * Undirected connectivity over the non-subflow nodes. Edges that touch a
 * subflow wrapper are ignored (wrappers have no ports). Iterative so a large
 * graph cannot overflow the stack.
 */
const validateGraphIsConnected: Validator = (state) => {
  const members = new Set<string>();
  for (const node of state.nodes) {
    if (node.type !== "AgentSubFlowNode") members.add(node.id);
  }
  if (members.size === 0) return {};

  const adjacency = new Map<string, string[]>();
  for (const id of members) adjacency.set(id, []);
  for (const edge of state.edges) {
    if (!members.has(edge.source) || !members.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<string>();
  const stack: string[] = [members.values().next().value as string];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!visited.has(neighbour)) stack.push(neighbour);
    }
  }

  if (visited.size !== members.size) {
    return {
      remaining: [
        graphError(
          "Subgraphs exist. Please create at least one connection between all nodes",
        ),
      ],
    };
  }
  return {};
};

const atLeastOneNode: Validator = (state) => {
  const remaining: ValidationError[] = [];
  let hasArgs = false;
  let hasReturns = false;
  let hasOther = false;
  for (const node of state.nodes) {
    const kind = node.data.kind;
    if (kind == GraphNodeKind.Args) hasArgs = true;
    else if (kind == GraphNodeKind.Returns) hasReturns = true;
    else hasOther = true;
  }
  if (!hasArgs) remaining.push(graphError("You need an Args node"));
  if (!hasReturns) remaining.push(graphError("You need an Return node"));
  if (!hasOther) remaining.push(graphError("Very funny. You need at least one node"));
  return remaining.length > 0 ? { remaining } : {};
};

/** Only the first edge (in edge order) into the Returns node is kept. */
const noDoubleEdgeForOutput: Validator = (state, index) => {
  const returnNode = state.nodes.find((n) => n.data.kind == GraphNodeKind.Returns);
  if (!returnNode) return {};
  if (incoming(index, returnNode.id).length <= 1) return {};

  let seen = false;
  const kept: FlowEdge[] = [];
  for (const edge of state.edges) {
    if (edge.target !== returnNode.id) {
      kept.push(edge);
      continue;
    }
    if (!seen) {
      seen = true;
      kept.push(edge);
    }
  }

  return {
    edges: kept,
    solved: [
      {
        type: "graph",
        id: "",
        level: "critical",
        message:
          "You can only have one edge to the return node: Maybe merge them before sending them to the return node? We will remove the other edges",
        solvedBy: "Removing the other edges",
      },
    ],
  };
};

const hasMemoryStructure = (node: FlowNode): boolean =>
  !!(
    node.data.ins?.some((stream) =>
      stream?.some((item) => item.kind === PortKind.MemoryStructure),
    ) ||
    node.data.outs?.some((stream) =>
      stream?.some((item) => item.kind === PortKind.MemoryStructure),
    ) ||
    node.data.voids?.some((item) => item.kind === PortKind.MemoryStructure) ||
    node.data.constants?.some((item) => item.kind === PortKind.MemoryStructure)
  );

const validateMemoryStructuresSameSubflow: Validator = (state, index) => {
  const remaining: ValidationError[] = [];
  const memoryCache = new Map<string, boolean>();
  const hasMemory = (node: FlowNode) => {
    let cached = memoryCache.get(node.id);
    if (cached === undefined) {
      cached = hasMemoryStructure(node);
      memoryCache.set(node.id, cached);
    }
    return cached;
  };

  for (const edge of state.edges) {
    const sourceNode = index.nodeById.get(edge.source);
    const targetNode = index.nodeById.get(edge.target);
    if (!sourceNode?.parentId || !targetNode?.parentId) continue;
    if (sourceNode.parentId === targetNode.parentId) continue;
    if (hasMemory(sourceNode) && hasMemory(targetNode)) {
      remaining.push({
        type: "edge",
        id: edge.id,
        level: "critical",
        message: "Nodes with memory structures must be in the same subflow.",
      });
    }
  }
  return remaining.length > 0 ? { remaining } : {};
};

/** One subflow wrapper per app (`appFilter`) per workflow. */
const validateUniqueAgentSubflows: Validator = (state) => {
  const byApp = new Map<string, string[]>();
  for (const node of state.nodes) {
    if (node.type !== "AgentSubFlowNode") continue;
    const app = (node.data as { appFilter?: string | null }).appFilter;
    if (!app) continue;
    const ids = byApp.get(app);
    if (ids) ids.push(node.id);
    else byApp.set(app, [node.id]);
  }

  const remaining: ValidationError[] = [];
  for (const ids of byApp.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      remaining.push({
        type: "node",
        id,
        level: "critical",
        message: "You can only have one subflow per agent in the same workflow.",
      });
    }
  }
  return remaining.length > 0 ? { remaining } : {};
};

// Order matters: edge-dropping validators run first so the structural checks
// see the pruned edge set.
const validators: Validator[] = [
  pruneDanglingEdges,
  validateMatchingPorts,
  noDoubleEdgeForOutput,
  validateUniqueAgentSubflows,
  validateMemoryStructuresSameSubflow,
  validateNoUnconnectedNodes,
  validateGraphIsConnected,
  atLeastOneNode,
];

// A zod schema only depends on the port shapes, not on their values, so it is
// cached by port hash across runs and across nodes with the same signature.
const schemaCache = new Map<string, ZodTypeAny>();
const MAX_CACHED_SCHEMAS = 512;

const schemaFor = (constants: FlowNode["data"]["constants"]): ZodTypeAny => {
  const key = portHash(constants);
  const cached = schemaCache.get(key);
  if (cached) return cached;
  const schema = buildZodSchema(constants);
  if (schemaCache.size >= MAX_CACHED_SCHEMAS) schemaCache.clear();
  schemaCache.set(key, schema);
  return schema;
};

export const nonGlobalConstants = (
  node: FlowNode,
): FlowNode["data"]["constants"] => {
  const constants = node.data.constants ?? [];
  const globalsMap = node.data.globalsMap ?? {};
  return constants.filter((port) => globalsMap[port.key] == null);
};

/** Errors for one node's constants against its `constantsMap`. */
export const validateNodeConstants = (node: FlowNode): ValidationError[] => {
  const constants = nonGlobalConstants(node);
  if (constants.length === 0) return [];
  try {
    // The schema build is inside the try: an unsupported port kind must
    // surface as a node error, not abort the whole graph validation.
    schemaFor(constants).parse(node.data.constantsMap ?? {});
    return [];
  } catch (e) {
    if (e instanceof ZodError) {
      return e.issues.map((issue) => ({
        type: "node" as const,
        id: node.id,
        path: issue.path.join("."),
        level: "critical" as const,
        message: issue.message,
      }));
    }
    return [
      {
        type: "node",
        id: node.id,
        level: "critical",
        message: e instanceof Error ? e.message : "Invalid constants",
      },
    ];
  }
};

export type ValidationOptions = {
  validateNodeDefaults?: boolean;
  /**
   * Solved errors produced by a step that ran before validation (e.g.
   * `integrate` inserting transform nodes). They are reported alongside this
   * run's own solved errors; the input state's `solvedErrors` are ignored.
   */
  carrySolved?: readonly SolvedError[];
};

export const validateState = (
  input: FlowState,
  options: ValidationOptions = {},
): ValidationResult => {
  const { validateNodeDefaults = true, carrySolved } = options;
  const nodes = input.nodes;
  let edges = input.edges;
  let index = buildGraphIndex(nodes, edges);

  const remainingErrors: ValidationError[] = [];
  const solvedErrors: SolvedError[] = carrySolved ? [...carrySolved] : [];

  for (const validator of validators) {
    const out = validator({ nodes, edges, globals: input.globals }, index);
    if (out.remaining) remainingErrors.push(...out.remaining);
    if (out.solved) solvedErrors.push(...out.solved);
    if (out.edges && out.edges.length !== edges.length) {
      edges = out.edges;
      index = buildGraphIndex(nodes, edges);
    }
  }

  if (validateNodeDefaults) {
    for (const node of nodes) {
      remainingErrors.push(...validateNodeConstants(node));
    }
  }

  return {
    nodes,
    edges,
    globals: input.globals,
    remainingErrors,
    solvedErrors,
    valid: remainingErrors.length === 0,
  };
};
