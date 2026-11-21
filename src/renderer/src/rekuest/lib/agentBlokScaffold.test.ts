import { analyzeBsx, mountedBlokScope, parseBsx, printBsx, type BlokScopeDependency } from "@arkitektio/bsx/bsx/index";
import { normalizeBlokComponentTree, preflightBlokDocument } from "@arkitektio/bsx/renderer/runtime/index";
import { describe, expect, it } from "vitest";
import { defaultBlokCatalog } from "@/core/blok/catalog";
import type { AgentDependencyInput, PortMatchInput, ProtocolAgentFragment } from "@/rekuest/api/graphql";
import { dependencyKeyFor, scaffoldAgentBlok, scaffoldAgentsBlok, uniqueName } from "./agentBlokScaffold";

const port = (key: string, kind: string, nullable = false) => ({ key, kind, label: key, nullable }) as never;

const agent = {
  id: "7",
  name: 'Stage "A" <left>',
  app: { identifier: "live.arkitekt.stage-controller" },
  states: [
    {
      id: "s1",
      interface: "position",
      updatedAt: "",
      definition: { hash: "h", name: "Position", ports: [port("x", "FLOAT"), port("mode", "STRING"), port("history", "LIST")] },
    },
    { id: "s2", interface: "tasks", updatedAt: "", definition: { hash: "h2", name: "Tasks", ports: [] } },
    { id: "s3", interface: "lamp", updatedAt: "", definition: { hash: "h3", name: "Lamp", ports: [port("frames", "LIST")] } },
  ],
  implementations: [
    { interface: "home", action: { key: "home", name: "Home", description: "Go home", args: [], returns: [] } },
    { interface: "nudge", action: { key: "nudge", name: "Nudge", description: null, args: [port("by", "FLOAT", true)], returns: [] } },
    { interface: "move_to", action: { key: "move_to", name: "Move to", description: null, args: [port("x", "FLOAT")], returns: [] } },
    { interface: "do-it", action: { key: "do", name: "Do it", description: null, args: [], returns: [] } },
  ],
} as unknown as ProtocolAgentFragment;

const scopeMatches = (matches?: PortMatchInput[] | null) =>
  matches ? matches.map((entry) => ({ key: entry.key ?? undefined, kind: entry.kind ?? undefined })) : null;

/** The dependency as the editor's validator reads it (`scopeDependency`, from the input instead of a draft). */
const scopeOf = (dependency: AgentDependencyInput): BlokScopeDependency =>
  ({
    key: dependency.key,
    action_dependencies:
      dependency.actionDependencies?.map((action) => ({
        key: action.key,
        demand: { arg_matches: scopeMatches(action.demand?.argMatches), return_matches: null },
      })) ?? null,
    state_dependencies:
      dependency.stateDependencies?.map((state) => ({ key: state.key, demand: { matches: scopeMatches(state.demand?.matches) } })) ?? null,
  }) as BlokScopeDependency;

describe("scaffoldAgentBlok", () => {
  const scaffold = scaffoldAgentBlok(agent, ["stage a left panel"]);

  it("writes BSX the editor accepts against the dependency it declares", () => {
    const analysis = analyzeBsx(scaffold.source, {
      scope: mountedBlokScope(["custom"], scaffold.dependencies.map(scopeOf), []),
    });
    expect(analysis.tree).not.toBeNull();
    expect(analysis.markers.filter((marker) => marker.severity === "error")).toEqual([]);
    // The validator does look: the same text without the dependency is refused.
    expect(
      analyzeBsx(scaffold.source, { scope: mountedBlokScope(["custom"], [], []) }).markers.some(
        (marker) => marker.severity === "error",
      ),
    ).toBe(true);
    // As the editor would print it: opening and saving it changes nothing.
    expect(printBsx(parseBsx(scaffold.source).tree)).toBe(scaffold.source);
  });

  it("uses only props its components have: the renderer draws it", () => {
    const { tree } = parseBsx(scaffold.source);
    const preflight = preflightBlokDocument(normalizeBlokComponentTree([tree]).roots, defaultBlokCatalog);
    expect(preflight.errors).toEqual([]);
    // And the check does look: a Row has no className.
    const wrong = parseBsx('<Blok kind="custom" context="panel"><Row className="gap-2" /></Blok>').tree;
    expect(preflightBlokDocument(normalizeBlokComponentTree([wrong]).roots, defaultBlokCatalog).errors).not.toEqual([]);
  });

  it("reads each state and calls what needs nothing passed, by interface", () => {
    expect(scaffold.bindings).toEqual([{ agent: "7", key: "stage_controller" }]);
    expect(scaffold.source).toContain("agents.stage_controller.position.x");
    expect(scaffold.source).toContain("agents.stage_controller.position.mode");
    expect(scaffold.source).not.toContain("position.history");
    expect(scaffold.source).toContain("agents.stage_controller.home()");
    expect(scaffold.source).toContain("agents.stage_controller.nudge()");
    expect(scaffold.source).not.toContain("move_to");
    const [dependency] = scaffold.dependencies;
    expect(dependency.app).toBe("live.arkitekt.stage-controller");
    expect(dependency.stateDependencies?.map((state) => state.key)).toEqual(["position", "lamp"]);
    expect(dependency.actionDependencies?.map((action) => action.key)).toEqual(["home", "nudge"]);
  });

  it("says what it left out, and never takes a name in use", () => {
    expect(scaffold.skipped).toEqual(["tasks", "Move to", "Do it"]);
    expect(scaffold.name).toBe("Stage A left panel 2");
    expect((scaffold.demo.deps as Record<string, Record<string, unknown>>).stage_controller.position).toEqual({ x: 0.5, mode: "mode" });
  });
});

describe("scaffoldAgentsBlok", () => {
  const lamp = {
    id: "9",
    name: "Lamp",
    app: { identifier: "live.arkitekt.lamp" },
    states: [{ id: "s", interface: "light", updatedAt: "", definition: { hash: "h", name: "Light", ports: [port("on", "BOOL")] } }],
    implementations: [{ interface: "toggle", action: { key: "toggle", name: "Toggle", description: null, args: [], returns: [] } }],
  } as unknown as ProtocolAgentFragment;
  // A second copy of the same app: bound on its own, so it needs a key of its own.
  const twin = { ...agent, id: "8", name: "Stage B" } as ProtocolAgentFragment;
  const scaffold = scaffoldAgentsBlok([agent, lamp, twin]);

  it("gives every agent a dependency and a part of its own", () => {
    expect(scaffold.bindings).toEqual([
      { agent: "7", key: "stage_controller" },
      { agent: "9", key: "lamp" },
      { agent: "8", key: "stage_controller_2" },
    ]);
    expect(scaffold.dependencies.map((dependency) => dependency.key)).toEqual(["stage_controller", "lamp", "stage_controller_2"]);
    expect(scaffold.source).toContain("agents.lamp.light.on");
    expect(scaffold.source).toContain("agents.lamp.toggle()");
    expect(scaffold.source).toContain("agents.stage_controller_2.position.x");
    expect(Object.keys(scaffold.demo.deps as object)).toEqual(["stage_controller", "lamp", "stage_controller_2"]);
    expect(scaffold.name).toBe("Stage A left + 2 more panel");
    expect(scaffoldAgentsBlok([agent, lamp]).name).toBe("Stage A left + Lamp panel");
  });

  it("is BSX the editor accepts and the renderer draws", () => {
    const analysis = analyzeBsx(scaffold.source, {
      scope: mountedBlokScope(["custom"], scaffold.dependencies.map(scopeOf), []),
    });
    expect(analysis.markers.filter((marker) => marker.severity === "error")).toEqual([]);
    const { tree } = parseBsx(scaffold.source);
    expect(preflightBlokDocument(normalizeBlokComponentTree([tree]).roots, defaultBlokCatalog).errors).toEqual([]);
  });
});

describe("names", () => {
  it("keys the agent by its app, never as self", () => {
    expect(dependencyKeyFor({ name: "x", app: { identifier: "self" } } as never)).toBe("x");
    expect(dependencyKeyFor({ name: "", app: { identifier: "9lives" } } as never)).toBe("_9lives");
    expect(dependencyKeyFor({ name: "!!", app: null } as never)).toBe("agent");
  });
  it("counts up past taken names", () => {
    expect(uniqueName("A", ["a", "A 2"])).toBe("A 3");
  });
});
