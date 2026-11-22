import { describe, expect, it } from "vitest";
import { emptyDependency } from "./blokDependencies";
import { blokFileCreateInput, blokFileName, blokFileOf, parseBlokFile } from "./blokFile";

const SOURCE = '<Blok kind="custom" context="panel">\n  <Text text={agents.stage.position.x} />\n</Blok>\n';

const draft = {
  name: " Stage panel ",
  description: "",
  source: SOURCE,
  dependencies: [
    {
      ...emptyDependency("stage"),
      app: "live.stage",
      states: [{ key: "position", description: "", optional: false, demand: { matches: [{ key: "x" }] } }],
    },
  ],
  declarations: { demo: '{"deps": {"stage": {"position": {"x": 1}}}}' },
};

describe("blok files", () => {
  it("round-trips a draft, without what it is bound to", () => {
    const file = blokFileOf(draft);
    expect(file).toMatchObject({ kind: "arkitekt.blok", version: 1, name: "Stage panel", demo: { deps: { stage: { position: { x: 1 } } } } });
    const back = parseBlokFile(JSON.stringify(file));
    if (!back.ok) throw new Error(back.error);
    expect(back.draft.source).toBe(SOURCE);
    expect(back.draft.dependencies).toHaveLength(1);
    expect(back.draft.dependencies[0]).toMatchObject({ key: "stage", app: "live.stage", states: draft.dependencies[0].states, actions: [] });
    expect(JSON.parse(back.draft.declarations.demo)).toEqual({ deps: { stage: { position: { x: 1 } } } });
  });

  it("takes bare BSX, and says why a file is not a blok", () => {
    const bare = parseBlokFile(SOURCE);
    expect(bare.ok && bare.draft.source).toBe(SOURCE);
    expect(parseBlokFile("hello")).toEqual({ ok: false, error: "This file is neither a blok file nor BSX." });
    expect(parseBlokFile('{"kind": "other"}')).toEqual({ ok: false, error: "This is not a blok file." });
    expect(parseBlokFile(JSON.stringify({ ...blokFileOf(draft), version: 9 })).ok).toBe(false);
    const broken = parseBlokFile(JSON.stringify({ ...blokFileOf(draft), source: "<Blok" }));
    expect(!broken.ok && broken.error).toMatch(/^Its BSX does not parse/);
  });

  it("installs a file as a template under the name it is given, with its context and demo", () => {
    const input = blokFileCreateInput(draft, "Stage panel 2");
    expect(input).toMatchObject({
      name: "Stage panel 2",
      description: null,
      context: "PANEL",
      source: SOURCE,
      demo: { deps: { stage: { position: { x: 1 } } } },
    });
    expect(input?.dependencies).toHaveLength(1);
    expect(blokFileCreateInput({ ...draft, source: "<Blok" }, "x")).toBeNull();
  });

  it("names the file after the blok", () => {
    expect(blokFileName(" Stage Panel (v2) ")).toBe("stage-panel-v2.blok.json");
    expect(blokFileName("")).toBe("blok.blok.json");
  });
});
