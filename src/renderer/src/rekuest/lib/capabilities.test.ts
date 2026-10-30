import { describe, expect, it } from "vitest";

import { buildActionFilter } from "./actionBrowse";
import {
  buildCapabilityFilter,
  countCapabilityFacets,
  NO_CAPABILITY_FACETS,
  pickCapabilityFacets,
} from "./capabilities";

describe("buildCapabilityFilter", () => {
  it("is empty when no facet is set", () => {
    expect(buildCapabilityFilter(NO_CAPABILITY_FACETS)).toEqual({});
    expect(buildCapabilityFilter(undefined)).toEqual({});
  });

  it("keeps `false`: never asks is a filter, not an unset facet", () => {
    expect(
      buildCapabilityFilter({
        ...NO_CAPABILITY_FACETS,
        asks: false,
        calls: true,
        dynamicCalls: true,
      }),
    ).toEqual({ asks: false, calls: true, dynamicCalls: true });
  });

  it("counts set facets, `false` included", () => {
    expect(countCapabilityFacets({ ...NO_CAPABILITY_FACETS, informs: false, dynamicAsks: true })).toBe(2);
  });

  it("picks only the capability keys of an update, cleared ones as null", () => {
    expect(pickCapabilityFacets({ asks: true, informs: undefined })).toEqual({
      asks: true,
      informs: null,
    });
    expect(pickCapabilityFacets({})).toEqual({});
  });
});

describe("buildActionFilter with capabilities", () => {
  it("merges the capability facets into the action filter", () => {
    expect(
      buildActionFilter({
        search: "segment",
        capabilities: { ...NO_CAPABILITY_FACETS, asks: false },
      }),
    ).toEqual({ search: "segment", asks: false });
  });
});
