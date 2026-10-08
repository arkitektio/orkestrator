import { describe, expect, it } from "vitest";
import { anchorsForChannel, channelLabelsOf, pinOf } from "./channelAnchors";

describe("pinOf", () => {
  it("reads an integer pin, also when it is served as a string", () => {
    expect(pinOf({ c: 2 }, "c")).toBe(2);
    expect(pinOf({ c: "2" }, "c")).toBe(2);
  });

  it("is null for an axis the anchor does not pin", () => {
    expect(pinOf({ t: 4 }, "c")).toBeNull();
    expect(pinOf(null, "c")).toBeNull();
    expect(pinOf({ c: 1.5 }, "c")).toBeNull();
  });
});

describe("anchorsForChannel", () => {
  it("puts the anchor pinned to the channel before the global ones", () => {
    const global = { coordinates: {} };
    const own = { coordinates: { c: 1 } };
    const other = { coordinates: { c: 0 } };
    expect(anchorsForChannel([global, other, own], "c", 1)).toEqual([own, global]);
  });
});

describe("channelLabelsOf", () => {
  it("labels each drawn channel by its DATASET index", () => {
    const anchors = [
      { coordinates: { c: 0 }, channelLabel: { label: "GFP" } },
      { coordinates: { c: 2 }, channelLabel: { label: "DAPI" } },
    ];
    expect(channelLabelsOf(anchors, "c", [2, 1, 0])).toEqual(["DAPI", null, "GFP"]);
  });
});
