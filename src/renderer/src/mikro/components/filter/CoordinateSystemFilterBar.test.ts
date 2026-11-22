// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";

import { coordinateSystemFilters } from "./CoordinateSystemFilterBar";

const untouched = { search: "", space: "any", owner: null, createdAfter: null, createdBefore: null };

describe("coordinateSystemFilters", () => {
  it("asks nothing for an untouched row", () => {
    expect(coordinateSystemFilters(untouched)).toEqual({});
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
