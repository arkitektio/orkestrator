// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// The exported matchers are pure, but importing the module runs top-level code
// (the scoped-store factory) and pulls in the dialog registry. Stub those heavy
// imports so the unit under test (condition matching) is isolated.
vi.mock("@/app/dialog", () => ({ useDialog: () => ({}) }));
vi.mock("@/lib/generic/createScopedStore", () => ({
  createScopedStoreHooks: () => ({
    StoreContext: { Provider: ({ children }: { children: unknown }) => children },
    useScopedStore: () => undefined,
  }),
}));

// `datum` / `pdatum` ask the smart registry; drive it with a fixed set so the
// test does not depend on which linkers are registered.
const datums = new Set(["@x/datum"]);
vi.mock("@/providers/smart/registry", () => ({
  smartRegistry: { isDatum: (identifier: string) => datums.has(identifier) },
}));

import type { Action, ActionState, Condition, Structure } from "./LocalActionProvider";
import { getActionEntriesForState, getActionsForState } from "./LocalActionProvider";
import { orderActionEntries } from "./LocalActionProvider";

const structure = (identifier: string, id = "1"): Structure =>
  ({ identifier, object: { id } }) as Structure;

const action = (conditions: Condition[], over: Partial<Action> = {}): Action => ({
  title: over.title ?? "Action",
  description: over.description ?? "",
  conditions,
  execute: async () => {},
  ...over,
});

const state = (over: Partial<ActionState> = {}): ActionState => ({
  left: [],
  isCommand: false,
  ...over,
});

describe("getActionsForState — single conditions", () => {
  it("identifier matches when a left structure has that identifier", () => {
    const registry = { a: action([{ type: "identifier", identifier: "@x/a" }]) };
    expect(getActionsForState(registry, state({ left: [structure("@x/a")] }))).toHaveLength(1);
    expect(getActionsForState(registry, state({ left: [structure("@x/b")] }))).toHaveLength(0);
  });

  it("mixture matches when any listed identifier is present on the left", () => {
    const registry = { a: action([{ type: "mixture", identifiers: ["@x/a", "@x/b"] }]) };
    expect(getActionsForState(registry, state({ left: [structure("@x/b")] }))).toHaveLength(1);
    expect(getActionsForState(registry, state({ left: [structure("@x/c")] }))).toHaveLength(0);
  });

  it("homogenous matches when all left structures share an identifier (or none)", () => {
    const registry = { a: action([{ type: "homogenous" }]) };
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a"), structure("@x/a", "2")] })),
    ).toHaveLength(1);
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a"), structure("@x/b")] })),
    ).toHaveLength(0);
    // Empty selection is vacuously homogenous.
    expect(getActionsForState(registry, state({ left: [] }))).toHaveLength(1);
  });

  it("pidentifier matches against the partner (right) selection", () => {
    const registry = { a: action([{ type: "pidentifier", identifier: "@x/p" }]) };
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a")], right: [structure("@x/p")] })),
    ).toHaveLength(1);
    expect(getActionsForState(registry, state({ left: [structure("@x/a")] }))).toHaveLength(0);
  });

  it("nopartner matches only when there is no right selection", () => {
    const registry = { a: action([{ type: "nopartner" }]) };
    expect(getActionsForState(registry, state())).toHaveLength(1);
    expect(getActionsForState(registry, state({ right: [] }))).toHaveLength(1);
    expect(getActionsForState(registry, state({ right: [structure("@x/p")] }))).toHaveLength(0);
  });

  it("haspartner matches only when there is a right selection", () => {
    const registry = { a: action([{ type: "haspartner" }]) };
    expect(getActionsForState(registry, state({ right: [structure("@x/p")] }))).toHaveLength(1);
    expect(getActionsForState(registry, state())).toHaveLength(0);
  });

  it("partner matches a specific partner identifier", () => {
    const registry = { a: action([{ type: "partner", partner: "@x/p" }]) };
    expect(getActionsForState(registry, state({ right: [structure("@x/p")] }))).toHaveLength(1);
    expect(getActionsForState(registry, state({ right: [structure("@x/q")] }))).toHaveLength(0);
  });

  it("datum matches when any left structure is a registered datum", () => {
    const registry = { a: action([{ type: "datum" }]) };
    expect(getActionsForState(registry, state({ left: [structure("@x/datum")] }))).toHaveLength(1);
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a"), structure("@x/datum", "2")] })),
    ).toHaveLength(1);
    expect(getActionsForState(registry, state({ left: [structure("@x/a")] }))).toHaveLength(0);
    expect(getActionsForState(registry, state({ left: [] }))).toHaveLength(0);
  });

  it("pdatum matches only when the partner selection holds a datum", () => {
    const registry = { a: action([{ type: "pdatum" }]) };
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a")], right: [structure("@x/datum")] })),
    ).toHaveLength(1);
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a")], right: [structure("@x/b")] })),
    ).toHaveLength(0);
    // No partner at all is not a partner datum.
    expect(getActionsForState(registry, state({ left: [structure("@x/datum")] }))).toHaveLength(0);
  });

  it("command matches the isCommand flag", () => {
    const registry = { a: action([{ type: "command", command: true }]) };
    expect(getActionsForState(registry, state({ isCommand: true }))).toHaveLength(1);
    expect(getActionsForState(registry, state({ isCommand: false }))).toHaveLength(0);
  });
});

describe("getActionsForState — onroute (reads window.location)", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("matches when the current pathname includes the route", () => {
    const registry = { a: action([{ type: "onroute", route: "graph" }]) };
    window.history.pushState({}, "", "/kraph/graph/123");
    expect(getActionsForState(registry, state())).toHaveLength(1);
  });

  it("does not match a route absent from the pathname", () => {
    const registry = { a: action([{ type: "onroute", route: "graph" }]) };
    window.history.pushState({}, "", "/mikro/folders");
    expect(getActionsForState(registry, state())).toHaveLength(0);
  });
});

describe("getActionsForState — combined conditions (AND semantics)", () => {
  it("requires every condition to hold", () => {
    const registry = {
      a: action([
        { type: "identifier", identifier: "@x/a" },
        { type: "haspartner" },
      ]),
    };
    expect(
      getActionsForState(registry, state({ left: [structure("@x/a")], right: [structure("@x/p")] })),
    ).toHaveLength(1);
    // identifier holds but no partner → excluded
    expect(getActionsForState(registry, state({ left: [structure("@x/a")] }))).toHaveLength(0);
  });

  it("an action with no conditions always matches", () => {
    const registry = { a: action([]) };
    expect(getActionsForState(registry, state())).toHaveLength(1);
  });
});

describe("getActionEntriesForState", () => {
  it("returns the matching entries keyed by their registry id", () => {
    const registry = {
      onA: action([{ type: "identifier", identifier: "@x/a" }]),
      onB: action([{ type: "identifier", identifier: "@x/b" }]),
    };
    const entries = getActionEntriesForState(registry, state({ left: [structure("@x/a")] }));
    expect(entries.map((e) => e.id)).toEqual(["onA"]);
    expect(entries[0].action).toBe(registry.onA);
  });
});

describe("orderActionEntries", () => {
  const entry = (id: string, title: string, description = "") => ({ id, action: { title, description } });
  const ids = (entries: ReturnType<typeof entry>[], pinned: string[], search?: string) =>
    orderActionEntries(entries, pinned, search).map((e) => e.id);

  it("puts pinned actions first, then the rest by name, when nothing is typed", () => {
    const entries = [entry("b", "Beta"), entry("a", "Alpha"), entry("z", "Zip")];
    expect(ids(entries, ["z"])).toEqual(["z", "a", "b"]);
  });

  it("orders by how well each fits what was typed", () => {
    // "a": Alpha is a prefix hit, Beta only a substring hit.
    const entries = [entry("b", "Beta"), entry("a", "Alpha")];
    expect(ids(entries, [], "a")).toEqual(["a", "b"]);
  });

  it("keeps pinned actions above better fits", () => {
    const entries = [entry("b", "Beta"), entry("a", "Alpha")];
    expect(ids(entries, ["b"], "a")).toEqual(["b", "a"]);
  });

  it("finds an action fuzzily, as the palette does", () => {
    const entries = [entry("s", "Create shortcut", "Pin this action")];
    expect(ids(entries, [], "shrtcut")).toEqual(["s"]);
  });
});
