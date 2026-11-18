import { describe, expect, it } from "vitest";
import { ActionKind } from "@/rekuest/api/graphql";
import { PortKind } from "@/fluss/api/graphql";
import { flowDeployConfig, flowInterface, flowStatefulSteps, flowStepHashes, flowToDefinition, stepKey } from "./utils";
import { intPort, stringPort } from "./validation/fixtures";

const node = (typename: string, id: string, over: Record<string, unknown> = {}) => ({
  __typename: typename,
  id,
  title: "",
  ins: [],
  outs: [],
  ...over,
});

/** image -> [move the stage] -> [move the stage] -> [segment] -> count, with one global. */
const flow = {
  id: "7",
  title: "Scan",
  description: null,
  graph: {
    nodes: [
      node("ArgNode", "args", { outs: [[intPort("image", { __typename: "ReturnPort", kind: PortKind.Structure, identifier: "@mikro/image" })]] }),
      node("RekuestMapActionNode", "node-1.a", { title: "Move in", hash: "h-move" }),
      node("RekuestFilterActionNode", "node-2", { hash: "h-move" }),
      node("RekuestMapActionNode", "node-3", { title: "Segment", hash: "h-segment" }),
      node("ReactiveNode", "zip"),
      node("ReturnNode", "returns", { ins: [[intPort("count")]] }),
    ],
    edges: [],
    globals: [{ key: "sigma", port: stringPort("sigma") }],
  },
} as unknown as Parameters<typeof flowToDefinition>[0];

const actions = {
  "h-move": { name: "Move stage", stateful: true },
  "h-segment": { name: "Segment cells", stateful: false },
};

describe("a graph flow, deployed", () => {
  it("is a generator of its own ports: the argument stream and the globals in, the return stream out", () => {
    const definition = flowToDefinition(flow);

    expect(definition).toMatchObject({
      name: "Scan",
      key: "flow_7",
      version: "1",
      kind: ActionKind.Generator,
      description: "The flow Scan",
      stateful: false,
      isDev: false,
    });
    expect(definition.args?.map((port) => port.key)).toEqual(["image", "sigma"]);
    expect(definition.args?.[0]).toMatchObject({ kind: PortKind.Structure, identifier: "@mikro/image" });
    expect(definition.returns?.map((port) => port.key)).toEqual(["count"]);
    expect(flowInterface("7")).toBe("flow:7");
    expect(flowDeployConfig("7")).toEqual({ bound: { flow: "7" }, args_key: "kwargs", returns_key: "returns" });
  });

  it("declares one dependency per node whose action is stateful, keyed by the node, and none for the rest", () => {
    expect(stepKey("node-1.a")).toBe("step_node_1_a");
    expect(flowStepHashes(flow.graph.nodes)).toEqual(["h-move", "h-segment"]);

    expect(flowStatefulSteps(flow.graph.nodes, actions)).toEqual([
      {
        key: "step_node_1_a",
        name: "Move in",
        description: "The agent that runs Move in. The step is stateful, so the run names one.",
        autoResolvable: true,
        optional: false,
        actionDependencies: [{ key: "step", demand: { hash: "h-move" } }],
      },
      // The same action in another node is another step; untitled, it is named by its action.
      {
        key: "step_node_2",
        name: "Move stage",
        description: "The agent that runs Move stage. The step is stateful, so the run names one.",
        autoResolvable: true,
        optional: false,
        actionDependencies: [{ key: "step", demand: { hash: "h-move" } }],
      },
    ]);
  });
});
