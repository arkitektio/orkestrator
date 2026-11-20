// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";
import { TableDatasetSpec } from "../../api/graphql";
import { tableDatasetFilter } from "./TableDatasetFilterRow";

const empty = { search: "", user: null, specs: [], from: null, to: null };

describe("tableDatasetFilter", () => {
  it("asks for nothing while the row does not narrow", () => {
    expect(tableDatasetFilter(empty)).toEqual({});
    expect(tableDatasetFilter({ ...empty, search: "   " })).toEqual({});
  });

  it("sends only what narrows", () => {
    const from = new Date("2026-11-01T00:00:00Z");
    expect(
      tableDatasetFilter({
        search: " cells ",
        user: "sub-1",
        specs: [TableDatasetSpec.Tracked],
        from,
        to: null,
      }),
    ).toEqual({
      search: "cells",
      owner: "sub-1",
      spec: [TableDatasetSpec.Tracked],
      createdAfter: from.toISOString(),
    });
  });
});
