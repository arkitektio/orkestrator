// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PortKind } from "@/fluss/api/graphql";
import {
  argsNode,
  intPort,
  linearGraph,
  makeEdge,
  makeNode,
  returnsNode,
  stringPort,
  subflowNode,
} from "./fixtures";
import { validateState } from "./validate";

describe("validateState purity", () => {
  it("does not mutate its input and returns fresh error arrays", () => {
    const input = linearGraph();
    const snapshot = JSON.stringify(input);
    const first = validateState(input);
    const second = validateState(input);

    expect(JSON.stringify(input)).toBe(snapshot);
    expect(first.remainingErrors).not.toBe(second.remainingErrors);
    expect(first.solvedErrors).not.toBe(second.solvedErrors);
    expect(first.remainingErrors).toEqual([]);
    expect(first.valid).toBe(true);
  });

  it("does not accumulate solved errors across runs", () => {
    const g = linearGraph();
    // a dangling edge is solved (removed) on every run
    const withDangling = { ...g, edges: [...g.edges, makeEdge("bad", "mid", "ghost")] };
    const a = validateState(withDangling);
    const b = validateState(withDangling);
    expect(a.solvedErrors).toHaveLength(1);
    expect(b.solvedErrors).toHaveLength(1);
  });

  it("keeps node and edge identity when nothing is dropped", () => {
    const g = linearGraph();
    const result = validateState(g);
    expect(result.nodes).toBe(g.nodes);
    expect(result.edges).toBe(g.edges);
  });

  it("preserves edge order when an edge is dropped", () => {
    const g = linearGraph();
    const edges = [
      makeEdge("e2", "mid", "returns"),
      makeEdge("bad", "mid", "ghost"),
      makeEdge("e1", "args", "mid"),
    ];
    const result = validateState({ ...g, edges });
    expect(result.edges.map((e) => e.id)).toEqual(["e2", "e1"]);
  });
});

describe("validators reach remainingErrors", () => {
  it("reports duplicate agent subflows (was silently discarded before)", () => {
    const g = linearGraph();
    const result = validateState({
      ...g,
      nodes: [...g.nodes, subflowNode("s1", "app"), subflowNode("s2", "app")],
    });
    const ids = result.remainingErrors.filter((e) => e.type === "node").map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["s1", "s2"]));
  });

  it("reports memory structures across subflows", () => {
    const mem = intPort("m", { kind: PortKind.MemoryStructure });
    const a = makeNode("a", { parentId: "s1", outs: [[mem]], ins: [[intPort("x")]] });
    const b = makeNode("b", { parentId: "s2", ins: [[mem]], outs: [[intPort("x")]] });
    const nodes = [argsNode(), subflowNode("s1", "app1"), subflowNode("s2", "app2"), a, b, returnsNode()];
    const edges = [
      makeEdge("e1", "args", "a"),
      makeEdge("e2", "a", "b"),
      makeEdge("e3", "b", "returns"),
    ];
    const result = validateState({ nodes, edges, globals: [] });
    expect(result.remainingErrors.some((e) => e.type === "edge" && e.id === "e2")).toBe(true);
  });

  it("flags unconnected nodes and subgraphs", () => {
    const g = linearGraph();
    const result = validateState({ ...g, nodes: [...g.nodes, makeNode("lonely")] });
    expect(result.remainingErrors.some((e) => e.type === "node" && e.id === "lonely")).toBe(true);
    expect(result.remainingErrors.some((e) => e.type === "graph")).toBe(true);
    expect(result.valid).toBe(false);
  });
});

describe("robustness", () => {
  it("does not throw on an empty graph", () => {
    const result = validateState({ nodes: [], edges: [], globals: [] });
    expect(result.remainingErrors.length).toBeGreaterThan(0);
  });

  it("does not throw on a subflow-only graph with an edge into the wrapper", () => {
    const nodes = [subflowNode("s1")];
    const edges = [makeEdge("e", "s1", "s1")];
    expect(() => validateState({ nodes, edges, globals: [] })).not.toThrow();
  });

  it("prunes edges whose endpoint node is gone", () => {
    const g = linearGraph();
    const result = validateState({ ...g, edges: [...g.edges, makeEdge("bad", "mid", "ghost")] });
    expect(result.edges.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(result.solvedErrors[0]).toMatchObject({ id: "bad", type: "edge" });
  });

  it("drops mismatched port edges as solved errors", () => {
    const nodes = [argsNode("args", [[stringPort("s")]]), makeNode("mid"), returnsNode()];
    const edges = [makeEdge("e1", "args", "mid"), makeEdge("e2", "mid", "returns")];
    const result = validateState({ nodes, edges, globals: [] });
    expect(result.edges.map((e) => e.id)).toEqual(["e2"]);
    expect(result.solvedErrors.some((e) => e.id === "e1" && e.message === "Port Kind mismatch")).toBe(true);
  });

  it("keeps only the first edge into the returns node", () => {
    const nodes = [argsNode(), makeNode("a"), makeNode("b"), returnsNode()];
    const edges = [
      makeEdge("e1", "args", "a"),
      makeEdge("e2", "args", "b"),
      makeEdge("r1", "a", "returns"),
      makeEdge("r2", "b", "returns"),
    ];
    const result = validateState({ nodes, edges, globals: [] });
    expect(result.edges.map((e) => e.id)).toEqual(["e1", "e2", "r1"]);
  });
});

describe("constants", () => {
  it("validates non-global constants against constantsMap", () => {
    const g = linearGraph();
    const mid = makeNode("mid", {
      constants: [intPort("count")],
      constantsMap: { count: "not a number" },
    });
    const result = validateState({ ...g, nodes: [g.nodes[0], mid, g.nodes[2]] });
    expect(result.remainingErrors.some((e) => e.type === "node" && e.id === "mid" && e.path === "count")).toBe(true);
  });

  it("skips constants bound to a global, but not keys with an undefined value", () => {
    const g = linearGraph();
    const bound = makeNode("mid", {
      constants: [intPort("count")],
      constantsMap: {},
      globalsMap: { count: "count" },
    });
    expect(validateState({ ...g, nodes: [g.nodes[0], bound, g.nodes[2]] }).valid).toBe(true);

    const stale = makeNode("mid", {
      constants: [intPort("count")],
      constantsMap: {},
      globalsMap: { count: undefined },
    });
    expect(validateState({ ...g, nodes: [g.nodes[0], stale, g.nodes[2]] }).valid).toBe(false);
  });

  it("carries solved errors from a preceding step", () => {
    const g = linearGraph();
    const carried = [{ type: "node" as const, id: "x", level: "critical" as const, message: "m", solvedBy: "s" }];
    const result = validateState(g, { carrySolved: carried });
    expect(result.solvedErrors).toEqual(carried);
    expect(result.solvedErrors).not.toBe(carried);
  });
});
