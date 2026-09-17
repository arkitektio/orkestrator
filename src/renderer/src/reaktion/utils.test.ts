// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GraphNodeKind } from "@/reaktion/api/graphql";
import type { ActionFragment } from "./types";
import { flowNodeToInput, flussArgPortToInput, flussReturnPortToInput, nodes_to_flownodes } from "./utils";

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

describe("port converters are side-aware", () => {
  const returnPort = {
    __typename: "ReturnPort",
    key: "return0",
    kind: "STRUCTURE",
    nullable: false,
    identifier: "@mikro/image",
    provides: [{ __typename: "Provides", key: "x", value: "y" }],
    widget: { __typename: "CustomReturnWidget", hook: "h", ward: "w" },
    effects: [],
    children: [],
  } as unknown as Parameters<typeof flussArgPortToInput>[0];

  const argPort = {
    __typename: "ArgPort",
    key: "arg0",
    kind: "INT",
    nullable: true,
    default: 3,
    requires: [{ __typename: "Requires", key: "a", value: "b" }],
    validators: [{ __typename: "Validator", call: { __typename: "UtilCall", name: "n" } }],
    widget: { __typename: "SliderAssignWidget", min: 0, max: 1 },
  } as unknown as Parameters<typeof flussReturnPortToInput>[0];

  it("drops return-only fields when a return port is used as an arg", () => {
    const input = flussArgPortToInput(returnPort) as Record<string, unknown>;
    expect(input.provides).toBeUndefined();
    expect(input.widget).toBeUndefined();
    expect(input.__typename).toBeUndefined();
    expect(input.key).toBe("return0");
    expect(input.identifier).toBe("@mikro/image");
  });

  it("drops arg-only fields when an arg port is used as a return", () => {
    const input = flussReturnPortToInput(argPort) as Record<string, unknown>;
    expect(input.default).toBeUndefined();
    expect(input.requires).toBeUndefined();
    expect(input.validators).toBeUndefined();
    expect(input.widget).toBeUndefined();
    expect(input.nullable).toBe(true);
  });

  it("keeps same-side fields and strips typenames", () => {
    const arg = flussArgPortToInput(argPort) as Record<string, unknown>;
    expect(arg.default).toBe(3);
    expect(arg.requires).toEqual([{ key: "a", value: "b" }]);
    expect(arg.validators).toEqual([{ call: { name: "n" } }]);
    expect(arg.widget).toMatchObject({ kind: "SLIDER", min: 0, max: 1 });

    const ret = flussReturnPortToInput(returnPort) as Record<string, unknown>;
    expect(ret.provides).toEqual([{ key: "x", value: "y" }]);
    expect(ret.widget).toMatchObject({ kind: "CUSTOM", hook: "h" });
  });
});
