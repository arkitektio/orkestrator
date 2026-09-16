import {
  GraphEdgeKind,
  GraphNodeFragment,
  GraphNodeKind,
  PortKind,
  ReactiveImplementation,
} from "@/reaktion/api/graphql";
import { Connection, XYPosition } from "@xyflow/react";
import { ArgPort, FlowEdge, FlowNode, FlowNodeData, GeneralPort, ReturnPort, StreamPort } from "../types";
import {
  handleToStream,
  listPortToSingle,
  nodeIdBuilder,
  reactiveFlowNode,
  singleToList,
} from "../utils";
import {
  ChangeEvent,
  ChangeOutcome,
  FlowState,
  SolvedError,
  Transform,
  ValidationResult,
} from "./types";
import {
  isChunkTransformable,
  isFloatTransformable,
  isIntTransformable,
  isNullTransformable,
  isSameStream,
  islistTransformable,
  reduceStream,
  withNewStream,
} from "./utils";

export const changeZip = (
  data: FlowNodeData,
  event: ChangeEvent,
): ChangeOutcome => {
  if (event.type == "target") {
    if (isSameStream(data.ins.at(event.index), event.stream)) return {}; // No change needed
    // Otherwise we need to change the source port
    const newIns = withNewStream(data.ins, event.index, event.stream);
    const reducedStream = reduceStream(newIns);
    const newOuts = [reducedStream];
    const newData = { ...data, ins: newIns, outs: newOuts } as FlowNodeData;
    return {
      data: newData,
      changes: [{ type: "source", index: 0, stream: reducedStream }],
    };
  } else {
    if (isSameStream(data.outs.at(event.index), event.stream)) return {}; // No change needed
    // Otherwise we need to change the target ports
    if (event.stream.length != 2)
      throw new Error("Zip node must have two source ports");
    const newOutstream = withNewStream(data.outs, event.index, event.stream);
    if (newOutstream.length != 2) return {}; // No change needed
    const newInstream = [newOutstream[0], newOutstream[1]];
    const newData = { ...data, ins: newInstream, outs: newOutstream } as FlowNodeData;
    return {
      data: newData,
      changes: [
        { type: "target", index: 0, stream: newInstream[0] },
        { type: "target", index: 1, stream: newInstream[1] },
      ],
    };
  }
};

export const onlyValid = (
  data: FlowNodeData,
  event: ChangeEvent,
): ChangeOutcome => {
  if (event.type == "target") {
    if (isSameStream(event.stream, data.ins.at(event.index))) return {}; // No change needed
    if (islistTransformable(event.stream, data.ins.at(event.index)))
      return { needsTransform: "to_list" }; // No change needed// No change needed
    if (isChunkTransformable(event.stream, data.ins.at(event.index)))
      return { needsTransform: "from_list" }; // No change needed// No change needed
    if (isNullTransformable(event.stream, data.ins.at(event.index)))
      return { needsTransform: "ensure" };
    if (isFloatTransformable(event.stream, data.ins.at(event.index)))
      return { needsTransform: "round_float" };
    if (isIntTransformable(event.stream, data.ins.at(event.index)))
      return { needsTransform: "to_float" };

    throw new Error("Ports do not match");
  } else {
    if (isSameStream(data.outs.at(event.index), event.stream)) return {};
    throw new Error("Ports do not match");
  }
};

export const streamContainsNonLocal = (stream: GeneralPort[]): boolean => {
  for (const port of stream) {
    if (port.kind == PortKind.MemoryStructure) return true;
  }
  return false;
};

export const argIsValid = (
  data: FlowNodeData,
  event: ChangeEvent,
): ChangeOutcome => {
  if (event.type == "source") {
    return {
      data: {
        ...data,
        outs: withNewStream(data.outs, event.index, event.stream),
      } as FlowNodeData,
    }; // No change needed
  } else {
    throw new Error(
      "Args does not have target ports. This should never happen",
    );
  }
};

export const returnIsValid = (
  data: FlowNodeData,
  event: ChangeEvent,
): ChangeOutcome => {
  if (event.type == "target") {
    if (streamContainsNonLocal(event.stream)) {
      return { denied: "Return cannot have non-local ports" };
    }

    return {
      data: {
        ...data,
        ins: withNewStream(data.ins, event.index, event.stream),
      } as FlowNodeData,
    }; // No change needed
  } else {
    throw new Error(
      "Return does not have sorce ports. This should never happen",
    );
  }
};

export const propagateChange = (
  data: FlowNodeData<GraphNodeFragment>,
  event: ChangeEvent,
): ChangeOutcome => {
  if (!data.kind) {
    return { denied: "Kind not found" };
  }

  try {
    if (data.kind == GraphNodeKind.Reactive) {
      if (
        (data as { implementation?: ReactiveImplementation }).implementation ==
        ReactiveImplementation.Zip
      )
        return changeZip(data, event);
    }
    if (data.kind == GraphNodeKind.Args) return argIsValid(data, event);
    if (data.kind == GraphNodeKind.Returns) return returnIsValid(data, event);
    return onlyValid(data, event);
  } catch (e) {
    if ((e as Error).message) {
      return { denied: (e as Error).message };
    } else {
      return { denied: "Unknown error" };
    }
  }
};

export type TransitionChange = ChangeEvent & { nodeId: string };


export type SourceStream = ReturnPort[][];
export type TargetStream = ArgPort[][];



export type SourceTransition = {
  type: "source"
  index: number;
  stream: ReturnPort[];
  nodeId: string;
};


export type TargetTransition = {
  type: "target";
  index: number;
  stream: ArgPort[];
  nodeId: string;
};

export type Transition = SourceTransition | TargetTransition;

export const totalOutcomes = 0;

export type TargetTransitionOptions = {
  maxCount: number;
  runningCount: number;
  nodeID: string;
  edgeID: string;
  stream: StreamPort[];
  type: "source";
  index: number;
  allowTransforms: boolean;
};


export type SourceTransitionOptions = {
  maxCount: number;
  runningCount: number;
  nodeID: string;
  edgeID: string;
  stream: StreamPort[];
  type: "target";
  index: number;
  allowTransforms: boolean;
};

export type TransitionOptions = TargetTransitionOptions | SourceTransitionOptions;





export const getTransform = (
  transform: Transform,
  instream: StreamPort[],
  position: XYPosition,
): FlowNode => {
  if (transform == "to_list") {
    return reactiveFlowNode({
      title: "To List",
      description: "Transforms a stream into a list",
      ins: [instream],
      outs: [instream.map((p) => singleToList(p as ArgPort))],
      implementation: ReactiveImplementation.ToList,
      position,
    });
  }

  if (transform == "round_float") {
    return reactiveFlowNode({
      title: "Round",
      description: "Round a flout to the nearest int",
      ins: [instream],
      outs: [instream.map((p) => ({ ...p, kind: PortKind.Int }))],
      implementation: ReactiveImplementation.ToList,
      position,
    });
  }

  if (transform == "to_float") {
    return reactiveFlowNode({
      title: "Convert to Float",
      description: "Round a int to a float",
      ins: [instream],
      outs: [instream.map((p) => ({ ...p, kind: PortKind.Float }))],
      implementation: ReactiveImplementation.ToList,
      position,
    });
  }

  if (transform == "from_list") {
    return reactiveFlowNode({
      title: "Chunk",
      description: "Transforms a stream into an item of chunks",
      ins: [instream],
      outs: [instream.map((p) => listPortToSingle(p as ArgPort, "Chunked" + p.key))],
      implementation: ReactiveImplementation.Chunk,
      position,
    });
  }

  if (transform == "ensure") {
    return reactiveFlowNode({
      title: "Ensure",
      description:
        "Ensures that the stream has no null items (will raise an error if it is)",
      ins: [instream],
      outs: [instream.map((p) => ({ ...p, nullable: false }))],
      implementation: ReactiveImplementation.Ensure,
      position,
    });
  }

  throw new Error("Unknown transform");
};

export const streamToItems = (
  stream: readonly StreamPort[] | undefined,
): FlowEdge["data"] extends { stream: infer S } ? S : never =>
  (stream ?? []).map((port) => ({
    __typename: "StreamItem" as const,
    kind: port.kind,
    label: port.label ?? port.key,
  })) as never;

export const createVanillaTransformEdge = (
  id: string,
  source: string,
  sourceStream: number,
  target: string,
  targetStream: number,
  stream?: readonly StreamPort[],
): FlowEdge => {
  return {
    id: id,
    source: source,
    sourceHandle: "return_" + sourceStream,
    target: target,
    targetHandle: "arg_" + targetStream,
    type: "VanillaEdge",
    data: {
      __typename: "VanillaEdge",
      id: id,
      kind: GraphEdgeKind.Vanilla,
      stream: streamToItems(stream),
      source: source,
      sourceHandle: "return_" + sourceStream,
      target: target,
      targetHandle: "arg_" + targetStream,
    } as FlowEdge["data"],
  };
};

export const removeEdgeAndSolve = (
  state: ValidationResult,
  edgeID: string,
  message: string,
) => {
  const edge = state.edges.find((e) => e.id == edgeID);
  if (!edge) throw new Error("Edge not found. Should never throw");
  state.edges = state.edges.filter((e) => e.id != edgeID);
  state.solvedErrors = [
    ...state.solvedErrors,
    {
      type: "edge",
      id: edgeID,
      comparing: {
        sourceStreamIndex: handleToStream(edge.sourceHandle),
        sourceItemIndex: 0,
        targetStreamIndex: handleToStream(edge.targetHandle),
        targetItemIndex: 0,
      },
      message: message,
      level: "critical",
      solvedBy: "Removing the Edge",
    },
  ];
};

export const addEdgeAndSolve = (
  state: ValidationResult,
  edge: FlowEdge,
  message: string,
) => {
  state.edges = [...state.edges, edge];
  state.solvedErrors = [
    ...state.solvedErrors,
    {
      type: "edge",
      id: edge.id,
      message: message,
      level: "critical",
      solvedBy: "Adding an Edge",
    },
  ];
};

export const addNodeAndSolve = (
  state: ValidationResult,
  node: FlowNode,
  message: string,
) => {
  state.nodes = [...state.nodes, node];
  state.solvedErrors = [
    ...state.solvedErrors,
    {
      type: "node",
      id: node.id,
      message: message,
      level: "critical",
      solvedBy: "Added a Node",
    },
  ];
};

export const findSourceForEdgeID = (
  state: ValidationResult,
  edgeID: string,
): FlowNode => {
  const edge = state.edges.find((e) => e.id == edgeID);
  if (!edge) throw new Error("Edge not found. Should never throw");
  const node = state.nodes.find((n) => n.id == edge.source);
  if (!node) throw new Error("Node not found. Should never throw");
  return node;
};

export const findSourceStreamForEdgeID = (
  state: ValidationResult,
  edgeID: string,
): number => {
  const edge = state.edges.find((e) => e.id == edgeID);
  if (!edge) throw new Error("Edge not found. Should never throw");
  return handleToStream(edge.sourceHandle);
};

export const findTargetStreamForEdgeID = (
  state: ValidationResult,
  edgeID: string,
): number => {
  const edge = state.edges.find((e) => e.id == edgeID);
  if (!edge) throw new Error("Edge not found. Should never throw");
  return handleToStream(edge.targetHandle);
};

export const findTargetForEdgeID = (
  state: ValidationResult,
  edgeID: string,
): FlowNode => {
  const edge = state.edges.find((e) => e.id == edgeID);
  if (!edge) throw new Error("Edge not found. Should never throw");
  const node = state.nodes.find((n) => n.id == edge.target);
  if (!node) throw new Error("Node not found. Should never throw");
  return node;
};

export const findNodeForID = (
  state: ValidationResult,
  nodeID: string,
): FlowNode => {
  const node = state.nodes.find((n) => n.id == nodeID);
  if (!node) throw new Error("Node not found. Should never throw");
  return node;
};

export const addTransform = (
  state: ValidationResult,
  options: TransitionOptions,
  transform: Transform,
): void => {
  // We remove the original edge
  // We need to add transform to the right direction

  const targetNode = findTargetForEdgeID(state, options.edgeID);
  const sourceNode = findSourceForEdgeID(state, options.edgeID);

  const sourceStream = findSourceStreamForEdgeID(state, options.edgeID);
  const targetStream = findTargetStreamForEdgeID(state, options.edgeID);

  const targetNodePosition = targetNode.position; // node is target
  const sourceNodePostion = sourceNode.position; // node is source

  const inbetweenPosition: XYPosition = {
    x: (targetNodePosition.x + sourceNodePostion.x) / 2,
    y: (targetNodePosition.y + sourceNodePostion.y) / 2,
  };

  const transformNode = getTransform(transform, options.stream, inbetweenPosition);

  // Fresh ids: the removed edge's id must not be reused, otherwise the solved
  // error recorded for it points at a different, still-existing edge (and
  // chained transforms would collide on `<id>-transform`).
  const toTransformEdge = createVanillaTransformEdge(
    nodeIdBuilder(),
    sourceNode.id,
    sourceStream,
    transformNode.id,
    0, // transform ports are always 0
    options.stream,
  );

  const toTargetEdge = createVanillaTransformEdge(
    nodeIdBuilder(),
    transformNode.id,
    0,
    targetNode.id,
    targetStream,
    transformNode.data.outs.at(0),
  );

  removeEdgeAndSolve(state, options.edgeID, "Removed because of transform");
  addNodeAndSolve(state, transformNode, "Added because of transform");
  addEdgeAndSolve(state, toTransformEdge, "Added because of transform");
  addEdgeAndSolve(state, toTargetEdge, "Added because of transform");
};

export const transitionOrCut = (
  state: ValidationResult,
  options: TransitionOptions,
): void => {
  const changeCount = options.runningCount;
  const node = state.nodes.find((n) => n.id == options.nodeID);
  if (!node) throw new Error("Node not found. Should never throw");

  const outcome = propagateChange(node.data, {
    type: options.type,
    stream: options.stream,
    index: options.index,
  });

  if (outcome.needsTransform) {
    if (options.allowTransforms) {
      addTransform(state, options, outcome.needsTransform);
    } else {
      removeEdgeAndSolve(
        state,
        options.edgeID,
        "Removed because of unallowed transform.",
      );
      return;
    }
  }

  if (outcome.denied) {
    removeEdgeAndSolve(state, options.edgeID, outcome.denied);
    return;
  }

  // Only change the node if the data has changed and the node is not denied
  if (outcome.data) {
    // The node needs to change because of the transition
    state.nodes = state.nodes.map((n) => {
      if (n.id == options.nodeID) {
        if (outcome.data == undefined)
          throw new Error("Data is undefined. Should never throw");
        return { ...n, data: outcome.data };
      }
      return n;
    });
  }

  if (outcome.changes) {
    // We need to propagate the changes of this change

    const removedEdges: FlowEdge[] = [];
    const solvedErrors: SolvedError[] = [];

    for (const change of outcome.changes) {
      // find all edges that have this node as source or target
      if (change.type == "source") {
        const affectedEdges = [
          ...state.edges.filter((e) => e.source == options.nodeID),
        ]; // We need to copy the array because we are changing it
        for (const edge of affectedEdges) {
          if (changeCount < options.maxCount) {
            transitionOrCut(state, {
              ...options,
              stream: change.stream,
              type: "target", // TODO: Check if this is correct
              index: change.index,
              nodeID: edge.target,
              runningCount: changeCount + 1,
              edgeID: edge.id,
            });
          } else {
            solvedErrors.push({
              type: "edge",
              id: edge.id,
              message: "We reached maximum amount of transition",
              level: "critical",
              solvedBy: "Removing the Edge",
            });
            removedEdges.push(edge);
          }
        }
      }

      if (change.type == "target") {
        const affectedEdges = [
          ...state.edges.filter((e) => e.target == options.nodeID),
        ]; // We need to copy the array because we are changing it
        for (const edge of affectedEdges) {
          if (changeCount < options.maxCount) {
            transitionOrCut(state, {
              ...options,
              stream: change.stream,
              type: "source", // TODO: Check if this is correct
              index: change.index,
              nodeID: edge.source,
              runningCount: changeCount + 1,
              edgeID: edge.id,
            });
          } else {
            solvedErrors.push({
              type: "edge",
              id: edge.id,
              message: "We reached maximum amount of transition",
              level: "critical",
              solvedBy: "Removing the Edge",
            });
            removedEdges.push(edge);
          }
        }
      }
    }

    // Remove all edges that are not transition because of the maxCount
    state.edges = state.edges.filter((e) => !removedEdges.includes(e));
    state.solvedErrors = [...state.solvedErrors, ...solvedErrors];
  }
};

export const istriviallyIntegratable = (
  state: FlowState,
  connection: Connection,
): boolean => {
  const sourceNode = state.nodes.find((n) => n.id == connection.source);
  const targetNode = state.nodes.find((n) => n.id == connection.target);

  const sourceStreamIndex = handleToStream(connection.sourceHandle);
  const targetStreamIndex = handleToStream(connection.targetHandle);

  const sourceStream = sourceNode?.data.outs.at(sourceStreamIndex);
  const targetStream = targetNode?.data.ins.at(targetStreamIndex);

  if (targetNode?.type == "ReactiveNode") {
    const alreadyConnected = state.edges.find((e) => e.target == targetNode.id);
    if (alreadyConnected) {
      return isSameStream(sourceStream, targetStream);
    }
    return true;
  }

  if (sourceStream == undefined || targetStream == undefined) return false;

  // Args and Returns are always trivially integratable if they have no connections
  if (sourceNode?.type == "ArgNode") {
    const alreadyConnected = state.edges.find((e) => e.source == sourceNode.id);
    if (alreadyConnected) {
      return isSameStream(sourceStream, targetStream);
    }
    return true;
  }
  if (targetNode?.type == "ReturnNode") {
    const alreadyConnected = state.edges.find((e) => e.target == targetNode.id);
    if (alreadyConnected) {
      return isSameStream(sourceStream, targetStream);
    }
    return true;
  }

  return isSameStream(sourceStream, targetStream);
};

// Can throw errors
/**
 * Validates and integrates a connection into the flow state.
 *
 * @param state - The current flow state.
 * @param connection - The connection to integrate.
 * @returns The updated flow state after integration.
 * @throws Error if source ID or target ID is not found, or if source or target node is not found, or if source or target handle is not found, or if source or target stream is not found.
 */
export const integrate = (
  state: FlowState,
  connection: Connection,
): ValidationResult => {
  const sourceNode = state.nodes.find((n) => n.id == connection.source);
  const targetNode = state.nodes.find((n) => n.id == connection.target);

  const sourceNodeID = connection.source;
  const targetNodeID = connection.target;
  const sourceHandle = connection.sourceHandle;
  const targetHandle = connection.targetHandle;

  if (!sourceNodeID || !targetNodeID)
    throw new Error("SourceID or TargetID not found");
  if (!sourceNode || !targetNode)
    throw new Error("Source or Target node not found");
  if (!sourceHandle || !targetHandle)
    throw new Error("Source or Target handle not found");

  const sourceStreamIndex = handleToStream(connection.sourceHandle);
  const targetStreamIndex = handleToStream(connection.targetHandle);

  const sourceStream = sourceNode.data.outs.at(sourceStreamIndex);
  const targetStream = targetNode.data.ins.at(targetStreamIndex);

  if (sourceStream == undefined || targetStream == undefined)
    throw new Error("Source or Target stream not found");
  if (sourceStream == undefined || targetStream == undefined)
    throw new Error("Source or Target stream not found");

  const newID = nodeIdBuilder();

  const edge: FlowEdge = {
    id: newID,
    source: sourceNodeID,
    sourceHandle: sourceHandle,
    target: targetNodeID,
    targetHandle: targetHandle,
    type: "VanillaEdge",
    data: {
      __typename: "VanillaEdge",
      id: newID,
      kind: GraphEdgeKind.Vanilla,
      stream: streamToItems(sourceStream),
      source: sourceNodeID,
      sourceHandle: sourceHandle,
      target: targetNodeID,
      targetHandle: targetHandle,
    } as FlowEdge["data"],
  };

  const initialState: ValidationResult = {
    ...state,
    edges: [...state.edges, edge],
    solvedErrors: [],
    remainingErrors: [],
    valid: true,
  };

  const validatableChangeRightState = { ...initialState };

  const transitionRightOptions: TransitionOptions = {
    maxCount: 10,
    runningCount: 0,
    nodeID: targetNodeID,
    stream: sourceStream,
    type: "target",
    index: targetStreamIndex,
    edgeID: newID,
    allowTransforms: true,
  };

  // This will recursively transition nodes leaving the initial node
  // and add all the edges that are needed to the state to account
  // for the new connection
  transitionOrCut(validatableChangeRightState, transitionRightOptions);

  const validatableChangeLeftState = { ...initialState };

  const transitionLeftOptions: TransitionOptions = {
    maxCount: 10,
    runningCount: 0,
    nodeID: sourceNodeID,
    stream: targetStream,
    type: "source",
    index: sourceStreamIndex,
    edgeID: newID,
    allowTransforms: true,
  };

  transitionOrCut(validatableChangeLeftState, transitionLeftOptions);

  // Lets find out which one is better
  const edgeIsInLeft = validatableChangeLeftState.edges.find(
    (e) => e.id == newID,
  );

  const edgeIsInRight = validatableChangeRightState.edges.find(
    (e) => e.id == newID,
  );

  if (edgeIsInLeft && edgeIsInRight) {
    // Find out which one is better
    return validatableChangeRightState;
  } else {
    if (edgeIsInLeft) {
      return validatableChangeLeftState;
    } else if (edgeIsInRight) {
      return validatableChangeRightState;
    } else {
      //TODO: Find out which one is better right is better for now
      return validatableChangeRightState;
    }
  }
};
