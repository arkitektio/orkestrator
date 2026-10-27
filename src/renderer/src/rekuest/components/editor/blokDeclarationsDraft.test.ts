import { describe, expect, it } from "vitest";
import { LocalKind } from "../../api/graphql";
import { checkBlokTree, emptyBlokScope, parseBsx, resolveBlokScope } from "@/core/blok/bsx";
import { defaultBlokView } from "@/core/blok/spec/catalogs";
import { buildDeclarations, declarationsDraft, draftResolvedLocals, emptyDeclarationsDraft, inferredLocalKinds, newLocalDraft, type LocalDraft } from "./blokDeclarationsDraft";

const local = (patch: Partial<LocalDraft>): LocalDraft => ({ ...newLocalDraft(), ...patch });

describe("the blok editor's declarations", () => {
  it("builds port locals, reads and the demo as the wire takes them", () => {
    const built = buildDeclarations({
      locals: [
        local({ key: "iterations", kind: LocalKind.Int, defaultText: "15", persist: true }),
        local({ key: "mode", kind: LocalKind.Enum, defaultText: '"fast"', choicesText: '[{"value": "fast", "label": "Fast"}, {"value": "slow"}]' }),
        local({ key: "image", kind: LocalKind.Structure, identifier: "@mikro/image", nullable: true }),
      ],
      reads: [
        {
          kind: "query",
          key: "positions",
          service: "mikro",
          document: "query($slide: ID!, $at: DateTime) { positions(slide: $slide, at: $at) { items { id } } }",
          variables: [
            { key: "slide", expression: "args.slide.id" },
            { key: "at", expression: "then" },
          ],
          poll: "",
          more: "positions.items",
          keep: "",
          history: "",
        },
      ],
      demo: '{"args": {"slide": {"id": "1"}}}',
    });
    expect(built.problems.size).toBe(0);
    expect(built.locals).toEqual([
      { key: "iterations", kind: "INT", nullable: false, persist: true, default: 15 },
      {
        key: "mode",
        kind: "ENUM",
        nullable: false,
        persist: false,
        default: "fast",
        choices: [
          { value: "fast", label: "Fast" },
          { value: "slow", label: '"slow"' },
        ],
      },
      { key: "image", kind: "STRUCTURE", nullable: true, persist: false, identifier: "@mikro/image" },
    ]);
    expect(built.queries[0]).toMatchObject({
      key: "positions",
      service: "mikro",
      more: "positions.items",
      variables: [
        { key: "slide", valuePath: "args.slide.id" },
        { key: "at", valuePath: "then" },
      ],
    });
    expect(built.queries[0]).not.toHaveProperty("at");
    expect(built.demo).toEqual({ args: { slide: { id: "1" } } });
    expect(built.scope.queries[0]).toMatchObject({ more: "positions.items" });
    expect(built.scope.locals[0]).toMatchObject({ key: "iterations", kind: "INT", default: 15, persist: true });
    expect(built.scope).not.toHaveProperty("now_interval");
  });

  it("says what is wrong, by where it is", () => {
    const built = buildDeclarations({
      ...emptyDeclarationsDraft(),
      locals: [
        local({ key: "task", defaultText: "1" }),
        local({ key: "n", defaultText: "{oops" }),
        local({ key: "pick", kind: LocalKind.Enum }),
        local({ key: "img", kind: LocalKind.Structure }),
        local({ key: "c", choicesText: "{}" }),
      ],
      reads: [{ kind: "query", key: "q", service: "", document: "query { x }", variables: [{ key: "v", expression: "a +" }], poll: "-1", more: "", keep: "", history: "" }],
      demo: '{"state": {}}',
    });
    expect([...built.problems.keys()].sort()).toEqual(["demo", "local:c", "local:img", "local:n", "local:pick", "local:task", "query:q"]);
  });

  it("reads back what the server holds as drafts, variables as their expressions", () => {
    const draft = declarationsDraft({
      locals: [
        { key: "iterations", kind: "INT", nullable: false, default: 15, persist: true },
        { key: "form", kind: "DICT", nullable: false, default: null, children: [{ key: "name", kind: "STRING", nullable: false }] },
      ],
      queries: [{ key: "positions", service: "mikro", document: "query { x }", variables: [{ __typename: "ActionArgument", key: "slide", valuePath: "args.slide.id" }], poll: 5, more: "positions" }],
      subscriptions: [{ key: "events", service: "rekuest", document: "subscription { y }", variables: [], keep: 20, history: "positions" }],
      demo: { __typename: "BlokDemo", deps: null, args: { slide: { id: "1" } }, task: null, queries: null, subscriptions: null },
    });
    expect(draft.locals[0]).toEqual(local({ key: "iterations", kind: LocalKind.Int, defaultText: "15", persist: true }));
    expect(draft.locals[1].children).toEqual([{ key: "name", kind: "STRING", nullable: false }]);
    expect(draft.reads.map((read) => [read.kind, read.key, read.variables, read.poll, read.more, read.keep, read.history])).toEqual([
      ["query", "positions", [{ key: "slide", expression: "args.slide.id" }], "5", "positions", "", ""],
      ["subscription", "events", [], "", "", "20", "positions"],
    ]);
    expect(JSON.parse(draft.demo)).toEqual({ args: { slide: { id: "1" } } });
    const rebuilt = buildDeclarations(draft);
    expect(rebuilt.problems.size).toBe(0);
    expect(rebuilt.locals[1].children).toEqual([{ key: "name", kind: "STRING", nullable: false }]);
  });

  it("leaves out the kind of a local that says none, for the tree to infer", () => {
    const built = buildDeclarations({ ...emptyDeclarationsDraft(), locals: [newLocalDraft("on"), local({ key: "x", kind: LocalKind.Any })] });
    expect(built.problems.size).toBe(0);
    expect("kind" in built.locals[0]).toBe(false);
    expect("kind" in built.scope.locals[0]).toBe(false);
    expect(built.locals[1].kind).toBe(LocalKind.Any);
  });

  it("loads and sends the locals as written, never the resolved ones, and shows the inferred kind beside", () => {
    // What the server holds: `count` written without a kind, resolved to INT from its default;
    // `on` without one either, resolved to BOOL from the Switch bound to it; `label` given STRING.
    const served = {
      locals: [
        { key: "count", kind: null, nullable: false, default: 3, persist: false },
        { key: "on", kind: null, nullable: false, default: null, persist: false },
        { key: "label", kind: "STRING", nullable: false, default: "x", persist: false },
      ],
      resolvedLocals: [
        { key: "count", kind: "INT", nullable: false, default: 3, persist: false },
        { key: "on", kind: "BOOL", nullable: false, default: null, persist: false },
        { key: "label", kind: "STRING", nullable: false, default: "x", persist: false },
      ],
      queries: [],
      subscriptions: [],
      demo: null,
    };
    const draft = declarationsDraft(served);
    expect(draft.locals.map((local) => local.kind)).toEqual([null, null, LocalKind.String]);

    const built = buildDeclarations(draft);
    expect(built.problems.size).toBe(0);
    // A re-save sends what was written: the inferred kinds are not pinned.
    expect(built.locals).toEqual([
      { key: "count", nullable: false, persist: false, default: 3 },
      { key: "on", nullable: false, persist: false },
      { key: "label", kind: "STRING", nullable: false, persist: false, default: "x" },
    ]);
    expect(built.scope.locals.map((local) => "kind" in local)).toEqual([false, false, true]);

    // The local validator resolves the draft as the server did, and that is what is shown.
    const { tree } = parseBsx("<Html><Card><Switch bind={on} /><Text>{label}</Text></Card></Html>");
    const scope = { ...emptyBlokScope("custom"), ...built.scope };
    const resolved = resolveBlokScope(tree, scope, defaultBlokView());
    expect(resolved.locals.map((local) => [local.key, local.kind])).toEqual(served.resolvedLocals.map((local) => [local.key, local.kind]));
    expect(checkBlokTree(tree, scope)).toEqual([]);
    expect([...inferredLocalKinds(resolved.locals, served.resolvedLocals)]).toEqual([
      ["count", "INT"],
      ["on", "BOOL"],
      ["label", "STRING"],
    ]);
    // While the draft does not parse, the server's resolution as loaded is shown.
    expect(inferredLocalKinds(null, served.resolvedLocals).get("on")).toBe("BOOL");

    // The dry run's resolution wins once it answered exactly this draft, never an older one.
    const server = { checked: '{"source":"a"}', resolvedLocals: [{ key: "on", kind: "STRING" }] };
    expect(draftResolvedLocals(resolved.locals, server, '{"source":"a"}')).toBe(server.resolvedLocals);
    expect(draftResolvedLocals(resolved.locals, server, '{"source":"ab"}')).toBe(resolved.locals);
    expect(draftResolvedLocals(null, null, null)).toBeNull();
  });
});
