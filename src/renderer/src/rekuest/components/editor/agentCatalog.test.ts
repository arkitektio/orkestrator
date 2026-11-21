import { describe, expect, it } from "vitest";
import type { ProtocolAgentFragment } from "@/rekuest/api/graphql";
import { draftForAgent, freeKey, offerOf, sourceUsage, undeclaredKeys, undeclaredNames } from "./agentCatalog";
import { emptyDependency } from "./blokDependencies";

const port = (key: string, kind: string, nullable = false) => ({ key, kind, label: key, nullable }) as never;

const agent = {
  id: "7",
  name: "Stage",
  app: { identifier: "live.arkitekt.stage" },
  states: [
    { id: "s", interface: "position", updatedAt: "", definition: { hash: "h", name: "Position", ports: [port("x", "FLOAT")] } },
    { id: "t", interface: "tasks", updatedAt: "", definition: { hash: "h", name: "Tasks", ports: [] } },
  ],
  implementations: [
    { interface: "move", action: { key: "m", name: "Move", description: "Go there", args: [port("x", "FLOAT"), port("speed", "FLOAT", true)], returns: [] } },
    { interface: "move", action: { key: "m", name: "Move", description: null, args: [], returns: [] } },
    { interface: "do-it", action: { key: "d", name: "Do", description: null, args: [], returns: [] } },
  ],
} as unknown as ProtocolAgentFragment;

describe("offerOf", () => {
  it("lists what BSX can name, each once", () => {
    const offer = offerOf(agent);
    expect(offer.states.map((state) => [state.key, state.fields])).toEqual([["position", ["x"]]]);
    expect(offer.actions.map((action) => [action.key, action.args])).toEqual([["move", ["x", "speed?"]]]);
  });
});

describe("draftForAgent", () => {
  it("keys the dependency after the app, on a free key", () => {
    expect(freeKey("stage", ["stage", "stage_2"])).toBe("stage_3");
    const draft = draftForAgent(agent, ["stage"]);
    expect(draft.key).toBe("stage_2");
    expect(draft.app).toBe("live.arkitekt.stage");
    expect(draft.actions).toEqual([]);
  });
});

describe("sourceUsage", () => {
  const usage = sourceUsage(
    '<Text text={agents.stage.position.x} /><Button onClick={agents.stage.move(x: 1)} /><Text text={agents.stage.tasks.home.returns} /><Badge text={agents.lamp.connected ? "a" : "b"} />',
  );

  it("reads what the source names of each agent, not the agent's own fields", () => {
    expect([...usage.get("stage")!.states]).toEqual(["position"]);
    expect([...usage.get("stage")!.actions].sort()).toEqual(["home", "move"]);
    expect(usage.get("lamp")).toEqual({ states: new Set(), actions: new Set() });
  });

  it("finds what is read but not declared", () => {
    const stage = { ...emptyDependency("stage"), actions: [{ key: "move", description: "", optional: false, demand: null }] };
    expect(undeclaredKeys(usage, [stage])).toEqual(["lamp"]);
    expect(undeclaredNames(stage.actions, usage.get("stage")!.actions)).toEqual(["home"]);
    // No state declared: every state name is accepted, so none is missing.
    expect(undeclaredNames(stage.states, usage.get("stage")!.states)).toEqual([]);
  });
});
