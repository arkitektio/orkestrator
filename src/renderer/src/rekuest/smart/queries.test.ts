// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDemands } from "@/providers/smart/extensions/demands";
import {
  SMART_ACTION_LIMIT,
  SMART_SHORTCUT_LIMIT,
  actionsVariables,
  implementationsVariables,
  shortcutsVariables,
} from "./queries";

const demands = buildDemands({ objects: [{ identifier: "@mikro/image", id: "1" }] });

describe("query variables", () => {
  it("omit an empty search and a missing collection", () => {
    expect(actionsVariables(demands.single, { search: "" })).toEqual({
      filters: { demands: demands.single },
      pagination: { limit: SMART_ACTION_LIMIT },
    });
    expect(shortcutsVariables(demands.single)).toEqual({
      filters: { demands: demands.single },
      pagination: { limit: SMART_SHORTCUT_LIMIT },
    });
  });

  it("carry the search and the collection when given", () => {
    expect(actionsVariables(demands.single, { search: "max", collection: "c" }).filters).toEqual({
      demands: demands.single,
      search: "max",
      inCollection: "c",
    });
    expect(implementationsVariables(demands.implementation, { search: "x" }).filters).toEqual({
      actionDemand: demands.implementation,
      search: "x",
    });
  });

  it("are deep-equal across calls (the cache-hit precondition)", () => {
    expect(actionsVariables(buildDemands({ objects: [{ identifier: "@mikro/image", id: "2" }] }).single)).toEqual(
      actionsVariables(demands.single),
    );
  });
});
