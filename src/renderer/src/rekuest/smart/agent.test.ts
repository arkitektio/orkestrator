import { describe, expect, it } from "vitest";
import { buildDemands } from "./demands";
import { SUPERVISOR_DESCRIPTOR, agentStructure, supervisorOf } from "./agent";

describe("agent structures", () => {
  it("carry the supervisor an agent names as its descriptor", () => {
    const agent = agentStructure({ id: "a1", name: "napari", supervisor: "plugin_engine" });
    expect(agent).toEqual({
      identifier: "@rekuest/agent",
      id: "a1",
      label: "napari",
      descriptors: { [SUPERVISOR_DESCRIPTOR]: "plugin_engine" },
    });
    expect(supervisorOf(agent)).toBe("plugin_engine");
  });

  it("carry no descriptors for an agent without one", () => {
    const agent = agentStructure({ id: "a1", name: "napari", supervisor: null });
    expect(agent.descriptors).toBeUndefined();
    expect(supervisorOf(agent)).toBeUndefined();
  });

  it("are matched against a port's requires by the supervisor", () => {
    const { single } = buildDemands({
      objects: [agentStructure({ id: "a1", supervisor: "plugin_engine" })],
    });
    expect(single[0].matches?.[0]).toMatchObject({
      identifier: "@rekuest/agent",
      descriptors: [{ key: SUPERVISOR_DESCRIPTOR, value: "plugin_engine" }],
    });
  });

  it("name no supervisor for any other structure", () => {
    expect(
      supervisorOf({ identifier: "@mikro/image", descriptors: { [SUPERVISOR_DESCRIPTOR]: "x" } }),
    ).toBeUndefined();
  });
});
