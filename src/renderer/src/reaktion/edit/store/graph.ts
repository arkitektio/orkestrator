/**
 * Pure graph reducers for the workflow editor.
 *
 * Every function takes a `FlowState` and returns a new one (or the same
 * reference when nothing changed). No validation, no zustand, no React Flow
 * instance: the store's `commit` runs validation once after a reducer.
 *
 * Conventions:
 * - constants are addressed by port `key`, never by index (indices go stale
 *   between the widget render and the action);
 * - `constantsMap` / `globalsMap` entries are deleted, never set to
 *   `undefined` (an `undefined` value vanishes on serialisation and made the
 *   client and server disagree on whether the key exists).
 */
import {
  FlussArgPortFragment,
  FlussReturnPortFragment,
  GlobalArgFragment,
  GraphNodeKind,
  ReactiveImplementation,
} from "@/reaktion/api/graphql";
import { AgentSubFlowNodeData, FlowEdge, FlowNode, StreamPort } from "@/reaktion/types";
import { handleToStream, nodeIdBuilder, reactiveFlowNode } from "@/reaktion/utils";
import { createVanillaTransformEdge, streamToItems } from "@/reaktion/validation/integrate";
import { FlowState } from "@/reaktion/validation/types";
import type { Connection, XYPosition } from "@xyflow/react";

type ValueMap = Record<string, unknown>;

const without = (map: ValueMap | null | undefined, key: string): ValueMap => {
  if (!map || !(key in map)) return map ?? {};
  const { [key]: _removed, ...rest } = map;
  return rest;
};

const findNode = (state: FlowState, id: string): FlowNode | undefined =>
  state.nodes.find((node) => node.id === id);

const patchNode = (
  state: FlowState,
  id: string,
  patch: (node: FlowNode) => FlowNode,
): FlowState => {
  let changed = false;
  const nodes = state.nodes.map((node) => {
    if (node.id !== id) return node;
    const next = patch(node);
    if (next !== node) changed = true;
    return next;
  });
  return changed ? { ...state, nodes } : state;
};

const patchData = (
  state: FlowState,
  id: string,
  patch: (data: FlowNode["data"]) => Partial<FlowNode["data"]>,
): FlowState =>
  patchNode(state, id, (node) => ({
    ...node,
    data: { ...node.data, ...patch(node.data) },
  }) as FlowNode);

/** Cheap structural equality for plain JSON-ish values (maps, arrays, scalars). */
export const isJsonEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const key of ka) {
    if (!isJsonEqual((a as ValueMap)[key], (b as ValueMap)[key])) return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Nodes and edges
// ---------------------------------------------------------------------------

export const addNodes = (
  state: FlowState,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[] = [],
): FlowState => {
  if (nodes.length === 0 && edges.length === 0) return state;
  return {
    ...state,
    nodes: nodes.length ? [...state.nodes, ...nodes] : state.nodes,
    edges: edges.length ? [...state.edges, ...edges] : state.edges,
  };
};

export const removeEdge = (state: FlowState, id: string): FlowState => {
  const edges = state.edges.filter((edge) => edge.id !== id);
  return edges.length === state.edges.length ? state : { ...state, edges };
};

/**
 * Removes nodes (and, transitively, children of removed subflows), every
 * edge touching them, and globals no node references any more.
 */
export const removeNodes = (state: FlowState, ids: readonly string[]): FlowState => {
  if (ids.length === 0) return state;
  const removed = new Set(ids);
  // children of removed parents go too
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of state.nodes) {
      if (!removed.has(node.id) && node.parentId && removed.has(node.parentId)) {
        removed.add(node.id);
        grew = true;
      }
    }
  }
  const nodes = state.nodes.filter((node) => !removed.has(node.id));
  if (nodes.length === state.nodes.length) return state;
  const edges = state.edges.filter(
    (edge) => !removed.has(edge.source) && !removed.has(edge.target),
  );
  return pruneOrphanGlobals({ ...state, nodes, edges });
};

export const pruneOrphanGlobals = (state: FlowState): FlowState => {
  if (state.globals.length === 0) return state;
  const used = new Set<string>();
  for (const node of state.nodes) {
    for (const value of Object.values(node.data.globalsMap ?? {})) {
      if (typeof value === "string") used.add(value);
    }
  }
  const globals = state.globals.filter((global) => used.has(global.key));
  return globals.length === state.globals.length ? state : { ...state, globals };
};

/** Shallow patch of a node's data; a no-op when every patched key is already equal. */
export const updateNodeData = (
  state: FlowState,
  id: string,
  patch: Partial<FlowNode["data"]>,
): FlowState =>
  patchNode(state, id, (node) => {
    const data = node.data as ValueMap;
    let changed = false;
    for (const [key, value] of Object.entries(patch)) {
      if (!isJsonEqual(data[key], value)) {
        changed = true;
        break;
      }
    }
    if (!changed) return node;
    return { ...node, data: { ...node.data, ...patch } } as FlowNode;
  });

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

export const setGlobals = (state: FlowState, globals: GlobalArgFragment[]): FlowState =>
  globals === state.globals ? state : { ...state, globals };

/** Removes a global and unbinds every node that pointed at it (restoring the port default). */
export const removeGlobal = (state: FlowState, globalKey: string): FlowState => {
  const nodes = state.nodes.map((node) => {
    const globalsMap = (node.data.globalsMap ?? {}) as ValueMap;
    const boundKeys = Object.entries(globalsMap)
      .filter(([, value]) => value === globalKey)
      .map(([key]) => key);
    if (boundKeys.length === 0) return node;

    let nextGlobals = globalsMap;
    let nextConstants = (node.data.constantsMap ?? {}) as ValueMap;
    for (const key of boundKeys) {
      nextGlobals = without(nextGlobals, key);
      const port = node.data.constants?.find((c) => c.key === key);
      if (port && port.default !== undefined && port.default !== null) {
        nextConstants = { ...nextConstants, [key]: port.default };
      }
    }
    return {
      ...node,
      data: { ...node.data, globalsMap: nextGlobals, constantsMap: nextConstants },
    } as FlowNode;
  });

  const globals = state.globals.filter((global) => global.key !== globalKey);
  if (globals.length === state.globals.length && nodes.every((n, i) => n === state.nodes[i])) {
    return state;
  }
  return { ...state, nodes, globals };
};

// ---------------------------------------------------------------------------
// Constants <-> streams <-> globals
// ---------------------------------------------------------------------------

/** Re-derives the `stream` labels of every edge into `nodeId`/`streamIndex`. */
const relabelIncomingEdges = (
  state: FlowState,
  nodeId: string,
  streamIndex: number,
  stream: readonly StreamPort[],
): FlowState => {
  let changed = false;
  const edges = state.edges.map((edge) => {
    if (edge.target !== nodeId || handleToStream(edge.targetHandle) !== streamIndex) return edge;
    if (!edge.data) return edge;
    changed = true;
    return { ...edge, data: { ...edge.data, stream: streamToItems(stream) } } as FlowEdge;
  });
  return changed ? { ...state, edges } : state;
};

export const moveConstantToStream = (
  state: FlowState,
  nodeId: string,
  key: string,
  streamIndex: number,
): FlowState => {
  const node = findNode(state, nodeId);
  const constant = node?.data.constants?.find((c) => c.key === key);
  if (!node || !constant) return state;

  const ins = node.data.ins.map((stream, index) =>
    index === streamIndex ? [...stream, constant] : stream,
  );
  const next = patchData(state, nodeId, (data) => ({
    ins,
    constants: data.constants.filter((c) => c.key !== key),
    constantsMap: without(data.constantsMap, key),
    globalsMap: without(data.globalsMap, key),
  }));
  return pruneOrphanGlobals(relabelIncomingEdges(next, nodeId, streamIndex, ins[streamIndex] ?? []));
};

export const moveStreamToConstants = (
  state: FlowState,
  nodeId: string,
  streamIndex: number,
  itemIndex: number,
): FlowState => {
  const node = findNode(state, nodeId);
  const input = node?.data.ins.at(streamIndex)?.at(itemIndex);
  if (!node || !input) return state;

  const ins = node.data.ins.map((stream, index) =>
    index === streamIndex ? stream.filter((_, i) => i !== itemIndex) : stream,
  );
  const next = patchData(state, nodeId, (data) => ({
    ins,
    constants: [...data.constants, input],
    constantsMap:
      input.default !== undefined && input.default !== null
        ? { ...data.constantsMap, [input.key]: input.default }
        : without(data.constantsMap, input.key),
  }));
  return relabelIncomingEdges(next, nodeId, streamIndex, ins[streamIndex] ?? []);
};

export const moveConstantToGlobals = (
  state: FlowState,
  nodeId: string,
  key: string,
  globalKey?: string,
): FlowState => {
  const node = findNode(state, nodeId);
  const constant = node?.data.constants?.find((c) => c.key === key);
  if (!node || !constant) return state;

  const targetKey = globalKey ?? constant.key;
  const exists = state.globals.some((g) => g.key === targetKey);
  const globals = exists
    ? state.globals.map((g) => (g.key === targetKey ? { ...g, port: constant } : g))
    : [...state.globals, { key: targetKey, port: constant } as GlobalArgFragment];

  const next = patchData(state, nodeId, (data) => ({
    constantsMap: without(data.constantsMap, key),
    globalsMap: { ...data.globalsMap, [key]: targetKey },
  }));
  return { ...next, globals };
};

export const moveOutStreamToVoid = (
  state: FlowState,
  nodeId: string,
  streamIndex: number,
  itemIndex: number,
): FlowState => {
  const node = findNode(state, nodeId);
  const output = node?.data.outs.at(streamIndex)?.at(itemIndex);
  if (!node || !output) return state;
  return patchData(state, nodeId, (data) => ({
    outs: data.outs.map((stream, index) =>
      index === streamIndex ? stream.filter((_, i) => i !== itemIndex) : stream,
    ),
    voids: [...data.voids, output as unknown as FlussArgPortFragment],
  }));
};

export const moveVoidToOutstream = (
  state: FlowState,
  nodeId: string,
  key: string,
  streamIndex: number,
): FlowState => {
  const node = findNode(state, nodeId);
  const voided = node?.data.voids?.find((v) => v.key === key);
  if (!node || !voided) return state;
  return patchData(state, nodeId, (data) => ({
    outs: data.outs.map((stream, index) =>
      index === streamIndex ? [...stream, voided as unknown as FlussReturnPortFragment] : stream,
    ),
    voids: data.voids.filter((v) => v.key !== key),
  }));
};

/**
 * Filter nodes pass their inputs straight through to every output stream.
 * Turning an input into a constant therefore also removes it from each out
 * stream (kept in `voids`), and the reverse re-adds it. One reducer, one
 * validation, one undo step.
 */
export const filterArgToConstant = (
  state: FlowState,
  nodeId: string,
  streamIndex: number,
  itemIndex: number,
): FlowState => {
  const node = findNode(state, nodeId);
  const input = node?.data.ins.at(streamIndex)?.at(itemIndex);
  if (!node || !input) return state;
  let next = moveStreamToConstants(state, nodeId, streamIndex, itemIndex);
  const after = findNode(next, nodeId);
  if (!after) return next;
  after.data.outs.forEach((stream, outIndex) => {
    const at = stream.findIndex((port) => port.key === input.key);
    if (at !== -1) next = moveOutStreamToVoid(next, nodeId, outIndex, at);
  });
  return next;
};

export const filterConstantToArg = (state: FlowState, nodeId: string, key: string): FlowState => {
  const node = findNode(state, nodeId);
  const constant = node?.data.constants?.find((c) => c.key === key);
  if (!node || !constant) return state;
  let next = moveConstantToStream(state, nodeId, key, 0);
  const after = findNode(next, nodeId);
  if (!after) return next;
  after.data.outs.forEach((stream, outIndex) => {
    if (stream.some((port) => port.key === key)) return;
    // filterArgToConstant parked one void per out stream; consume one per
    // stream and fall back to the constant's port shape when none is left.
    const hasVoid = findNode(next, nodeId)?.data.voids.some((v) => v.key === key);
    next = hasVoid
      ? moveVoidToOutstream(next, nodeId, key, outIndex)
      : patchData(next, nodeId, (data) => ({
          outs: data.outs.map((s, i) =>
            i === outIndex ? [...s, constant as unknown as FlussReturnPortFragment] : s,
          ),
        }));
  });
  return next;
};

// ---------------------------------------------------------------------------
// Structural helpers used by the contextual panels
// ---------------------------------------------------------------------------

export const AGENT_SUBFLOW_CHILD_OFFSET: XYPosition = { x: 24, y: 72 };

export const buildAgentSubflowNode = (args: {
  appFilter?: string | null;
  title?: string | null;
  description?: string;
  versionFilter?: string | null;
  deviceFilter?: string | null;
  userFilter?: string | null;
  autoResolvable?: boolean;
  position: XYPosition;
  id?: string;
}): FlowNode<AgentSubFlowNodeData & { id: string; position: XYPosition; __typename?: "AgentSubFlowNode" }> =>
  ({
    id: args.id ?? nodeIdBuilder(),
    type: "AgentSubFlowNode",
    position: args.position,
    data: {
      kind: GraphNodeKind.AgentSubflow,
      title: args.title ?? args.appFilter ?? "Agent Subflow",
      description: args.description ?? "Agent Subflow",
      ins: [],
      outs: [],
      voids: [],
      constants: [],
      constantsMap: {},
      globalsMap: {},
      appFilter: args.appFilter ?? undefined,
      versionFilter: args.versionFilter ?? undefined,
      deviceFilter: args.deviceFilter ?? undefined,
      userFilter: args.userFilter ?? undefined,
      autoResolvable: args.autoResolvable ?? false,
    },
  }) as unknown as FlowNode<AgentSubFlowNodeData & { id: string; position: XYPosition }>;

/** Places `child` inside `parent` (relative position, clamped to the parent). */
export const parentNode = (child: FlowNode, parentId: string, position?: XYPosition): FlowNode => ({
  ...child,
  parentId,
  extent: "parent",
  expandParent: true,
  position: position ?? AGENT_SUBFLOW_CHILD_OFFSET,
});

/**
 * Wraps an action node in a fresh agent-subflow wrapper. The wrapper sits at
 * `position`; the child is positioned relative to it.
 */
export const wrapInSubflow = (
  child: FlowNode,
  args: { appFilter?: string | null; position: XYPosition },
): { parent: FlowNode; child: FlowNode } => {
  const parent = buildAgentSubflowNode({
    appFilter: args.appFilter,
    title: args.appFilter,
    position: args.position,
  }) as FlowNode;
  return { parent, child: parentNode(child, parent.id) };
};

/**
 * Adds `node` between two existing nodes, wiring left(stream) -> node(0) and
 * node(0) -> right(stream). Optionally removes the edge it replaces.
 */
export const insertNodeBetween = (
  state: FlowState,
  args: {
    node: FlowNode;
    /** An agent-subflow wrapper the node is parented in (added first). */
    wrapper?: FlowNode;
    leftId: string;
    leftStream: number;
    rightId: string;
    rightStream: number;
    removeEdgeId?: string;
  },
): FlowState => {
  const left = findNode(state, args.leftId);
  const right = findNode(state, args.rightId);
  if (!left || !right) return state;
  const edges = state.edges
    .filter((edge) => edge.id !== args.removeEdgeId)
    .concat(
      createVanillaTransformEdge(
        nodeIdBuilder(),
        left.id,
        args.leftStream,
        args.node.id,
        0,
        left.data.outs.at(args.leftStream),
      ),
      createVanillaTransformEdge(
        nodeIdBuilder(),
        args.node.id,
        0,
        right.id,
        args.rightStream,
        args.node.data.outs.at(0),
      ),
    );
  const nodes = args.wrapper
    ? [...state.nodes, args.wrapper, args.node]
    : [...state.nodes, args.node];
  return { ...state, nodes, edges };
};

/**
 * Dropping a connection from `nodeId`'s out-stream onto an existing edge
 * merges both streams with a Zip node feeding the edge's old target.
 * Returns the staged state and the connection that still needs integrating.
 */
export const zipIntoEdge = (
  state: FlowState,
  args: { nodeId: string; streamIndex: number; edgeId: string; position: XYPosition },
): { state: FlowState; connection: Connection } | null => {
  const node = findNode(state, args.nodeId);
  const edge = state.edges.find((e) => e.id === args.edgeId);
  const oldSource = edge ? findNode(state, edge.source) : undefined;
  if (!node || !edge || !oldSource) return null;

  const stagingOut = node.data.outs.at(args.streamIndex);
  const oldOut = oldSource.data.outs.at(handleToStream(edge.sourceHandle));
  if (!stagingOut || !oldOut) return null;

  const stagingFirst = node.position.x < oldSource.position.x;
  const zipNode = reactiveFlowNode({
    title: "Zip",
    description: "Zips together two streams into one stream.",
    ins: stagingFirst ? [stagingOut, oldOut] : [oldOut, stagingOut],
    outs: [[...stagingOut, ...oldOut]],
    implementation: ReactiveImplementation.Zip,
    position: args.position,
  }) as FlowNode;

  const edges = state.edges
    .filter((e) => e.id !== edge.id)
    .concat(
      createVanillaTransformEdge(
        nodeIdBuilder(),
        node.id,
        args.streamIndex,
        zipNode.id,
        stagingFirst ? 0 : 1,
        stagingOut,
      ),
      createVanillaTransformEdge(
        nodeIdBuilder(),
        oldSource.id,
        handleToStream(edge.sourceHandle),
        zipNode.id,
        stagingFirst ? 1 : 0,
        oldOut,
      ),
    );

  return {
    state: { ...state, nodes: [...state.nodes, zipNode], edges },
    connection: {
      source: zipNode.id,
      sourceHandle: "return_0",
      target: edge.target,
      targetHandle: edge.targetHandle ?? null,
    },
  };
};

export const setAutoResolvable = (state: FlowState, nodeId: string, value: boolean): FlowState =>
  updateNodeData(state, nodeId, { autoResolvable: value } as Partial<FlowNode["data"]>);
