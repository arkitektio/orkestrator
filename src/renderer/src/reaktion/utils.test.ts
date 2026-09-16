// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GraphNodeKind } from "@/reaktion/api/graphql";
import type { ActionFragment } from "./types";
import { flowNodeToInput, nodes_to_flownodes } from "./utils";

const serverNode = {
  __typename: "ReactiveNode",
  id: "n1",
  position: { x: 1, y: 2 },
  parentNode: "old-parent",
  kind: GraphNodeKind.Reactive,
  title: "t",
  description: "",
  ins: [],
  outs: [],
  constants: [],
  voids: [],
  constantsMap: {},
  globalsMap: {},
  implementation: "ZIP",
} as unknown as ActionFragment;

describe("flow node round-trip", () => {
  it("moves parentNode into parentId and out of data on load", () => {
    const [node] = nodes_to_flownodes([serverNode]);
    expect(node.parentId).toBe("old-parent");
    expect(node.extent).toBe("parent");
    expect("parentNode" in node.data).toBe(false);
  });

  it("persists the live parentId after a reparent", () => {
    const [node] = nodes_to_flownodes([serverNode]);
    const moved = { ...node, parentId: undefined, extent: undefined };
    expect(flowNodeToInput(moved).parentNode).toBeUndefined();

    const reparented = { ...node, parentId: "new-parent" };
    expect(flowNodeToInput(reparented).parentNode).toBe("new-parent");
  });

  it("strips client-only keys from the input", () => {
    const [node] = nodes_to_flownodes([serverNode]);
    const decorated = {
      ...node,
      data: { ...node.data, app: "x", binds: { templates: [] }, extras: {}, parentNode: "stale" },
    } as typeof node;
    const input = flowNodeToInput(decorated) as Record<string, unknown>;
    expect(input.app).toBeUndefined();
    expect(input.binds).toBeUndefined();
    expect(input.extras).toBeUndefined();
    expect(input.parentNode).toBe("old-parent");
    expect(input.implementation).toBe("ZIP");
  });
});
