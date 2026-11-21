import { mountedBlokScope } from "@arkitektio/bsx/bsx/index";
import { describe, expect, it } from "vitest";
import { BSX_GUIDE, componentIndex, componentReference, describeAgents, sourceProblems } from "./blokAssist";
import { emptyDependency, scopeDependency } from "./blokDependencies";

const catalog = {
  name: "test",
  description: "",
  components: [
    {
      name: "Button",
      description: "A  button.\nPress it.",
      context: "PANEL",
      children_context: null,
      inherits_context: false,
      accepts_children: false,
      downstream_of: [],
      not_downstream_of: [],
      text_prop: "label",
      props: [
        { key: "label", kind: "STRING", required: false, description: "Its text" },
        { key: "variant", kind: "STRING", required: false, description: null, values: ["default", "ghost"] },
        { key: "onClick", kind: "ACTION", required: false, description: null, event: [] },
      ],
    },
    { name: "Robot", description: null, context: "SCENE", children_context: null, inherits_context: false, accepts_children: false, downstream_of: [], not_downstream_of: [], text_prop: null, props: [] },
  ],
} as never;

const stage = {
  ...emptyDependency("stage"),
  app: "live.stage",
  actions: [{ key: "move", description: "", optional: false, demand: { argMatches: [{ key: "x" }] } }],
  states: [{ key: "position", description: "", optional: false, demand: { matches: [{ key: "x" }] } }],
};

describe("what an assistant is told", () => {
  it("lists a context's components and a component's props", () => {
    expect(componentIndex(catalog)).toBe("Button: A button. Press it.");
    const reference = componentReference(catalog, ["Button", "Buton", "ob"]);
    expect(reference).toContain('text between its tags fills "label"');
    expect(reference).toContain('variant: string one of "default", "ghost"');
    expect(reference).toContain("<Buton> does not exist.");
    expect(reference).toContain("Did you mean: Robot?");
  });

  it("says what the draft declares of its agents", () => {
    expect(describeAgents([])).toContain("declares no agents");
    expect(describeAgents([stage])).toBe(
      "agents.stage (app live.stage)\n  actions: move(x)\n  states: position{x}",
    );
  });

  it("says where a proposed source would not save", () => {
    const scope = mountedBlokScope(["custom"], [scopeDependency(stage)], []);
    const good = '<Blok kind="custom" context="panel">\n  <Text text={agents.stage.position.x} />\n</Blok>';
    expect(sourceProblems(good, scope)).toEqual([]);
    const bad = sourceProblems(good.replace("agents.stage.position", "agents.lamp.light"), scope);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatch(/^line 2, column \d+: /);
    expect(sourceProblems("<Blok", scope)[0]).toMatch(/^line 1/);
  });

  it("the guide's own example is BSX", () => {
    const example = BSX_GUIDE.slice(BSX_GUIDE.indexOf("<Blok"), BSX_GUIDE.indexOf("</Blok>") + "</Blok>".length);
    const scope = mountedBlokScope(["custom"], [{ key: "stage", action_dependencies: null, state_dependencies: null }], []);
    expect(sourceProblems(example, scope)).toEqual([]);
  });
});
