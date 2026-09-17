// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { FlowFragment } from "@/reaktion/api/graphql";
import {
  argsNode,
  intPort,
  linearGraph,
  makeEdge,
  makeNode,
  returnsNode,
} from "@/reaktion/validation/fixtures";
import type { FlowNode } from "../../types";
import { createEditFlowStore } from "./index";

const node = {
  id: "a",
  type: "ReactiveNode",
  position: { x: 0, y: 0 },
  data: { ins: [], outs: [], constants: [], voids: [] },
} as unknown as FlowNode;

const makeStore = () => createEditFlowStore({ nodes: [node], edges: [], globals: [] });

const flowFragment = (id: string, graph = linearGraph()): FlowFragment =>
  ({
    __typename: "Flow",
    id,
    title: id,
    description: "",
    createdAt: "",
    workspace: { id: "w" },
    graph: {
      nodes: graph.nodes.map((n) => ({
        __typename: n.type,
        id: n.id,
        position: n.position,
        parentNode: n.parentId ?? null,
        ...n.data,
      })),
      edges: graph.edges.map((e) => ({
        __typename: "VanillaEdge",
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
        ...e.data,
      })),
      globals: [],
    },
  }) as unknown as FlowFragment;

describe("edit flow store undo history during node drags", () => {
  it("records a whole drag as a single undo step from the pre-drag position", () => {
    const store = makeStore();

    for (let i = 1; i <= 5; i++) {
      store
        .getState()
        .onNodesChange([{ type: "position", id: "a", position: { x: i, y: 0 }, dragging: true }]);
    }
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.getState().nodes[0].position).toEqual({ x: 5, y: 0 });

    store
      .getState()
      .onNodesChange([{ type: "position", id: "a", position: { x: 6, y: 0 }, dragging: false }]);

    const past = store.temporal.getState().pastStates;
    expect(past).toHaveLength(1);
    expect(past[0].nodes[0].position).toEqual({ x: 0, y: 0 });

    store.temporal.getState().undo();
    expect(store.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("still records non-drag position changes", () => {
    const store = makeStore();
    store
      .getState()
      .onNodesChange([{ type: "position", id: "a", position: { x: 3, y: 3 }, dragging: false }]);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("flags the graph dirty when a node is moved", () => {
    const store = makeStore();
    expect(store.getState().dirty).toBe(false);
    store
      .getState()
      .onNodesChange([{ type: "position", id: "a", position: { x: 3, y: 3 }, dragging: false }]);
    expect(store.getState().dirty).toBe(true);
  });

  it("does not flag the graph dirty on selection or measurement", () => {
    const store = makeStore();
    store.getState().onNodesChange([{ type: "select", id: "a", selected: true }]);
    store
      .getState()
      .onNodesChange([{ type: "dimensions", id: "a", dimensions: { width: 10, height: 10 } }]);
    expect(store.getState().dirty).toBe(false);
  });

  it("does not record selection changes", () => {
    const store = makeStore();
    store.getState().onNodesChange([{ type: "select", id: "a", selected: true }]);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.getState().nodes[0].selected).toBe(true);
  });
});

describe("commits", () => {
  it("adds wrapper + child + edge and integrates as ONE write and ONE undo step", () => {
    const g = linearGraph();
    const store = createEditFlowStore(g);
    let writes = 0;
    store.subscribe(() => writes++);

    const child = makeNode("child", { position: { x: 24, y: 72 }, parentId: "wrap" });
    const wrapper = makeNode("wrap", { type: "AgentSubFlowNode", ins: [], outs: [], data: { appFilter: "app" } });

    store.getState().addActionNodes({
      nodes: [wrapper, child],
      connection: { source: "mid", sourceHandle: "return_0", target: "child", targetHandle: "arg_0" },
    });

    expect(writes).toBe(1);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    expect(store.getState().nodes.map((n) => n.id)).toEqual(["args", "mid", "returns", "wrap", "child"]);
    expect(store.getState().edges.some((e) => e.target === "wrap")).toBe(false);
    expect(store.getState().dirty).toBe(true);
    expect(store.getState().contextuals).toEqual([]);
  });

  it("wires the new node exactly once", () => {
    const store = createEditFlowStore(linearGraph());
    const child = makeNode("child", { position: { x: 24, y: 72 }, parentId: "wrap" });
    const wrapper = makeNode("wrap", { type: "AgentSubFlowNode", ins: [], outs: [], data: { appFilter: "app" } });

    store.getState().addActionNodes({
      nodes: [wrapper, child],
      connection: { source: "mid", sourceHandle: "return_0", target: "child", targetHandle: "arg_0" },
    });

    expect(store.getState().edges.filter((e) => e.target === "child")).toHaveLength(1);
  });

  it("is a no-op write when the reducer returns the same state", () => {
    const store = createEditFlowStore(linearGraph());
    store.getState().updateData({ title: "mid" }, "mid");
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.getState().dirty).toBe(false);
  });

  it("removing a node prunes its edges and validates once", () => {
    const store = createEditFlowStore(linearGraph());
    store.getState().onNodesChange([{ type: "remove", id: "mid" }]);
    expect(store.getState().nodes.map((n) => n.id)).toEqual(["args", "returns"]);
    expect(store.getState().edges).toEqual([]);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("exposes per-node error and child-count indexes", () => {
    const g = linearGraph();
    const store = createEditFlowStore({ ...g, nodes: [...g.nodes, makeNode("lonely", { parentId: "mid" })] });
    expect(store.getState().errorsByNodeId.get("lonely")?.length).toBe(1);
    expect(store.getState().childCountByParent.get("mid")).toBe(1);
    expect(store.getState().nodeById.get("lonely")?.id).toBe("lonely");
  });
});

describe("resync", () => {
  it("loadFlow replaces the graph, clears history and dirty", () => {
    const store = createEditFlowStore(flowFragment("v1"));
    expect(store.getState().loadedFlowId).toBe("v1");
    store.getState().updateData({ title: "changed" }, "mid");
    expect(store.getState().dirty).toBe(true);
    expect(store.temporal.getState().pastStates).toHaveLength(1);

    const v2 = flowFragment("v2", {
      nodes: [argsNode(), makeNode("other"), returnsNode()],
      edges: [makeEdge("e1", "args", "other"), makeEdge("e2", "other", "returns")],
      globals: [],
    });
    store.getState().loadFlow(v2);
    expect(store.getState().loadedFlowId).toBe("v2");
    expect(store.getState().dirty).toBe(false);
    expect(store.getState().nodes.map((n) => n.id)).toContain("other");
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("markSaved adopts the saved flow id and clears dirty", () => {
    const store = createEditFlowStore(flowFragment("v1"));
    store.getState().updateData({ title: "changed" }, "mid");
    store.getState().markSaved(flowFragment("v2"));
    expect(store.getState().loadedFlowId).toBe("v2");
    expect(store.getState().dirty).toBe(false);
  });

  it("keeps an incoming flow aside while dirty", () => {
    const store = createEditFlowStore(flowFragment("v1"));
    store.getState().updateData({ title: "changed" }, "mid");
    store.getState().setIncomingFlow(flowFragment("v2"));
    expect(store.getState().incomingFlow?.id).toBe("v2");
    expect(store.getState().loadedFlowId).toBe("v1");
    store.getState().dismissIncoming();
    expect(store.getState().incomingFlow).toBeNull();
  });

  it("constants are validated with the loaded flow", () => {
    const g = linearGraph();
    const bad = makeNode("mid", { constants: [intPort("n")], constantsMap: { n: "x" } });
    const store = createEditFlowStore(flowFragment("v1", { ...g, nodes: [g.nodes[0], bad, g.nodes[2]] }));
    expect(store.getState().valid).toBe(false);
  });
});
