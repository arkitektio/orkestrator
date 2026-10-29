// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDemands } from "@/rekuest/smart/demands";
import { Ordering } from "@/rekuest/api/graphql";
import {
  SMART_ACTION_LIMIT,
  SMART_BLOK_LIMIT,
  SMART_SHORTCUT_LIMIT,
  actionsVariables,
  openableBloksVariables,
  shortcutsVariables,
} from "./queries";

const demands = buildDemands({ objects: [{ identifier: "@mikro/image", id: "1" }] });

describe("query variables", () => {
  it("omit an empty search and a missing collection, and ask for what is pinned and can run first", () => {
    expect(actionsVariables(demands.single, { search: "" })).toEqual({
      filters: { demands: demands.single },
      ordering: [{ assignable: Ordering.Desc }],
      pagination: { limit: SMART_ACTION_LIMIT },
    });
    expect(shortcutsVariables(demands.single)).toEqual({
      filters: { demands: demands.single },
      ordering: [{ pinned: Ordering.Desc }, { assignable: Ordering.Desc }],
      pagination: { limit: SMART_SHORTCUT_LIMIT },
    });
  });

  it("carry the search and the collection when given", () => {
    expect(actionsVariables(demands.single, { search: "max", collection: "c" }).filters).toEqual({
      demands: demands.single,
      search: "max",
      inCollection: "c",
    });
  });

  it("keep only one app's actions, or leave them out", () => {
    expect(actionsVariables(demands.single, { app: "plugin_engine" }).filters).toEqual({
      demands: demands.single,
      appIdentifier: "plugin_engine",
    });
    expect(actionsVariables(demands.single, { exceptApp: "plugin_engine" }).filters).toEqual({
      demands: demands.single,
      NOT: { appIdentifier: "plugin_engine" },
    });
  });

  it("are deep-equal across calls (the cache-hit precondition)", () => {
    expect(actionsVariables(buildDemands({ objects: [{ identifier: "@mikro/image", id: "2" }] }).single)).toEqual(
      actionsVariables(demands.single),
    );
  });
});

describe("query variables with related contexts", () => {
  const lens = buildDemands({ objects: [{ identifier: "@mikro/arraylens", id: "9" }] });
  const returning = buildDemands({
    objects: [{ identifier: "@mikro/image", id: "1" }],
    returns: ["@mikro/image"],
  });

  it("stay exactly as before without any, so cache entries do not move", () => {
    expect(actionsVariables(demands.single, { alsoDemands: [] })).toEqual(actionsVariables(demands.single));
    expect(shortcutsVariables(demands.single, { alsoDemands: [] })).toEqual(
      shortcutsVariables(demands.single),
    );
  });

  it("ask for the selection OR each related context with anyDemands, with a limit per context", () => {
    const variables = actionsVariables(demands.single, {
      search: "max",
      exceptApp: "plugin_engine",
      alsoDemands: [lens.single],
    });
    // Search and app are siblings of anyDemands, so they bind every set.
    expect(variables.filters).toEqual({
      anyDemands: [demands.single, lens.single],
      search: "max",
      NOT: { appIdentifier: "plugin_engine" },
    });
    expect(variables.pagination).toEqual({ limit: SMART_ACTION_LIMIT * 2 });
  });

  it("list one set per related context, in order", () => {
    const other = buildDemands({ objects: [{ identifier: "@mikro/tablelens", id: "3" }] });
    const variables = shortcutsVariables(demands.single, { alsoDemands: [lens.single, other.single] });
    expect(variables.filters).toEqual({
      anyDemands: [demands.single, lens.single, other.single],
    });
    expect(variables.pagination).toEqual({ limit: SMART_SHORTCUT_LIMIT * 3 });
  });

  it("keep only args demands in every set of a blok query", () => {
    const variables = openableBloksVariables(returning.single, { alsoDemands: [lens.single] });
    expect(variables.filters).toEqual({
      anyDemands: [
        buildDemands({ objects: [{ identifier: "@mikro/image", id: "1" }] }).single,
        lens.single,
      ],
    });
    expect(variables.pagination).toEqual({ limit: SMART_BLOK_LIMIT * 2 });
  });

  it("never send an empty set (the server refuses it), falling back to plain demands", () => {
    const returnsOnly = buildDemands({ objects: [], returns: ["@mikro/image"] });
    // The page's set has no args left for a blok: only the lens' set remains,
    // and one set is asked the way it always was.
    expect(openableBloksVariables(returnsOnly.single, { alsoDemands: [[]] }).filters).toEqual({
      demands: [],
    });
    expect(actionsVariables(demands.single, { alsoDemands: [[]] })).toEqual(
      actionsVariables(demands.single),
    );
  });
});
