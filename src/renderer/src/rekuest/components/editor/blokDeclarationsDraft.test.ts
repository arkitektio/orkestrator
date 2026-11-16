import { describe, expect, it } from "vitest";
import { analyzeBsx, mountedBlokScope } from "@arkitektio/bsx/bsx/index";
import { buildDeclarations, declarationsDraft, draftResolvedLocals, emptyDeclarationsDraft } from "./blokDeclarationsDraft";

describe("the blok editor's declarations", () => {
  it("reads back the demo the server holds, and builds it as the wire takes it", () => {
    const draft = declarationsDraft({
      demo: { __typename: "BlokDemo", deps: null, args: { slide: { id: "1" } }, task: null, queries: null, subscriptions: null },
    });
    expect(JSON.parse(draft.demo)).toEqual({ args: { slide: { id: "1" } } });
    const built = buildDeclarations(draft);
    expect(built.problems.size).toBe(0);
    expect(built.demo).toEqual({ args: { slide: { id: "1" } } });
    expect(buildDeclarations(emptyDeclarationsDraft()).demo).toEqual({});
  });

  it("says what is wrong with the demo", () => {
    expect([...buildDeclarations({ demo: '{"state": {}}' }).problems.keys()]).toEqual(["demo"]);
    expect([...buildDeclarations({ demo: "{oops" }).problems.keys()]).toEqual(["demo"]);
    expect([...buildDeclarations({ demo: "[]" }).problems.keys()]).toEqual(["demo"]);
  });

  it("types the locals the source declares by their node, the dry run's answer winning for exactly its draft", () => {
    const source =
      '<Blok kind="custom" context="panel">' +
      '<local name="count" default={3} />' +
      '<local name="on" persist />' +
      "<Card><Switch bind={on} /><Text>{count}</Text></Card>" +
      "</Blok>";
    const analysis = analyzeBsx(source, { scope: mountedBlokScope(["custom"], [], []) });
    expect(analysis.findings.filter((finding) => finding.level === "error")).toEqual([]);
    const local = [...(analysis.resolved ?? [])].map(([node, { local }]) => ({ ...local, node }));
    expect(local.map(({ node, key, kind, persist }) => [node, key, kind, persist === true])).toEqual([
      ["Blok[0]/local[0]", "count", "INT", false],
      ["Blok[0]/local[1]", "on", "BOOL", true],
    ]);

    const server = { checked: '{"source":"a"}', resolvedLocals: [{ node: "Blok[0]/local[1]", key: "on", kind: "STRING" }] };
    expect(draftResolvedLocals(local, server, '{"source":"a"}')).toBe(server.resolvedLocals);
    expect(draftResolvedLocals(local, server, '{"source":"ab"}')).toBe(local);
    expect(draftResolvedLocals(null, null, null)).toBeNull();
  });
});
