import { describe, expect, it } from "vitest";

import {
  affineInstants,
  columnInstants,
  formatClock,
  wallClockAt,
  foldWorldScrubbers,
  indexAt,
  lastLE,
  lookupFor,
  lookupInstants,
  nearestSnap,
  valueAt,
} from "./axisTime";

const whole = (length: number) => ({ start: 0, step: 1, length });

describe("lastLE", () => {
  it("finds the last element at or before a value", () => {
    const sorted = [0, 0.1, 0.15, 2, 7.5];
    expect(lastLE(sorted, -1)).toBe(-1);
    expect(lastLE(sorted, 0)).toBe(0);
    expect(lastLE(sorted, 1)).toBe(2);
    expect(lastLE(sorted, 2)).toBe(3);
    expect(lastLE(sorted, 100)).toBe(4);
  });
});

describe("valueAt", () => {
  it("interpolates between sample centres and extrapolates with the end spacing", () => {
    const values = [0, 1, 3];
    expect(valueAt(values, 1)).toBe(1);
    expect(valueAt(values, 1.5)).toBe(2);
    expect(valueAt(values, 2.5)).toBe(4);
    expect(valueAt(values, -0.5)).toBe(-0.5);
  });
});

describe("affineInstants", () => {
  it("reads a regularly sampled dim off the one row that is only that dim", () => {
    const placement = {
      inputAxes: ["t", "y", "x"],
      outputAxes: ["t", "y", "x"],
      matrix: [
        [0.05, 0, 0, 10],
        [0, 0.5, 0, 0],
        [0, 0, 0.5, 0],
      ],
    };
    const instants = affineInstants(placement, "t", whole(4));
    expect(instants?.worldAxis).toBe("t");
    expect([...instants!.times]).toEqual([10, 10.05, 10.1, 10.15].map((v) => expect.closeTo(v, 9)));
    expect([...instants!.indices]).toEqual([0, 1, 2, 3]);
  });

  it("is null when the dim does not reach the world", () => {
    const placement = { inputAxes: ["c", "y", "x"], outputAxes: ["y", "x"], matrix: [[0, 1, 0, 0], [0, 0, 1, 0]] };
    expect(affineInstants(placement, "c", whole(3))).toBeNull();
  });

  it("maps lens positions to dataset indices through the slice", () => {
    const placement = { inputAxes: ["t"], outputAxes: ["t"], matrix: [[2, 0]] };
    const instants = affineInstants(placement, "t", { start: 4, step: 2, length: 3 });
    expect([...instants!.indices]).toEqual([4, 6, 8]);
    expect([...instants!.times]).toEqual([0, 2, 4]);
  });
});

describe("lookupInstants", () => {
  const lookup = { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, scale: 1, offset: 0 };

  it("places each frame at its instant and picks the last frame at or before t", () => {
    const instants = lookupInstants(lookup, [0, 0.1, 0.15, 2, 7.5], whole(5))!;
    expect(indexAt(instants, -0.1)).toBeNull();
    expect(indexAt(instants, 0)).toBe(0);
    expect(indexAt(instants, 1)).toBe(2);
    expect(indexAt(instants, 7.4)).toBe(3);
    expect(indexAt(instants, 99)).toBe(4);
  });

  it("folds the server-composed slice offset and clock offset in", () => {
    const shifted = { ...lookup, innerOffset: 2, offset: 10 };
    const instants = lookupInstants(shifted, [0, 0.1, 0.15, 2, 7.5], { start: 2, step: 1, length: 3 })!;
    expect([...instants.times]).toEqual([10.15, 12, 17.5]);
    expect([...instants.indices]).toEqual([2, 3, 4]);
  });

  it("is found by input axis among the placement's fields, and only a 1-D field is one", () => {
    expect(lookupFor({ fields: [lookup] }, "t")).toBe(lookup);
    expect(lookupFor({ fields: [lookup] }, "c")).toBeNull();
    // A warp's component reads several source axes: a field, never a lookup.
    const warp = { outputAxis: "z", inputAxis: null, innerScale: null, innerOffset: null, component: 0, scale: 1, offset: 0 };
    expect(lookupFor({ fields: [warp] }, "z")).toBeNull();
  });
});

describe("foldWorldScrubbers", () => {
  it("unions every layer's instants into one scrubber per world axis", () => {
    const regular = affineInstants({ inputAxes: ["t"], outputAxes: ["t"], matrix: [[1, 0]] }, "t", whole(3))!;
    const events = lookupInstants(
      { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, scale: 1, offset: 0 },
      [0, 0.5, 2],
      whole(3),
    )!;
    const [scrubber] = foldWorldScrubbers([
      { layerId: "a", instants: [regular] },
      { layerId: "b", instants: [events] },
    ]);
    expect(scrubber.axis).toBe("t");
    expect(scrubber.snaps).toEqual([0, 0.5, 1, 2]);
    expect([scrubber.min, scrubber.max]).toEqual([0, 2]);
    expect(scrubber.layers.map((layer) => layer.id)).toEqual(["a", "b"]);
    expect(nearestSnap(scrubber.snaps, 0.8)).toBe(1);
    expect(nearestSnap(scrubber.snaps, 0.6)).toBe(0.5);
  });
});

describe("columnInstants", () => {
  it("puts a table's observed timeline on the world axis its time column reaches", () => {
    // A track table whose `frame` column is registered at 0.5 s per frame, 3 s in.
    const placement = { inputAxes: ["frame", "y", "x"], outputAxes: ["t", "y", "x"], matrix: [[0.5, 0, 0, 3], [0, 1, 0, 0], [0, 0, 1, 0]] };
    const instants = columnInstants(placement, "frame", "t", [0, 4, 10])!;
    expect(instants.worldAxis).toBe("t");
    expect(instants.dim).toBe("t");
    expect([...instants.times]).toEqual([3, 5, 8]);
    expect([...instants.indices]).toEqual([0, 1, 2]);
    expect(indexAt(instants, 6)).toBe(1);
  });

  it("is null when the time column does not reach the world", () => {
    expect(columnInstants({ inputAxes: ["y", "x"], outputAxes: ["y", "x"], matrix: [] }, "frame", "t", [0, 1])).toBeNull();
  });
});

describe("wallClockAt", () => {
  it("is the space's epoch plus t in the axis unit", () => {
    const at = wallClockAt("2026-10-22T09:00:00Z", 12.15, "second")!;
    expect(at.toISOString()).toBe("2026-10-22T09:00:12.150Z");
    expect(formatClock(at)).toBe("09:00:12.150");
    expect(wallClockAt("2026-10-22T09:00:00Z", 1500, "millisecond")!.toISOString()).toBe("2026-10-22T09:00:01.500Z");
  });

  it("is null without an epoch or a time unit", () => {
    expect(wallClockAt(null, 1, "second")).toBeNull();
    expect(wallClockAt("2026-10-22T09:00:00Z", 1, "micrometer")).toBeNull();
  });
});
