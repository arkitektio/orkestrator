// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PortKind } from "@/fluss/api/graphql";
import { argsNode, intPort, makeEdge, makeNode, returnsNode } from "./fixtures";
import { integrate, istriviallyIntegratable } from "./integrate";

describe("integrate", () => {
  it("adds a plain edge with the source stream when ports match", () => {
    const nodes = [argsNode(), makeNode("mid"), returnsNode()];
    const state = { nodes, edges: [makeEdge("e2", "mid", "returns")], globals: [] };
    const result = integrate(state, {
      source: "args",
      sourceHandle: "return_0",
      target: "mid",
      targetHandle: "arg_0",
    });
    expect(result.edges).toHaveLength(2);
    const added = result.edges.find((e) => e.source === "args");
    expect(added?.data?.stream).toEqual([{ __typename: "StreamItem", kind: PortKind.Int, label: "x" }]);
    // input untouched
    expect(state.edges).toHaveLength(1);
  });

  it("inserts a transform node with unique edge ids when a list is needed", () => {
    const list = intPort("x", { kind: PortKind.List, children: [{ ...intPort("0") }] });
    // A reactive source cannot adapt its outs (unlike an Args node), so the
    // only way to connect is a transform on the target side.
    const nodes = [makeNode("src"), makeNode("mid", { ins: [[list]], outs: [[list]] })];
    const state = { nodes, edges: [], globals: [] };
    const result = integrate(state, {
      source: "src",
      sourceHandle: "return_0",
      target: "mid",
      targetHandle: "arg_0",
    });
    expect(result.nodes).toHaveLength(3);
    const ids = result.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.endsWith("-transform"))).toBe(false);
    expect(result.solvedErrors.length).toBeGreaterThan(0);
    expect(state.nodes).toHaveLength(2);
  });
});

describe("istriviallyIntegratable", () => {
  it("treats an unconnected reactive target as trivially integratable", () => {
    const nodes = [argsNode(), makeNode("mid")];
    expect(
      istriviallyIntegratable({ nodes, edges: [], globals: [] }, {
        source: "args",
        sourceHandle: "return_0",
        target: "mid",
        targetHandle: "arg_0",
      }),
    ).toBe(true);
  });

  it("checks the target's incoming edges, not its outgoing ones", () => {
    const nodes = [argsNode("args", [[intPort("x", { kind: PortKind.String })]]), makeNode("mid"), makeNode("other")];
    // mid already has an incoming edge from other -> a mismatching new source is not trivial
    const edges = [makeEdge("e", "other", "mid")];
    expect(
      istriviallyIntegratable({ nodes, edges, globals: [] }, {
        source: "args",
        sourceHandle: "return_0",
        target: "mid",
        targetHandle: "arg_0",
      }),
    ).toBe(false);
  });
});
