// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";

import { coordinateSystemFilters } from "./CoordinateSystemFilterBar";

const untouched = { search: "", space: "any", units: "all", owner: null, createdAfter: null, createdBefore: null };

describe("coordinateSystemFilters", () => {
  it("asks nothing for a row that narrows nothing", () => {
    expect(coordinateSystemFilters(untouched)).toEqual({});
  });

  it("asks for physical spaces, or index spaces, by their units", () => {
    expect(coordinateSystemFilters({ ...untouched, units: "physical" })).toEqual({ physical: true });
    expect(coordinateSystemFilters({ ...untouched, units: "index" })).toEqual({ physical: false });
  });

  it("sends uninhabited false only when 'Holds data' is picked", () => {
    expect(coordinateSystemFilters({ ...untouched, space: "data" })).toEqual({ uninhabited: false });
    expect(coordinateSystemFilters({ ...untouched, space: "frames" })).toEqual({ uninhabited: true });
  });

  it("maps search, creator and range", () => {
    const after = new Date("2026-01-01T00:00:00Z");
    expect(
      coordinateSystemFilters({ ...untouched, search: "  stage ", owner: "2", createdAfter: after }),
    ).toEqual({ search: "stage", owner: "2", createdAfter: "2026-01-01T00:00:00.000Z" });
  });
});
