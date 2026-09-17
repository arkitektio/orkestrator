// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GraphNodeKind } from "@/reaktion/api/graphql";
import { intPort, linearGraph, makeEdge, makeNode } from "@/reaktion/validation/fixtures";
import * as graph from "./graph";

const filterNode = () =>
  makeNode("f", {
    type: "RekuestFilterActionNode",
    kind: GraphNodeKind.RekuestFilter,
    ins: [[intPort("a"), intPort("b")]],
    outs: [
      [intPort("a"), intPort("b")],
      [intPort("a"), intPort("b")],
    ],
    constants: [],
    constantsMap: {},
  });

describe("graph reducers", () => {
  it("wrapInSubflow parents the child relative to the wrapper", () => {
    const child = makeNode("c", { position: { x: 500, y: 500 } });
    const { parent, child: wrapped } = graph.wrapInSubflow(child, {
      appFilter: "app",
      position: { x: 100, y: 100 },
    });
    expect(parent.type).toBe("AgentSubFlowNode");
    expect((parent.data as { appFilter?: string }).appFilter).toBe("app");
    expect(parent.position).toEqual({ x: 100, y: 100 });
    expect(wrapped.parentId).toBe(parent.id);
    expect(wrapped.extent).toBe("parent");
    expect(wrapped.position).toEqual(graph.AGENT_SUBFLOW_CHILD_OFFSET);
    // input untouched
    expect(child.parentId).toBeUndefined();
  });

  it("moveConstantToStream addresses by key and deletes map entries", () => {
    const g = linearGraph();
    const mid = makeNode("mid", {
      constants: [intPort("k", { default: 3 })],
      constantsMap: { k: 3 },
      globalsMap: { k: "k" },
    });
    const state = { ...g, nodes: [g.nodes[0], mid, g.nodes[2]] };
    const next = graph.moveConstantToStream(state, "mid", "k", 0);
    const after = next.nodes[1];
    expect(after.data.ins[0].map((p) => p.key)).toEqual(["x", "k"]);
    expect(after.data.constants).toEqual([]);
    expect("k" in (after.data.constantsMap ?? {})).toBe(false);
    expect("k" in (after.data.globalsMap ?? {})).toBe(false);
    // incoming edge labels are re-derived
    expect(next.edges[0].data?.stream?.map((s) => s.label)).toEqual(["x", "k"]);
    expect(graph.moveConstantToStream(state, "mid", "missing", 0)).toBe(state);
  });

  it("moveStreamToConstants and back round-trips", () => {
    const g = linearGraph();
    const toConst = graph.moveStreamToConstants(g, "mid", 0, 0);
    expect(toConst.nodes[1].data.ins[0]).toEqual([]);
    expect(toConst.nodes[1].data.constants.map((c) => c.key)).toEqual(["x"]);
    const back = graph.moveConstantToStream(toConst, "mid", "x", 0);
    expect(back.nodes[1].data.ins[0].map((p) => p.key)).toEqual(["x"]);
  });

  it("filterArgToConstant / filterConstantToArg keep outs in sync", () => {
    const state = { nodes: [filterNode()], edges: [], globals: [] };
    const toConst = graph.filterArgToConstant(state, "f", 0, 0);
    const f1 = toConst.nodes[0];
    expect(f1.data.ins[0].map((p) => p.key)).toEqual(["b"]);
    expect(f1.data.constants.map((p) => p.key)).toEqual(["a"]);
    expect(f1.data.outs.map((s) => s.map((p) => p.key))).toEqual([["b"], ["b"]]);
    expect(f1.data.voids.map((p) => p.key)).toEqual(["a", "a"]);

    const back = graph.filterConstantToArg(toConst, "f", "a");
    const f2 = back.nodes[0];
    expect(f2.data.ins[0].map((p) => p.key)).toEqual(["b", "a"]);
    expect(f2.data.constants).toEqual([]);
    expect(f2.data.outs.map((s) => s.map((p) => p.key))).toEqual([["b", "a"], ["b", "a"]]);
    expect(f2.data.voids).toEqual([]);
  });

  it("moveConstantToGlobals creates the global and removeGlobal restores the default", () => {
    const g = linearGraph();
    const mid = makeNode("mid", { constants: [intPort("k", { default: 7 })], constantsMap: { k: 7 } });
    const state = { ...g, nodes: [g.nodes[0], mid, g.nodes[2]] };
    const globalised = graph.moveConstantToGlobals(state, "mid", "k");
    expect(globalised.globals.map((x) => x.key)).toEqual(["k"]);
    expect(globalised.nodes[1].data.globalsMap).toEqual({ k: "k" });
    expect("k" in (globalised.nodes[1].data.constantsMap ?? {})).toBe(false);

    const restored = graph.removeGlobal(globalised, "k");
    expect(restored.globals).toEqual([]);
    expect(restored.nodes[1].data.globalsMap).toEqual({});
    expect(restored.nodes[1].data.constantsMap).toEqual({ k: 7 });
  });

  it("removeNodes prunes edges, children and orphaned globals", () => {
    const g = linearGraph();
    const wrap = makeNode("wrap", { type: "AgentSubFlowNode", ins: [], outs: [] });
    const child = makeNode("child", { parentId: "wrap", constants: [intPort("k")], globalsMap: { k: "k" } });
    const state = {
      nodes: [...g.nodes, wrap, child],
      edges: [...g.edges, makeEdge("e3", "mid", "child")],
      globals: [{ key: "k", port: intPort("k") } as never],
    };
    const next = graph.removeNodes(state, ["wrap"]);
    expect(next.nodes.map((n) => n.id)).toEqual(["args", "mid", "returns"]);
    expect(next.edges.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(next.globals).toEqual([]);
  });

  it("updateNodeData is a no-op for equal patches", () => {
    const g = linearGraph();
    expect(graph.updateNodeData(g, "mid", { constantsMap: {} })).toBe(g);
    expect(graph.updateNodeData(g, "mid", { title: "mid" })).toBe(g);
    expect(graph.updateNodeData(g, "mid", { title: "new" })).not.toBe(g);
  });

  it("insertNodeBetween wires two fresh edges and removes the replaced one", () => {
    const g = linearGraph();
    const between = makeNode("t");
    const next = graph.insertNodeBetween(g, {
      node: between,
      leftId: "args",
      leftStream: 0,
      rightId: "mid",
      rightStream: 0,
      removeEdgeId: "e1",
    });
    expect(next.nodes.map((n) => n.id)).toEqual(["args", "mid", "returns", "t"]);
    const pairs = next.edges.map((e) => [e.source, e.target]);
    expect(pairs).toContainEqual(["args", "t"]);
    expect(pairs).toContainEqual(["t", "mid"]);
    expect(next.edges.some((e) => e.id === "e1")).toBe(false);
  });

  it("zipIntoEdge stages a zip node and the connection to integrate", () => {
    const g = linearGraph();
    const other = makeNode("other", { position: { x: -100, y: 0 } });
    const state = { ...g, nodes: [...g.nodes, other] };
    const zipped = graph.zipIntoEdge(state, {
      nodeId: "other",
      streamIndex: 0,
      edgeId: "e2",
      position: { x: 10, y: 10 },
    });
    expect(zipped).not.toBeNull();
    expect(zipped!.state.edges.some((e) => e.id === "e2")).toBe(false);
    expect(zipped!.connection.target).toBe("returns");
    const zip = zipped!.state.nodes.at(-1)!;
    expect(zip.data.ins).toHaveLength(2);
    expect(zip.data.outs[0].map((p) => p.key)).toEqual(["x", "x"]);
  });
});
