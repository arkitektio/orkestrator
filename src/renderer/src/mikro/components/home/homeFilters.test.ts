import { describe, expect, it, vi } from "vitest";

// The filter row's module pulls in UI and the generated client; the mapping
// under test needs neither.
vi.mock("@/core/connection/useSelf", () => ({ useSelf: () => ({ userId: null }) }));
vi.mock("@/core/smart/display/StructureDisplay", () => ({ StructureDisplay: () => null }));
vi.mock("../../api/graphql", () => ({ useHomeFilterOptionsQuery: () => ({}) }));
vi.mock("../../specs", () => ({ ADATASET_SPECS: [{ slug: "image" }], ADATASET_SPEC_BY_SLUG: {} }));

import { homeRootFilter } from "./HomeFilters";

const from = new Date("2026-10-01T00:00:00.000Z");
const to = new Date("2026-10-22T00:00:00.000Z");

describe("homeRootFilter", () => {
  it("asks nothing for an untouched row", () => {
    expect(homeRootFilter({ search: "", user: null, collaboration: null, axis: "acquired", from: null, to: null, specs: [] })).toEqual({});
  });

  it("sends the creator and collaboration as given", () => {
    expect(homeRootFilter({ search: "", user: "42", collaboration: "7", axis: "acquired", from: null, to: null, specs: [] })).toEqual({
      owner: "42",
      collaboration: "7",
    });
  });

  it("reads the range as acquisition time on the acquired axis", () => {
    expect(homeRootFilter({ search: "", user: null, collaboration: null, axis: "acquired", from, to, specs: [] })).toEqual({
      acquiredAfter: from.toISOString(),
      acquiredBefore: to.toISOString(),
    });
  });

  it("reads the range as creation time on the created axis, never both", () => {
    expect(homeRootFilter({ search: "", user: null, collaboration: null, axis: "created", from, to: null, specs: [] })).toEqual({
      createdAfter: from.toISOString(),
    });
  });

  it("sends the specs, every one of them", () => {
    expect(
      homeRootFilter({ search: "", user: null, collaboration: null, axis: "acquired", from: null, to: null, specs: ["VOLUME", "TIMESERIES"] as never }),
    ).toEqual({ spec: ["VOLUME", "TIMESERIES"] });
  });

  it("sends the search trimmed, and nothing for blank text", () => {
    const base = { user: null, collaboration: null, axis: "acquired" as const, from: null, to: null, specs: [] };
    expect(homeRootFilter({ ...base, search: "  scan  " })).toEqual({ search: "scan" });
    expect(homeRootFilter({ ...base, search: "   " })).toEqual({});
  });
});
