// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import type { FlowNode } from "../types";
import { createEditFlowStore } from "./store";

const node = {
  id: "a",
  type: "ReactiveNode",
  position: { x: 0, y: 0 },
  data: { ins: [], outs: [], constants: [], voids: [] },
} as unknown as FlowNode;

const makeStore = () =>
  createEditFlowStore({
    nodes: [node],
    edges: [],
    globals: [],
    remainingErrors: [],
    solvedErrors: [],
    valid: true,
  });

describe("edit flow store undo history during node drags", () => {
  it("records a whole drag as a single undo step from the pre-drag position", () => {
    const store = makeStore();

    for (let i = 1; i <= 5; i++) {
      store
        .getState()
        .onNodesChange([{ type: "position", id: "a", position: { x: i, y: 0 }, dragging: true }]);
    }
    // Intermediate drag ticks must not become undo entries.
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
});
