import { describe, expect, it } from "vitest";
import {
  arraySelectionKey,
  atOfWindows,
  channelSlices,
  keptPositions,
  pinnedIndex,
  positionWindows,
  sparseSelectionKey,
} from "./lensSelection";

describe("pinnedIndex", () => {
  it("is the dataset index a single-position slice sits at", () => {
    expect(pinnedIndex([{ axis: "c", start: 2, stop: 3, step: 1 }], "c")).toBe(2);
    expect(pinnedIndex([{ axis: "c", start: null, stop: 1, step: null }], "c")).toBe(0);
  });

  it("is null for an axis the lens keeps more than one position of", () => {
    expect(pinnedIndex([{ axis: "c", start: 1, stop: 4, step: 1 }], "c")).toBeNull();
    expect(pinnedIndex([{ axis: "c", start: 2, stop: null }], "c")).toBeNull();
  });

  it("is null for an unsliced axis, and without an axis to ask about", () => {
    expect(pinnedIndex([{ axis: "z", start: 0, stop: 1 }], "c")).toBeNull();
    expect(pinnedIndex([], "c")).toBeNull();
    expect(pinnedIndex([{ axis: "c", start: 0, stop: 1 }], null)).toBeNull();
    expect(pinnedIndex(null, "c")).toBeNull();
  });
});

describe("channelSlices", () => {
  it("pins the axis and keeps every other slice of the base", () => {
    expect(channelSlices([{ axis: "z", start: 4, stop: 9, step: 1 }], "c", 3)).toEqual([
      { axis: "z", start: 4, stop: 9, step: 1 },
      { axis: "c", start: 3, stop: 4, step: 1 },
    ]);
  });

  it("replaces a slice the base already has on the axis", () => {
    const slices = channelSlices([{ axis: "c", start: 1, stop: 4, step: 1 }], "c", 2);
    expect(slices).toEqual([{ axis: "c", start: 2, stop: 3, step: 1 }]);
  });

  it("round-trips through pinnedIndex", () => {
    expect(pinnedIndex(channelSlices(null, "c", 5), "c")).toBe(5);
  });
});

describe("keptPositions", () => {
  it("is every index of an unsliced axis", () => {
    expect(keptPositions([], "c", 4)).toEqual([0, 1, 2, 3]);
  });

  it("follows the slice: a sub-range, a step, an open stop", () => {
    expect(keptPositions([{ axis: "c", start: 2, stop: 5, step: 1 }], "c", 8)).toEqual([2, 3, 4]);
    expect(keptPositions([{ axis: "c", start: 0, stop: 6, step: 2 }], "c", 8)).toEqual([0, 2, 4]);
    expect(keptPositions([{ axis: "c", start: 6, stop: null }], "c", 8)).toEqual([6, 7]);
  });

  it("is empty for an unknown extent", () => {
    expect(keptPositions([], "c", 0)).toEqual([]);
    expect(keptPositions([], null, 0)).toEqual([]);
  });
});

describe("sparse positions and windows", () => {
  it("spells a position as windows pinning each axis, sorted by axis", () => {
    expect(positionWindows([{ axis: "gene", value: 7 }, { axis: "batch", value: 1 }])).toEqual([
      { axis: "batch", min: 1, max: 1 },
      { axis: "gene", min: 7, max: 7 },
    ]);
  });

  it("reads the position back, in the same order", () => {
    const at = [{ axis: "gene", value: 7 }, { axis: "batch", value: 1 }];
    expect(atOfWindows(positionWindows(at))).toEqual([
      { axis: "batch", value: 1 },
      { axis: "gene", value: 7 },
    ]);
  });

  it("is null for a lens that selects a range, or everything", () => {
    expect(atOfWindows([{ axis: "gene", min: 0, max: 9 }])).toBeNull();
    expect(atOfWindows([{ axis: "gene", min: 3, max: null }])).toBeNull();
    expect(atOfWindows([])).toBeNull();
    expect(atOfWindows(null)).toBeNull();
  });
});

describe("selection keys", () => {
  it("do not depend on the order slices or positions are listed in", () => {
    const a = [{ axis: "c", start: 1, stop: 2, step: 1 }, { axis: "z", start: 0, stop: 4, step: 1 }];
    expect(arraySelectionKey("d", a)).toBe(arraySelectionKey("d", [...a].reverse()));
    const at = [{ axis: "gene", value: 7 }, { axis: "batch", value: 1 }];
    expect(sparseSelectionKey("m", at)).toBe(sparseSelectionKey("m", [...at].reverse()));
  });

  it("tell containers, channels and kinds apart", () => {
    const c1 = channelSlices([], "c", 1);
    expect(arraySelectionKey("d", c1)).not.toBe(arraySelectionKey("e", c1));
    expect(arraySelectionKey("d", c1)).not.toBe(arraySelectionKey("d", channelSlices([], "c", 2)));
    expect(arraySelectionKey("d", [])).not.toBe(sparseSelectionKey("d", []));
  });

  it("read a missing step as 1", () => {
    expect(arraySelectionKey("d", [{ axis: "c", start: 1, stop: 2 }])).toBe(
      arraySelectionKey("d", [{ axis: "c", start: 1, stop: 2, step: 1 }]),
    );
  });
});
