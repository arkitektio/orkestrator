// @vitest-environment jsdom
// (sidepane -> constants reads `window` on load)
import { describe, expect, it, vi } from "vitest";

// The card components drag the whole extension tree in (and, through
// alpaka/talk -> linkers, back into this builder). Neither is exercised here.
vi.mock("./SmartModel", () => ({ SmartModel: () => null }));
vi.mock("./Drop", () => ({ SmartDropZone: () => null }));

import { configureSmartBuilder } from "./buildSmartAdapters";
import { buildScopedSmart, buildSmart } from "./builder";
import { smartRegistry } from "./registry";

configureSmartBuilder({
  renderKnowledge: ({ identifier }) => <div data-knowledge={identifier} />,
});

describe("buildSmart", () => {
  it("registers path, name and datum, defaulting datum to false", () => {
    buildSmart({ identifier: "@test/plain", path: "test/plains", name: "Plain" });
    buildSmart({ identifier: "@test/datum", path: "test/datums", datum: true });

    expect(smartRegistry.findModel("@test/plain")).toMatchObject({
      path: "test/plains",
      name: "Plain",
      datum: false,
    });
    expect(smartRegistry.isDatum("@test/datum")).toBe(true);
  });

  it("only renders Knowledge for a datum", () => {
    const Plain = buildSmart({ identifier: "@test/plain2", path: "test/plains" });
    const Datum = buildSmart({ identifier: "@test/datum2", path: "test/datums", datum: true });

    expect(Plain.Knowledge({ object: { id: "1" } })).toBeNull();
    expect(Datum.Knowledge({ object: { id: "1" } })).toMatchObject({
      props: { "data-knowledge": "@test/datum2" },
    });
  });

  it("registers a scoped model under its claim path", () => {
    const Scoped = buildScopedSmart({
      identifier: "@test/scoped",
      claimPath: "test/claims",
      scopedPath: (graph) => `test/graphs/${graph}/nodes`,
    });

    expect(smartRegistry.getModelPath("@test/scoped")).toBe("test/claims");
    expect(Scoped.linkBuilder("abc")).toBe("/test/claims/abc");
    expect(Scoped.linkBuilder("abc", "g1")).toBe("/test/graphs/g1/nodes/abc");
  });
});
