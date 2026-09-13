import {
  FlowFragment,
  GlobalArgFragment,
  ReactiveImplementation,
} from "@/reaktion/api/graphql";
import {
  AgentSubFlowNodeData,
  ClickContextualParams,
  ContextualParams,
  ConnectContextualParams,
  DropContextualParams,
  EdgeContextualParams,
  FlowEdge,
  FlowNode,
  RelativePosition,
  SubflowDropContextualParams,
} from "@/reaktion/types";
import {
  createVanillaTransformEdge,
  integrate,
  istriviallyIntegratable,
} from "@/reaktion/validation/integrate";
import { ValidationResult } from "@/reaktion/validation/types";
import { validateState } from "@/reaktion/validation/validate";
import {
  edges_to_flowedges,
  handleToStream,
  nodeIdBuilder,
  nodes_to_flownodes,
  reactiveFlowNode,
} from "@/reaktion/utils";
import { PortKind } from "@/rekuest/api/graphql";
import {
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  Node,
  OnConnectEnd,
  OnConnectStartParams,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { temporal } from "zundo";
import { createStore } from "zustand";

type TemporalEditFlowState = Pick<
  ValidationResult,
  "nodes" | "edges" | "globals" | "remainingErrors" | "solvedErrors" | "valid"
>;

const getClientPoint = (event: MouseEvent | TouchEvent) => {
  if ("touches" in event && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  if ("changedTouches" in event && event.changedTouches.length > 0) {
    return {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };
  }

  if ("clientX" in event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  return null;
};

const calculateMidpoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2,
});

export const createInitialState = (flow: FlowFragment): ValidationResult =>
  validateState({
    nodes: nodes_to_flownodes(flow.graph?.nodes),
    edges: edges_to_flowedges(flow.graph?.edges),
    globals: flow.graph.globals || [],
    remainingErrors: [],
    solvedErrors: [],
    valid: true,
  });

export const checkFlowIsEqual = (a: ValidationResult, b: ValidationResult) => {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;
  if (a.globals.length !== b.globals.length) return false;
  if (a.valid !== b.valid) return false;
  if (a.remainingErrors.length !== b.remainingErrors.length) return false;
  if (a.solvedErrors.length !== b.solvedErrors.length) return false;
  return true;
};

const hasBoundPort = (node: FlowNode): boolean => {
  return !!(
    node.data.ins?.find(
      (stream) =>
        stream && stream.length && stream.find((item) => item.kind === PortKind.MemoryStructure),
    ) ||
    node.data.outs?.find(
      (stream) =>
        stream && stream.length && stream.find((item) => item.kind === PortKind.MemoryStructure),
    ) ||
    node.data.voids?.find((item) => item.kind === PortKind.MemoryStructure) ||
    node.data.constants?.find((item) => item.kind === PortKind.MemoryStructure)
  );
};

export interface EditFlowState extends ValidationResult {
  showEdgeLabels: boolean;
  showNodeErrors: boolean;
  contextuals: ContextualParams[];
  reactFlowInstance: ReactFlowInstance<FlowNode, FlowEdge> | null;
  relativeWrapperRef: RefObject<HTMLDivElement | null> | null;
  connectAppend: boolean;
  connectingStart?: OnConnectStartParams;
  replaceValidationResult: (
    next: ValidationResult | ((state: EditFlowState) => ValidationResult),
  ) => void;
  setAutoResolvable: (autoResolvable: boolean, id: string) => void;
  updateData: (data: Partial<FlowNode["data"]>, id: string) => void;
  setGlobals: (data: GlobalArgFragment[]) => void;
  removeGlobal: (key: string) => void;
  removeEdge: (id: string) => void;
  addNode: (node: FlowNode) => void;
  moveConstantToGlobals: (
    nodeId: string,
    conindex: number,
    globalkey?: string | undefined,
  ) => void;
  moveStreamToConstants: (
    nodeId: string,
    streamIndex: number,
    itemIndex: number,
  ) => void;
  moveConstantToStream: (
    nodeId: string,
    conindex: number,
    streamIndex: number,
  ) => void;
  moveOutStreamToVoid: (
    nodeId: string,
    conindex: number,
    streamIndex: number,
  ) => void;
  moveVoidtoOutstream: (
    nodeId: string,
    conindex: number,
    streamIndex: number,
  ) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setReactFlowInstance: (instance: ReactFlowInstance<FlowNode, FlowEdge> | null) => void;
  setConnectingStart: (params: OnConnectStartParams | undefined) => void;
  setConnectAppend: (value: boolean) => void;
  setShowEdgeLabels: (value: boolean) => void;
  setShowNodeErrors: (value: boolean) => void;
  toggleShowEdgeLabels: () => void;
  toggleShowNodeErrors: () => void;
  openContextual: (contextual: ContextualParams, append?: boolean) => void;
  addContextual: (contextual: ContextualParams) => void;
  removeContextual: (id: string) => void;
  clearPanels: () => void;
  addClickNode: (node: FlowNode, params: ClickContextualParams) => void;
  addConnectContextualNode: (
    node: FlowNode,
    params: ConnectContextualParams,
  ) => void;
  addEdgeContextualNode: (node: FlowNode, params: EdgeContextualParams) => void;
  addContextualNode: (
    node: FlowNode,
    params: DropContextualParams | SubflowDropContextualParams,
  ) => void;
  setRelativeWrapperRef: (ref: RefObject<HTMLDivElement | null>) => void;
  getBoundNodes: () => FlowNode[];
  onPaneClick: (event: ReactMouseEvent) => void;
  onNodeClick: (event: ReactMouseEvent, node: Node) => void;
  onEdgeClick: (event: ReactMouseEvent, edge: Edge) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: MouseEvent | TouchEvent, params: OnConnectStartParams) => void;
  onConnectEnd: OnConnectEnd;
}

export const createEditFlowStore = (initialState: ValidationResult) => {
  // Undo history and node drags: React Flow replaces `nodes` on every pointer
  // move of a drag. Recording each of those as an undo step pushed ~60
  // snapshots per drag into the 100-entry history and evicted real edits. The
  // intermediate ticks are skipped and the drag is committed as ONE step
  // (from the pre-drag state) when the final `dragging: false` change lands.
  let suppressHistory = false;
  let dragStartState: TemporalEditFlowState | null = null;
  const partialize = (state: EditFlowState): TemporalEditFlowState => ({
    nodes: state.nodes,
    edges: state.edges,
    globals: state.globals,
    remainingErrors: state.remainingErrors,
    solvedErrors: state.solvedErrors,
    valid: state.valid,
  });

  return createStore<EditFlowState>()(
    temporal(
      (set, get) => ({
        ...initialState,
        showEdgeLabels: false,
        showNodeErrors: true,
        contextuals: [],
        reactFlowInstance: null,
        relativeWrapperRef: null,
        connectAppend: false,
        connectingStart: undefined,

        replaceValidationResult: (next) => {
          set((state) => (typeof next === "function" ? next(state) : next));
        },

        onNodesChange: (changes) => {
          const state = get();
          const nextNodes = applyNodeChanges(changes, state.nodes) as FlowNode[];

          if (
            changes.length === 1 &&
            (changes[0].type === "position" || changes[0].type === "dimensions")
          ) {
            const change = changes[0];
            if (change.type === "position" && change.dragging) {
              if (!dragStartState) dragStartState = partialize(state);
              suppressHistory = true;
              try {
                set({ nodes: nextNodes });
              } finally {
                suppressHistory = false;
              }
              return;
            }
            set({ nodes: nextNodes });
            return;
          }

          set(
            validateState({
              ...state,
              nodes: nextNodes,
            }),
          );
        },

        onEdgesChange: (changes) => {
          const state = get();
          set(
            validateState({
              ...state,
              edges: applyEdgeChanges(changes, state.edges) as FlowEdge[],
            }),
          );
        },

        updateData: (data, id) => {
          set((state) =>
            validateState({
              ...state,
              nodes: state.nodes.map((node) => {
                if (node.id !== id) {
                  return node;
                }

                return {
                  ...node,
                  data: { ...node.data, ...data },
                } as FlowNode;
              }),
            }),
          );
        },

        setGlobals: (globals) => {
          set((state) =>
            validateState({
              ...state,
              globals,
            }),
          );
        },

        removeGlobal: (globalkey) => {
          set((state) => {
            const nodes = state.nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                globalsMap: Object.fromEntries(
                  Object.entries(node.data.globalsMap ?? {}).filter(
                    ([, value]) => value !== globalkey,
                  ),
                ),
              },
            })) as FlowNode[];

            return validateState({
              ...state,
              nodes,
              globals: state.globals.filter((globalArg) => globalArg.key !== globalkey),
            });
          });
        },

        removeEdge: (id) => {
          set((state) =>
            validateState({
              ...state,
              edges: state.edges.filter((edge) => edge.id !== id),
            }),
          );
        },

        addNode: (node) => {
          set((state) =>
            validateState({
              ...state,
              nodes: [...state.nodes, node],
            }),
          );
        },

        setAutoResolvable: (autoResolvable, id) => {
          set((state) => {
            const nodes = state.nodes.map((node) => {
              if (node.id === id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    autoResolvable
                  }
                };
              }
              return node;
            });
            return validateState({
              ...state,
              nodes
            });
          });
        },

        moveConstantToStream: (nodeId, conindex, instream) => {
          set((state) => {
            const node = state.nodes.find((candidate) => candidate.id === nodeId);
            if (!node) {
              return state;
            }

            const constant = node.data.constants.at(conindex);
            if (!constant) {
              return state;
            }

            const newInstream = node.data.ins.map((stream, index) =>
              index === instream ? [...stream, constant] : stream,
            );

            const newConstants = node.data.constants.filter(
              (_, index) => index !== conindex,
            );

            const updatedEdges = state.edges.map((edge) => {
              if (
                edge.target === nodeId &&
                handleToStream(edge.targetHandle) === instream &&
                edge.data
              ) {
                const streamItems = newInstream[instream]?.map((port) => ({
                  __typename: "StreamItem" as const,
                  kind: port.kind,
                  label: port.label ?? port.key,
                }));

                if (!streamItems) {
                  return edge;
                }

                return {
                  ...edge,
                  data: {
                    ...edge.data,
                    stream: streamItems,
                  },
                };
              }

              return edge;
            });

            return validateState({
              ...state,
              nodes: state.nodes.map((candidate) => {
                if (candidate.id !== nodeId) {
                  return candidate;
                }

                return {
                  ...candidate,
                  data: {
                    ...candidate.data,
                    ins: newInstream,
                    constants: newConstants,
                    constantsMap: {
                      ...candidate.data.constantsMap,
                      [constant.key]: undefined,
                    },
                    globalsMap: {
                      ...candidate.data.globalsMap,
                      [constant.key]: undefined,
                    },
                  },
                } as FlowNode;
              }),
              edges: updatedEdges,
            });
          });
        },

        moveVoidtoOutstream: (nodeId, voidindex, outstream) => {
          set((state) => {
            const node = state.nodes.find((candidate) => candidate.id === nodeId);
            if (!node) {
              return state;
            }

            const outputVoid = node.data.voids.at(voidindex);
            if (!outputVoid) {
              return state;
            }

            const newOutstream = node.data.outs.map((stream, index) =>
              index === outstream ? [...stream, outputVoid] : stream,
            );

            const newVoids = node.data.voids.filter((_, index) => index !== voidindex);

            return validateState({
              ...state,
              nodes: state.nodes.map((candidate) => {
                if (candidate.id !== nodeId) {
                  return candidate;
                }

                return {
                  ...candidate,
                  data: {
                    ...candidate.data,
                    outs: newOutstream,
                    voids: newVoids,
                  },
                } as FlowNode;
              }),
            });
          });
        },

        moveOutStreamToVoid: (nodeId, streamIndex, streamItem) => {
          set((state) => {
            const node = state.nodes.find((candidate) => candidate.id === nodeId);
            if (!node) {
              return state;
            }

            const output = node.data.outs.at(streamIndex)?.at(streamItem);
            if (!output) {
              return state;
            }

            const newOutstream = node.data.outs.map((stream, index) =>
              index === streamIndex
                ? stream.filter((_, itemIndex) => itemIndex !== streamItem)
                : stream,
            );

            return validateState({
              ...state,
              nodes: state.nodes.map((candidate) => {
                if (candidate.id !== nodeId) {
                  return candidate;
                }

                return {
                  ...candidate,
                  data: {
                    ...candidate.data,
                    outs: newOutstream,
                    voids: [...candidate.data.voids, output],
                  },
                } as FlowNode;
              }),
            });
          });
        },

        moveStreamToConstants: (nodeId, streamIndex, streamItem) => {
          set((state) => {
            const node = state.nodes.find((candidate) => candidate.id === nodeId);
            if (!node) {
              return state;
            }

            const input = node.data.ins.at(streamIndex)?.at(streamItem);
            if (!input) {
              return state;
            }

            const newInstream = node.data.ins.map((stream, index) =>
              index === streamIndex
                ? stream.filter((_, itemIndex) => itemIndex !== streamItem)
                : stream,
            );

            return validateState({
              ...state,
              nodes: state.nodes.map((candidate) => {
                if (candidate.id !== nodeId) {
                  return candidate;
                }

                return {
                  ...candidate,
                  data: {
                    ...candidate.data,
                    ins: newInstream,
                    constants: [...candidate.data.constants, input],
                    constantsMap: {
                      ...candidate.data.constantsMap,
                      [input.key]: input.default,
                    },
                  },
                } as FlowNode;
              }),
            });
          });
        },

        moveConstantToGlobals: (nodeId, conindex, globalkey) => {
          set((state) => {
            const node = state.nodes.find((candidate) => candidate.id === nodeId);
            if (!node) {
              return state;
            }

            const constant = node.data.constants.at(conindex);
            if (!constant) {
              return state;
            }

            let nextGlobalKey = globalkey;
            let globals = state.globals;

            if (!nextGlobalKey) {
              nextGlobalKey = constant.key;
              globals = [...state.globals, { key: constant.key, port: constant }];
            } else {
              globals = state.globals.map((globalArg) =>
                globalArg.key === nextGlobalKey
                  ? { ...globalArg, port: constant }
                  : globalArg,
              );
            }

            return validateState({
              ...state,
              nodes: state.nodes.map((candidate) => {
                if (candidate.id !== nodeId) {
                  return candidate;
                }

                return {
                  ...candidate,
                  data: {
                    ...candidate.data,
                    constantsMap: {
                      ...candidate.data.constantsMap,
                      [constant.key]: undefined,
                    },
                    globalsMap: {
                      ...candidate.data.globalsMap,
                      [constant.key]: nextGlobalKey,
                    },
                  },
                } as FlowNode;
              }),
              globals,
            });
          });
        },

        setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
        setConnectingStart: (connectingStart) => set({ connectingStart }),
        setConnectAppend: (connectAppend) => set({ connectAppend }),
        setShowEdgeLabels: (showEdgeLabels) => set({ showEdgeLabels }),
        setShowNodeErrors: (showNodeErrors) => set({ showNodeErrors }),
        toggleShowEdgeLabels: () => {
          set((state) => ({ showEdgeLabels: !state.showEdgeLabels }));
        },
        toggleShowNodeErrors: () => {
          set((state) => ({ showNodeErrors: !state.showNodeErrors }));
        },
        openContextual: (contextual, append = false) => {
          if (!append) {
            set({ contextuals: [] });
          }

          set((state) => ({ contextuals: [...state.contextuals, contextual] }));
        },
        addContextual: (contextual) => set((state) => ({ contextuals: [...state.contextuals, contextual] })),
        removeContextual: (id) => set((state) => ({ contextuals: state.contextuals.filter(c => c.id !== id) })),


        clearPanels: () => {
          set({
            contextuals: [],
          });
        },

        addClickNode: (stagingNode, params) => {
          const state = get();
          const point = getClientPoint(params.event);
          if (!state.reactFlowInstance || !point) {
            return;
          }

          const position = state.reactFlowInstance.screenToFlowPosition(point);

          set(
            validateState({
              ...state,
              nodes: state.nodes.concat({ ...stagingNode, position }),
            }),
          );

          set({ contextuals: [] });
        },

        addConnectContextualNode: (stagingNode, params) => {
          const state = get();
          if (!state.reactFlowInstance) {
            return;
          }

          const oldNodeSourceId = params.connection.source;
          const oldNodeSourceStreamId = handleToStream(params.connection.sourceHandle);
          const targetNodeSourceStreamId = handleToStream(
            params.connection.targetHandle,
          );
          const targetNodeSourceId = params.connection.target;

          if (!oldNodeSourceId || !targetNodeSourceId) {
            return;
          }

          const leftNodeDims = { width: 200, height: 100 };
          const rightNodeDims = { width: 200, height: 100 };

          const centerLeft = {
            x: params.leftNode.position.x + leftNodeDims.width / 2,
            y: params.leftNode.position.y + leftNodeDims.height / 2,
          };
          const centerRight = {
            x: params.rightNode.position.x + rightNodeDims.width / 2,
            y: params.rightNode.position.y + rightNodeDims.height / 2,
          };

          const position = {
            x: (centerLeft.x + centerRight.x) / 2,
            y: (centerLeft.y + centerRight.y) / 2,
          };

          const nextState = validateState({
            ...state,
            nodes: state.nodes.concat({ ...stagingNode, position }),
            edges: state.edges.concat(
              createVanillaTransformEdge(
                nodeIdBuilder(),
                oldNodeSourceId,
                oldNodeSourceStreamId,
                stagingNode.id,
                0,
              ),
              createVanillaTransformEdge(
                nodeIdBuilder(),
                stagingNode.id,
                0,
                targetNodeSourceId,
                targetNodeSourceStreamId,
              ),
            ),
          });

          set(nextState);
          set({ contextuals: [] });
        },

        addEdgeContextualNode: (stagingNode, params) => {
          const state = get();
          if (!state.reactFlowInstance) {
            return;
          }

          const leftNodeDims = { width: 200, height: 100 };
          const rightNodeDims = { width: 200, height: 100 };

          const centerLeft = {
            x: params.leftNode.position.x + leftNodeDims.width / 2,
            y: params.leftNode.position.y + leftNodeDims.height / 2,
          };
          const centerRight = {
            x: params.rightNode.position.x + rightNodeDims.width / 2,
            y: params.rightNode.position.y + rightNodeDims.height / 2,
          };

          const position = {
            x: (centerLeft.x + centerRight.x) / 2,
            y: (centerLeft.y + centerRight.y) / 2,
          };

          const nextState = validateState({
            ...state,
            nodes: state.nodes.concat({ ...stagingNode, position }),
            edges: state.edges
              .filter((edge) => edge.id !== params.edgeId)
              .concat(
                createVanillaTransformEdge(
                  nodeIdBuilder(),
                  params.leftNode.id,
                  params.leftStream,
                  stagingNode.id,
                  0,
                ),
                createVanillaTransformEdge(
                  nodeIdBuilder(),
                  stagingNode.id,
                  0,
                  params.rightNode.id,
                  params.rightStream,
                ),
              ),
          });

          set(nextState);
          set({ contextuals: [] });
        },

        addContextualNode: (stagingNode, params) => {
          const state = get();
          if (!state.reactFlowInstance) {
            return;
          }

          const connectionParams = params.connectionParams;
          if (!connectionParams.nodeId || !connectionParams.handleId) {
            return;
          }

          const oldNode = state.reactFlowInstance.getNode(connectionParams.nodeId);
          const point = getClientPoint(params.event);

          if (!oldNode || !point) {
            return;
          }

          const targetSubflowNode =
            "subflowNodeId" in params
              ? state.nodes.find((node) => node.id === params.subflowNodeId)
              : undefined;
          const flowPosition = state.reactFlowInstance.screenToFlowPosition(point);
          const position =
            targetSubflowNode && "subflowNodeId" in params
              ? {
                  x: flowPosition.x - targetSubflowNode.position.x,
                  y: flowPosition.y - targetSubflowNode.position.y,
                }
              : flowPosition;
          const nextStagingNode =
            targetSubflowNode && "subflowNodeId" in params
              ? {
                  ...stagingNode,
                  parentId: params.subflowNodeId,
                  extent: "parent" as const,
                }
              : stagingNode;

          if (connectionParams.handleType === "source") {
            const oldNodeSourceId = oldNode.id;
            const oldNodeSourceStreamId = handleToStream(connectionParams.handleId);

            const stagedState = {
              ...state,
              nodes: state.nodes.concat({ ...nextStagingNode, position }),
              edges: state.edges.concat(
                createVanillaTransformEdge(
                  nodeIdBuilder(),
                  oldNodeSourceId,
                  oldNodeSourceStreamId,
                  nextStagingNode.id,
                  0,
                ),
              ),
            };

            const integratedState = integrate(stagedState, {
              source: oldNodeSourceId,
              sourceHandle: connectionParams.handleId,
              target: nextStagingNode.id,
              targetHandle: "arg_0",
            });

            set(validateState(integratedState));
            set({ contextuals: [] });
            return;
          }

          if (connectionParams.handleType === "target") {
            const oldNodeTargetId = oldNode.id;
            const oldNodeTargetStreamId = handleToStream(connectionParams.handleId);

            const stagedState = {
              ...state,
              nodes: state.nodes.concat({ ...nextStagingNode, position }),
              edges: state.edges.concat(
                createVanillaTransformEdge(
                  nodeIdBuilder(),
                  nextStagingNode.id,
                  0,
                  oldNodeTargetId,
                  oldNodeTargetStreamId,
                ),
              ),
            };

            const integratedState = integrate(stagedState, {
              source: nextStagingNode.id,
              sourceHandle: "return_0",
              target: oldNodeTargetId,
              targetHandle: connectionParams.handleId,
            });

            set(validateState(integratedState));
            set({ contextuals: [] });
          }
        },

        setRelativeWrapperRef: (relativeWrapperRef) => set({ relativeWrapperRef }),

        getBoundNodes: () => get().nodes.filter((node) => hasBoundPort(node as FlowNode)),

        onPaneClick: (event) => {
          const nativeEvent = event.nativeEvent;
          const state = get();
          const append = nativeEvent.ctrlKey;
          const hasSameEventContextual = state.contextuals.some(
            (contextual) =>
              "event" in contextual && contextual.event.timeStamp === nativeEvent.timeStamp,
          );

          if (hasSameEventContextual) {
            return;
          }

          if (!append && state.contextuals.some((contextual) => contextual.kind === "click")) {
            state.clearPanels();
            return;
          }

          const reactFlowBounds = state.relativeWrapperRef?.current?.getBoundingClientRect();
          if (!state.reactFlowInstance || !reactFlowBounds) {
            return;
          }

          state.openContextual(
            {
              kind: "click",
              id: crypto.randomUUID(),
              event: nativeEvent,
              position: {
                x: nativeEvent.clientX - reactFlowBounds.left,
                y: nativeEvent.clientY - reactFlowBounds.top,
              },
            },
            append,
          );
        },

        onNodeClick: (event, node) => {
          const nativeEvent = event.nativeEvent;
          const state = get();
          const append = nativeEvent.ctrlKey;
          const reactFlowBounds = state.relativeWrapperRef?.current?.getBoundingClientRect();

          if (!state.reactFlowInstance || !reactFlowBounds || node.type !== "AgentSubFlowNode") {
            return;
          }

          const subflowNode = node as Node<AgentSubFlowNodeData, "AgentSubFlowNode">;

          if (
            !append &&
            state.contextuals.some(
              (contextual) => contextual.kind === "node" && contextual.nodeId === subflowNode.id,
            )
          ) {
            state.clearPanels();
            return;
          }


          state.openContextual(
            {
              kind: "node",
              id: crypto.randomUUID(),
              nodeId: subflowNode.id,
              subFlowNode: subflowNode,
              position: {
                x: nativeEvent.clientX - reactFlowBounds.left,
                y: nativeEvent.clientY - reactFlowBounds.top,
              },
            },
            append,
          );
        },

        onEdgeClick: (event, edge) => {
          const nativeEvent = event.nativeEvent;
          const state = get();
          const append = nativeEvent.ctrlKey;
          const hasSameEventContextual = state.contextuals.some(
            (contextual) =>
              "event" in contextual && contextual.event.timeStamp === nativeEvent.timeStamp,
          );

          if (hasSameEventContextual) {
            return;
          }

          if (
            !append &&
            state.contextuals.some(
              (contextual) => contextual.kind === "edge" && contextual.edgeId === edge.id,
            )
          ) {
            state.clearPanels();
            return;
          }

          const reactFlowBounds = state.relativeWrapperRef?.current?.getBoundingClientRect();
          if (!state.reactFlowInstance || !reactFlowBounds) {
            return;
          }

          const leftNode = state.reactFlowInstance.getNode(edge.source) as FlowNode | undefined;
          const rightNode = state.reactFlowInstance.getNode(edge.target) as FlowNode | undefined;

          if (!leftNode || !rightNode) {
            return;
          }

          state.openContextual(
            {
              kind: "edge",
              id: crypto.randomUUID(),
              edgeId: edge.id,
              event: nativeEvent,
              position: {
                x: nativeEvent.clientX - reactFlowBounds.left,
                y: nativeEvent.clientY - reactFlowBounds.top,
              },
              leftNode,
              leftStream: handleToStream(edge.sourceHandle),
              rightNode,
              rightStream: handleToStream(edge.targetHandle),
            },
            append,
          );
        },

        onConnect: (connection) => {
          const state = get();
          state.setConnectingStart(undefined);
          const append = state.connectAppend;
          state.setConnectAppend(false);

          if (
            istriviallyIntegratable(
              { nodes: state.nodes, edges: state.edges, globals: state.globals },
              connection,
            )
          ) {
            const integratedState = integrate(
              { nodes: state.nodes, edges: state.edges, globals: state.globals },
              connection,
            );

            state.replaceValidationResult(validateState(integratedState));
            return;
          }

          if (!state.reactFlowInstance) {
            return;
          }

          const leftNode = state.nodes.find((node) => node.id === connection.source);
          const rightNode = state.nodes.find((node) => node.id === connection.target);

          if (!leftNode || !rightNode) {
            return;
          }

          const reactFlowBounds = state.relativeWrapperRef?.current?.getBoundingClientRect();
          if (!reactFlowBounds) {
            return;
          }

          const screenPosition = state.reactFlowInstance.flowToScreenPosition(
            calculateMidpoint(leftNode.position, rightNode.position),
          );

          state.openContextual(
            {
              kind: "connect",
              id: crypto.randomUUID(),
              leftNode,
              rightNode,
              leftStream: handleToStream(connection.sourceHandle),
              rightStream: handleToStream(connection.targetHandle),
              connection,
              position: {
                x: screenPosition.x - reactFlowBounds.left,
                y: screenPosition.y - reactFlowBounds.top,
              },
            },
            append,
          );
        },

        onConnectStart: (event, params) => {
          set({
            connectingStart: params,
            connectAppend: "ctrlKey" in event ? Boolean(event.ctrlKey) : false,
          });
        },

        onConnectEnd: (event) => {
          const state = get();
          const target = event.target as HTMLElement;
          const targetEdgeId = target.dataset?.edgeid;
          const targetIsPane = target.classList.contains("react-flow__pane");
          const reactFlowBounds = state.relativeWrapperRef?.current?.getBoundingClientRect();
          const point = getClientPoint(event);

          const targetSubflowNode =
            state.reactFlowInstance && point
              ? state.nodes
                  .filter((node) => node.type === "AgentSubFlowNode")
                  .find((node) => {
                    const flowPoint = state.reactFlowInstance?.screenToFlowPosition(point);
                    const width = node.measured?.width ?? node.width ?? 0;
                    const height = node.measured?.height ?? node.height ?? 0;

                    if (!flowPoint || width <= 0 || height <= 0) {
                      return false;
                    }

                    return (
                      flowPoint.x >= node.position.x &&
                      flowPoint.x <= node.position.x + width &&
                      flowPoint.y >= node.position.y &&
                      flowPoint.y <= node.position.y + height
                    );
                  })
              : undefined;

          if (
            (targetIsPane || targetSubflowNode) &&
            state.reactFlowInstance &&
            state.connectingStart &&
            reactFlowBounds
          ) {
            const connectionParams = state.connectingStart;

            if (connectionParams.nodeId && connectionParams.handleId) {
              const node = state.reactFlowInstance.getNode(connectionParams.nodeId) as
                | FlowNode
                | undefined;

              if (!node || !point) {
                set({ connectAppend: false, connectingStart: undefined });
                return;
              }

              const position = {
                x: point.x - reactFlowBounds.left,
                y: point.y - reactFlowBounds.top,
              };

              const nodePosition = state.reactFlowInstance.flowToScreenPosition(node.position);

              let relativePosition: RelativePosition | null = null;

              if (nodePosition.x < position.x) {
                relativePosition = nodePosition.y < position.y ? "bottomright" : "topright";
              } else {
                relativePosition = nodePosition.y < position.y ? "bottomleft" : "topleft";
              }

              if (connectionParams.handleType && relativePosition) {
                state.openContextual(
                  targetSubflowNode
                    ? {
                        kind: "subflowdrop",
                        id: crypto.randomUUID(),
                        handleType: connectionParams.handleType,
                        causingNode: node,
                        causingStream: handleToStream(connectionParams.handleId),
                        connectionParams,
                        position,
                        relativePosition,
                        event,
                        subflowNodeId: targetSubflowNode.id,
                        subflowNode: targetSubflowNode as Node<AgentSubFlowNodeData, "AgentSubFlowNode">,
                      }
                    : {
                        kind: "drop",
                        id: crypto.randomUUID(),
                        handleType: connectionParams.handleType,
                        causingNode: node,
                        causingStream: handleToStream(connectionParams.handleId),
                        connectionParams,
                        position,
                        relativePosition,
                        event,
                      },
                );
              }
            }

            set({ connectAppend: false, connectingStart: undefined });
            return;
          }

          if (state.reactFlowInstance && state.connectingStart && targetEdgeId) {
            const connectionParams = state.connectingStart;

            if (!connectionParams.nodeId || !connectionParams.handleId) {
              set({ connectAppend: false, connectingStart: undefined });
              return;
            }

            const node = state.reactFlowInstance.getNode(connectionParams.nodeId) as
              | FlowNode
              | undefined;
            const edge = state.reactFlowInstance.getEdge(targetEdgeId);
            const clientPoint = getClientPoint(event);

            if (!node || !edge || !clientPoint) {
              set({ connectAppend: false, connectingStart: undefined });
              return;
            }

            if (connectionParams.handleType === "source") {
              const stagingSourceId = node.id;
              const stagingSourceStreamId = handleToStream(connectionParams.handleId);
              const oldEdgeSourceId = edge.source;
              const oldEdgeSourceHandle = edge.sourceHandle;
              const oldEdgeTargetId = edge.target;
              const oldEdgeTargetHandle = edge.targetHandle;
              const oldEdgeSourceStreamId = handleToStream(oldEdgeSourceHandle);
              const oldNode = state.reactFlowInstance.getNode(oldEdgeSourceId) as FlowNode | undefined;

              if (!oldNode) {
                set({ connectAppend: false, connectingStart: undefined });
                return;
              }

              const stagingOutstream = node.data.outs.at(stagingSourceStreamId);
              const oldOutstream = oldNode.data.outs.at(oldEdgeSourceStreamId);

              if (!stagingOutstream || !oldOutstream) {
                set({ connectAppend: false, connectingStart: undefined });
                return;
              }

              const zipNodeInstream =
                node.position.x < oldNode.position.x
                  ? [stagingOutstream, oldOutstream]
                  : [oldOutstream, stagingOutstream];

              const position = state.reactFlowInstance.screenToFlowPosition(clientPoint);

              const zipNode = reactiveFlowNode({
                title: "Zip",
                description: "Zips together two streams into one stream.",
                ins: zipNodeInstream,
                outs: [[...stagingOutstream, ...oldOutstream]],
                implementation: ReactiveImplementation.Zip,
                position,
              });

              const stagedState = {
                ...state,
                nodes: state.nodes.concat(zipNode),
                edges: state.edges
                  .filter((candidate) => candidate.id !== edge.id)
                  .concat(
                    createVanillaTransformEdge(
                      nodeIdBuilder(),
                      stagingSourceId,
                      stagingSourceStreamId,
                      zipNode.id,
                      node.position.x < oldNode.position.x ? 0 : 1,
                    ),
                    createVanillaTransformEdge(
                      nodeIdBuilder(),
                      oldEdgeSourceId,
                      oldEdgeSourceStreamId,
                      zipNode.id,
                      position.x < oldNode.position.x ? 1 : 0,
                    ),
                  ),
              };

              const integratedState = integrate(stagedState, {
                source: zipNode.id,
                sourceHandle: "return_0",
                target: oldEdgeTargetId,
                targetHandle: oldEdgeTargetHandle ?? null,
              });

              state.replaceValidationResult(validateState(integratedState));
            }
          }

          set({ connectAppend: false, connectingStart: undefined });
        },
      }),
      {
        limit: 100,
        partialize,
        handleSet: (handleSet) => {
          // zundo hands over its internal `_handleSet(pastState, replace,
          // currentState, deltaState)`; its declared type is `setState`.
          const record = handleSet as unknown as (
            pastState: TemporalEditFlowState,
            replace: Parameters<typeof handleSet>[1],
            currentState: TemporalEditFlowState,
            deltaState?: Partial<TemporalEditFlowState> | null,
          ) => void;
          return (pastState, replace, currentState, deltaState) => {
            if (suppressHistory) return;
            if (dragStartState) {
              // The drag just ended: record it as one step from where it began.
              const start = dragStartState;
              dragStartState = null;
              record(start, replace, currentState, deltaState);
              return;
            }
            // At runtime `pastState` is the partialized previous state.
            record(pastState as TemporalEditFlowState, replace, currentState, deltaState);
          };
        },
      },
    ),
  );
};
