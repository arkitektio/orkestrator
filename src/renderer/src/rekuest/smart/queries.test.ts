// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDemands } from "@/rekuest/smart/demands";
import { Ordering } from "@/rekuest/api/graphql";
import {
  SMART_ACTION_LIMIT,
  SMART_SHORTCUT_LIMIT,
  actionsVariables,
  shortcutsVariables,
} from "./queries";

const demands = buildDemands({ objects: [{ identifier: "@mikro/image", id: "1" }] });

describe("query variables", () => {
  it("omit an empty search and a missing collection, and ask for what can run first", () => {
    expect(actionsVariables(demands.single, { search: "" })).toEqual({
      filters: { demands: demands.single },
      ordering: [{ assignable: Ordering.Desc }],
      pagination: { limit: SMART_ACTION_LIMIT },
    });
    expect(shortcutsVariables(demands.single)).toEqual({
      filters: { demands: demands.single },
      ordering: [{ assignable: Ordering.Desc }],
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
