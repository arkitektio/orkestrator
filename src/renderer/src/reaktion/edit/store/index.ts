import { FlowFragment, GlobalArgFragment } from "@/reaktion/api/graphql";
import {
  ClickContextualParams,
  ContextualParams,
  FlowEdge,
  FlowNode,
} from "@/reaktion/types";
import { integrate, istriviallyIntegratable } from "@/reaktion/validation/integrate";
import { FlowState, ValidationResult } from "@/reaktion/validation/types";
import { validateState } from "@/reaktion/validation/validate";
import { edges_to_flowedges, handleToStream, nodes_to_flownodes } from "@/reaktion/utils";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnectEnd,
  OnConnectStartParams,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { temporal } from "zundo";
import { createStore } from "zustand";
import * as graph from "./graph";
import {
  flowToScreen,
  getClientPoint,
  midpointBetween,
  relativePositionOf,
  screenToFlow,
  subflowAt,
  toWrapperPosition,
} from "./placement";
import { DerivedIndexes, deriveErrorIndexes, deriveIndexes, deriveNodeIndexes } from "./selectors";

export type { DerivedIndexes } from "./selectors";
export { EMPTY_ERRORS } from "./selectors";

/** The part of the state that undo/redo snapshots. */
export type TemporalEditFlowState = ValidationResult & DerivedIndexes;

export type UiState = {
  showEdgeLabels: boolean;
  showNodeErrors: boolean;
  contextuals: ContextualParams[];
  reactFlowInstance: ReactFlowInstance<FlowNode, FlowEdge> | null;
  relativeWrapperRef: RefObject<HTMLDivElement | null> | null;
  connectAppend: boolean;
  connectingStart?: OnConnectStartParams;
  /** True once the graph differs from the last loaded/saved flow. */
  dirty: boolean;
  /** Id of the `FlowFragment` the graph was last loaded from. */
  loadedFlowId: string | null;
  /** A newer flow arrived while the editor had unsaved edits. */
  incomingFlow: FlowFragment | null;
};

export type Reducer = (state: FlowState) => FlowState;

export type AddActionNodesArgs = {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  /** When set, the new edge is integrated (transforms inserted / edge cut). */
  connection?: Connection;
};

export type InsertBetweenArgs = {
  node: FlowNode;
  wrapper?: FlowNode;
  leftId: string;
  leftStream: number;
  rightId: string;
  rightStream: number;
  removeEdgeId?: string;
};

export interface EditFlowState extends TemporalEditFlowState, UiState {
  /** Runs a pure reducer + validation as ONE store write / undo step. */
  commit: (reducer: Reducer, ui?: Partial<UiState>) => void;

  // graph actions
  addNodes: (nodes: FlowNode[], edges?: FlowEdge[]) => void;
  addActionNodes: (args: AddActionNodesArgs) => void;
  insertBetween: (args: InsertBetweenArgs) => void;
  removeNodes: (ids: string[]) => void;
  removeEdge: (id: string) => void;
  updateData: (data: Partial<FlowNode["data"]>, id: string) => void;
  setGlobals: (globals: GlobalArgFragment[]) => void;
  removeGlobal: (key: string) => void;
  setAutoResolvable: (autoResolvable: boolean, id: string) => void;
  moveConstantToStream: (nodeId: string, key: string, streamIndex: number) => void;
  moveStreamToConstants: (nodeId: string, streamIndex: number, itemIndex: number) => void;
  moveConstantToGlobals: (nodeId: string, key: string, globalKey?: string) => void;
  moveOutStreamToVoid: (nodeId: string, streamIndex: number, itemIndex: number) => void;
  moveVoidToOutstream: (nodeId: string, key: string, streamIndex: number) => void;
  filterArgToConstant: (nodeId: string, streamIndex: number, itemIndex: number) => void;
  filterConstantToArg: (nodeId: string, key: string) => void;

  // resync
  loadFlow: (flow: FlowFragment) => void;
  /** After a successful save: adopt the returned flow, or just clear `dirty`. */
  markSaved: (flow?: FlowFragment | null) => void;
  setIncomingFlow: (flow: FlowFragment | null) => void;
  dismissIncoming: () => void;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onPaneClick: (event: ReactMouseEvent) => void;
  onNodeClick: (event: ReactMouseEvent, node: Node) => void;
  onEdgeClick: (event: ReactMouseEvent, edge: Edge) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: MouseEvent | TouchEvent, params: OnConnectStartParams) => void;
  onConnectEnd: OnConnectEnd;

  // ui
  setReactFlowInstance: (instance: ReactFlowInstance<FlowNode, FlowEdge> | null) => void;
  setRelativeWrapperRef: (ref: RefObject<HTMLDivElement | null>) => void;
  setShowEdgeLabels: (value: boolean) => void;
  setShowNodeErrors: (value: boolean) => void;
  toggleShowEdgeLabels: () => void;
  toggleShowNodeErrors: () => void;
  openContextual: (contextual: ContextualParams, append?: boolean) => void;
  removeContextual: (id: string) => void;
  clearPanels: () => void;
}

export const flowToState = (flow: FlowFragment): FlowState => ({
  nodes: nodes_to_flownodes(flow.graph?.nodes ?? []),
  edges: edges_to_flowedges(flow.graph?.edges ?? []),
  globals: flow.graph?.globals ?? [],
});

const validateAndIndex = (
  state: FlowState,
  carrySolved?: ValidationResult["solvedErrors"],
): TemporalEditFlowState => {
  const validated = validateState(state, { carrySolved });
  return { ...validated, ...deriveIndexes(validated.nodes, validated.remainingErrors) };
};

export const createInitialState = (input: FlowState | FlowFragment): TemporalEditFlowState =>
  validateAndIndex("nodes" in input ? input : flowToState(input));

const pickFlowState = (state: FlowState): FlowState => ({
  nodes: state.nodes,
  edges: state.edges,
  globals: state.globals,
});

/**
 * `integrate` throws when a handle has no stream behind it. That must never
 * abort a store write, so fall back to the staged graph: validation then
 * drops the offending edge as a solved error instead.
 */
const safeIntegrate = (state: FlowState, connection: Connection): ValidationResult => {
  try {
    return integrate(state, connection);
  } catch (error) {
    console.warn("[reaktion] could not integrate connection", connection, error);
    return { ...state, remainingErrors: [], solvedErrors: [], valid: true };
  }
};

const isStructuralNodeChange = (change: NodeChange) =>
  change.type === "remove" || change.type === "add" || change.type === "replace";

export const createEditFlowStore = (
  initial: TemporalEditFlowState | FlowState | FlowFragment,
  options: { flowId?: string | null } = {},
) => {
  const initialState: TemporalEditFlowState =
    "remainingErrors" in initial && "nodeById" in initial
      ? (initial as TemporalEditFlowState)
      : createInitialState(initial as FlowState | FlowFragment);

  // Undo history and node drags: React Flow replaces `nodes` on every pointer
  // move of a drag. Recording each of those as an undo step pushed ~60
  // snapshots per drag into the 100-entry history and evicted real edits. The
  // intermediate ticks are skipped and the drag is committed as ONE step
  // (from the pre-drag state) when the final `dragging: false` change lands.
  // Selection / dimension changes are never history entries.
  let suppressHistory = false;
  let dragStartState: TemporalEditFlowState | null = null;

  const partialize = (state: EditFlowState): TemporalEditFlowState => ({
    nodes: state.nodes,
    edges: state.edges,
    globals: state.globals,
    remainingErrors: state.remainingErrors,
    solvedErrors: state.solvedErrors,
    valid: state.valid,
    nodeById: state.nodeById,
    errorsByNodeId: state.errorsByNodeId,
    errorsByEdgeId: state.errorsByEdgeId,
    childCountByParent: state.childCountByParent,
  });

  const store = createStore<EditFlowState>()(
    temporal(
      (set, get) => {
        const setNodesOnly = (nodes: FlowNode[], history: boolean) => {
          suppressHistory = !history;
          try {
            set({ nodes, ...deriveNodeIndexes(nodes) });
          } finally {
            suppressHistory = false;
          }
        };

        const commit: EditFlowState["commit"] = (reducer, ui) => {
          set((state) => {
            const before = pickFlowState(state);
            const after = reducer(before);
            if (after === before && !ui) return state;
            const next = after === before ? {} : { ...validateAndIndex(after), dirty: true };
            return { ...next, ...ui };
          });
        };

        const replaceGraph = (
          next: FlowState,
          carrySolved: ValidationResult["solvedErrors"] | undefined,
          ui?: Partial<UiState>,
        ) => {
          set({ ...validateAndIndex(next, carrySolved), dirty: true, ...ui });
        };

        const load = (flow: FlowFragment, ui: Partial<UiState>) => {
          set({
            ...createInitialState(flow),
            dirty: false,
            loadedFlowId: flow.id,
            incomingFlow: null,
            ...ui,
          });
          store.temporal.getState().clear();
        };

        const wrapperRect = () => get().relativeWrapperRef?.current?.getBoundingClientRect();

        return {
          ...initialState,
          showEdgeLabels: false,
          showNodeErrors: true,
          contextuals: [],
          reactFlowInstance: null,
          relativeWrapperRef: null,
          connectAppend: false,
          connectingStart: undefined,
          dirty: false,
          loadedFlowId: options.flowId ?? ("id" in initial ? (initial as FlowFragment).id : null),
          incomingFlow: null,

          commit,

          // ------------------------------------------------------------ graph
          addNodes: (nodes, edges) =>
            commit((s) => graph.addNodes(s, nodes, edges), { contextuals: [] }),

          addActionNodes: ({ nodes, edges = [], connection }) => {
            set((state) => {
              const staged = graph.addNodes(pickFlowState(state), nodes, edges);
              if (!connection) {
                return { ...validateAndIndex(staged), dirty: true, contextuals: [] };
              }
              const integrated = safeIntegrate(staged, connection);
              return {
                ...validateAndIndex(pickFlowState(integrated), integrated.solvedErrors),
                dirty: true,
                contextuals: [],
              };
            });
          },

          insertBetween: (args) =>
            commit((s) => graph.insertNodeBetween(s, args), { contextuals: [] }),

          removeNodes: (ids) => commit((s) => graph.removeNodes(s, ids)),
          removeEdge: (id) => commit((s) => graph.removeEdge(s, id)),
          updateData: (data, id) => commit((s) => graph.updateNodeData(s, id, data)),
          setGlobals: (globals) => commit((s) => graph.setGlobals(s, globals)),
          removeGlobal: (key) => commit((s) => graph.removeGlobal(s, key)),
          setAutoResolvable: (value, id) => commit((s) => graph.setAutoResolvable(s, id, value)),
          moveConstantToStream: (nodeId, key, streamIndex) =>
            commit((s) => graph.moveConstantToStream(s, nodeId, key, streamIndex)),
          moveStreamToConstants: (nodeId, streamIndex, itemIndex) =>
            commit((s) => graph.moveStreamToConstants(s, nodeId, streamIndex, itemIndex)),
          moveConstantToGlobals: (nodeId, key, globalKey) =>
            commit((s) => graph.moveConstantToGlobals(s, nodeId, key, globalKey)),
          moveOutStreamToVoid: (nodeId, streamIndex, itemIndex) =>
            commit((s) => graph.moveOutStreamToVoid(s, nodeId, streamIndex, itemIndex)),
          moveVoidToOutstream: (nodeId, key, streamIndex) =>
            commit((s) => graph.moveVoidToOutstream(s, nodeId, key, streamIndex)),
          filterArgToConstant: (nodeId, streamIndex, itemIndex) =>
            commit((s) => graph.filterArgToConstant(s, nodeId, streamIndex, itemIndex)),
          filterConstantToArg: (nodeId, key) =>
            commit((s) => graph.filterConstantToArg(s, nodeId, key)),

          // ----------------------------------------------------------- resync
          loadFlow: (flow) => load(flow, { contextuals: [] }),
          markSaved: (flow) => (flow ? load(flow, {}) : set({ dirty: false })),
          setIncomingFlow: (incomingFlow) => set({ incomingFlow }),
          dismissIncoming: () => set({ incomingFlow: null }),

          // ------------------------------------------------- React Flow hooks
          onNodesChange: (changes) => {
            const state = get();
            const removedIds = changes
              .filter((c): c is Extract<NodeChange, { type: "remove" }> => c.type === "remove")
              .map((c) => c.id);
            const structural = changes.some(isStructuralNodeChange);

            if (structural) {
              // Removals go through the reducer (it prunes edges, children and
              // orphaned globals); any other structural change is applied on top.
              commit((s) => {
                const pruned = removedIds.length ? graph.removeNodes(s, removedIds) : s;
                const rest = changes.filter((c) => c.type !== "remove");
                if (rest.length === 0) return pruned;
                return { ...pruned, nodes: applyNodeChanges(rest, pruned.nodes) as FlowNode[] };
              });
              return;
            }

            const nextNodes = applyNodeChanges(changes, state.nodes) as FlowNode[];
            const drag = changes.find(
              (c): c is Extract<NodeChange, { type: "position" }> => c.type === "position",
            );
            if (drag?.dragging) {
              if (!dragStartState) dragStartState = partialize(state);
              setNodesOnly(nextNodes, false);
              return;
            }
            const isPositionCommit = changes.some((c) => c.type === "position");
            setNodesOnly(nextNodes, isPositionCommit);
          },

          onEdgesChange: (changes) => {
            const state = get();
            const structural = changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace");
            const edges = applyEdgeChanges(changes, state.edges) as FlowEdge[];
            if (structural) {
              commit((s) => ({ ...s, edges }));
              return;
            }
            suppressHistory = true;
            try {
              set({ edges });
            } finally {
              suppressHistory = false;
            }
          },

          onPaneClick: (event) => {
            const nativeEvent = event.nativeEvent;
            const state = get();
            const append = nativeEvent.ctrlKey;

            if (!append && state.contextuals.some((c) => c.kind === "click")) {
              state.clearPanels();
              return;
            }

            const rect = wrapperRect();
            const client = { x: nativeEvent.clientX, y: nativeEvent.clientY };
            const flowPosition = screenToFlow(state.reactFlowInstance, client);
            if (!rect || !flowPosition) return;

            state.openContextual(
              {
                kind: "click",
                id: crypto.randomUUID(),
                position: toWrapperPosition(rect, client),
                flowPosition,
              } satisfies ContextualParams & ClickContextualParams,
              append,
            );
          },

          onNodeClick: (event, node) => {
            if (node.type !== "AgentSubFlowNode") return;
            const nativeEvent = event.nativeEvent;
            const state = get();
            const append = nativeEvent.ctrlKey;
            const rect = wrapperRect();
            if (!rect) return;

            if (
              !append &&
              state.contextuals.some((c) => c.kind === "node" && c.nodeId === node.id)
            ) {
              state.clearPanels();
              return;
            }

            state.openContextual(
              {
                kind: "node",
                id: crypto.randomUUID(),
                nodeId: node.id,
                position: toWrapperPosition(rect, { x: nativeEvent.clientX, y: nativeEvent.clientY }),
              },
              append,
            );
          },

          onEdgeClick: (event, edge) => {
            const nativeEvent = event.nativeEvent;
            const state = get();
            const append = nativeEvent.ctrlKey;

            if (
              !append &&
              state.contextuals.some((c) => c.kind === "edge" && c.edgeId === edge.id)
            ) {
              state.clearPanels();
              return;
            }

            const rect = wrapperRect();
            if (!rect) return;
            if (!state.nodeById.has(edge.source) || !state.nodeById.has(edge.target)) return;

            state.openContextual(
              {
                kind: "edge",
                id: crypto.randomUUID(),
                edgeId: edge.id,
                position: toWrapperPosition(rect, { x: nativeEvent.clientX, y: nativeEvent.clientY }),
                leftNodeId: edge.source,
                leftStream: handleToStream(edge.sourceHandle),
                rightNodeId: edge.target,
                rightStream: handleToStream(edge.targetHandle),
              },
              append,
            );
          },

          onConnect: (connection) => {
            const state = get();
            const append = state.connectAppend;
            const flow = pickFlowState(state);

            if (istriviallyIntegratable(flow, connection)) {
              const integrated = safeIntegrate(flow, connection);
              replaceGraph(pickFlowState(integrated), integrated.solvedErrors, {
                connectingStart: undefined,
                connectAppend: false,
              });
              return;
            }

            set({ connectingStart: undefined, connectAppend: false });

            const left = connection.source ? state.nodeById.get(connection.source) : undefined;
            const right = connection.target ? state.nodeById.get(connection.target) : undefined;
            const rect = wrapperRect();
            if (!left || !right || !rect) return;

            const screen = flowToScreen(state.reactFlowInstance, midpointBetween(left, right));
            if (!screen) return;

            state.openContextual(
              {
                kind: "connect",
                id: crypto.randomUUID(),
                connection,
                leftNodeId: left.id,
                leftStream: handleToStream(connection.sourceHandle),
                rightNodeId: right.id,
                rightStream: handleToStream(connection.targetHandle),
                position: toWrapperPosition(rect, screen),
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
            const reset = { connectAppend: false, connectingStart: undefined };
            const connecting = state.connectingStart;
            const target = event.target as HTMLElement | null;
            const client = getClientPoint(event);
            const rect = wrapperRect();

            if (!connecting?.nodeId || !connecting.handleId || !connecting.handleType || !client || !rect) {
              set(reset);
              return;
            }

            const node = state.nodeById.get(connecting.nodeId);
            const flowPosition = screenToFlow(state.reactFlowInstance, client);
            if (!node || !flowPosition) {
              set(reset);
              return;
            }

            const targetEdgeId = target?.dataset?.edgeid;
            const targetIsPane = !!target?.classList?.contains("react-flow__pane");
            const subflow = subflowAt(state.nodes, flowPosition);

            // Dropped onto an existing edge label: merge both streams with a Zip.
            if (targetEdgeId && connecting.handleType === "source") {
              const zipped = graph.zipIntoEdge(pickFlowState(state), {
                nodeId: node.id,
                streamIndex: handleToStream(connecting.handleId),
                edgeId: targetEdgeId,
                position: flowPosition,
              });
              if (zipped) {
                const integrated = safeIntegrate(zipped.state, zipped.connection);
                replaceGraph(pickFlowState(integrated), integrated.solvedErrors, reset);
                return;
              }
              set(reset);
              return;
            }

            if (!targetIsPane && !subflow) {
              set(reset);
              return;
            }

            const nodeScreen = flowToScreen(state.reactFlowInstance, node.position) ?? client;
            const base = {
              id: crypto.randomUUID(),
              handleType: connecting.handleType,
              causingNodeId: node.id,
              causingStream: handleToStream(connecting.handleId),
              position: toWrapperPosition(rect, client),
              flowPosition,
              relativePosition: relativePositionOf(nodeScreen, client),
            };

            state.openContextual(
              subflow
                ? { kind: "subflowdrop", ...base, subflowNodeId: subflow.id }
                : { kind: "drop", ...base },
              state.connectAppend,
            );
            set(reset);
          },

          // --------------------------------------------------------------- ui
          setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
          setRelativeWrapperRef: (relativeWrapperRef) => set({ relativeWrapperRef }),
          setShowEdgeLabels: (showEdgeLabels) => set({ showEdgeLabels }),
          setShowNodeErrors: (showNodeErrors) => set({ showNodeErrors }),
          toggleShowEdgeLabels: () => set((s) => ({ showEdgeLabels: !s.showEdgeLabels })),
          toggleShowNodeErrors: () => set((s) => ({ showNodeErrors: !s.showNodeErrors })),
          openContextual: (contextual, append = false) =>
            set((s) => ({ contextuals: append ? [...s.contextuals, contextual] : [contextual] })),
          removeContextual: (id) =>
            set((s) => ({ contextuals: s.contextuals.filter((c) => c.id !== id) })),
          clearPanels: () => set({ contextuals: [] }),
        };
      },
      {
        limit: 100,
        partialize,
        equality: (past, current) =>
          past.nodes === current.nodes &&
          past.edges === current.edges &&
          past.globals === current.globals,
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
            record(pastState as TemporalEditFlowState, replace, currentState, deltaState);
          };
        },
      },
    ),
  );

  return store;
};

export type EditFlowStore = ReturnType<typeof createEditFlowStore>;

// Re-exported for callers that only need the derived error index helpers.
export { deriveErrorIndexes };
