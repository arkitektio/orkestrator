import { describe, expect, it } from "vitest";
import { narrowRows } from "./useNarrowedRows";

const rows = [
  { name: "Maximum projection" },
  { name: "Crop" },
  { name: "Max filter" },
];
const partsOf = (row: { name: string }) => [row.name];

describe("narrowRows", () => {
  it("leaves the server rows untouched once caught up", () => {
    expect(narrowRows({ rows, serverFilter: "max", liveFilter: "max", status: "ready", partsOf })).toBe(rows);
    expect(narrowRows({ rows, serverFilter: undefined, liveFilter: "", status: "ready", partsOf })).toBe(rows);
  });

  it("narrows locally while the live filter is ahead of the server", () => {
    const narrowed = narrowRows({ rows, serverFilter: undefined, liveFilter: "max", status: "ready", partsOf });
    expect(narrowed.map((r) => r.name)).toEqual(["Max filter", "Maximum projection"]);
  });

  it("narrows while revalidating even with equal filters", () => {
    const narrowed = narrowRows({ rows, serverFilter: "crop", liveFilter: "crop", status: "revalidating", partsOf });
    expect(narrowed.map((r) => r.name)).toEqual(["Crop"]);
  });

  it("handles missing rows", () => {
    expect(narrowRows({ rows: undefined, serverFilter: undefined, liveFilter: "x", status: "loading", partsOf })).toEqual([]);
  });
});
