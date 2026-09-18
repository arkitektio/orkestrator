import { describe, expect, it } from "vitest";
import {
  axisNamesOf,
  axisSize,
  channelAxisName,
  channelCount,
  sampleCount,
  timeAxisName,
  valueAxisName,
} from "./timeAxis";

const sys = (...axes: { name: string; type?: string; order?: number }[]) => ({
  axes,
});

describe("timeAxisName", () => {
  it("picks TIME regardless of position", () => {
    expect(timeAxisName(sys({ name: "c", type: "CHANNEL" }, { name: "t", type: "TIME" }))).toBe("t");
    expect(timeAxisName(sys({ name: "t", type: "TIME" }, { name: "c", type: "CHANNEL" }))).toBe("t");
  });

  it("is not fooled by the other axis types", () => {
    expect(
      timeAxisName(
        sys(
          { name: "i", type: "INDEX" },
          { name: "f", type: "FREQUENCY" },
          { name: "v", type: "VALUE" },
          { name: "x", type: "SPACE" },
        ),
      ),
    ).toBeNull();
  });

  it("returns null rather than guessing a position", () => {
    // The failure this prevents: treating axis 0 as time reads a (channel, time)
    // dataset backwards and still returns numbers.
    expect(timeAxisName(sys({ name: "c", type: "CHANNEL" }))).toBeNull();
    expect(timeAxisName(sys())).toBeNull();
    expect(timeAxisName(null)).toBeNull();
    expect(timeAxisName(undefined)).toBeNull();
  });

  it("respects declared order when several axes share a type", () => {
    expect(
      timeAxisName(
        sys({ name: "late", type: "TIME", order: 5 }, { name: "early", type: "TIME", order: 1 }),
      ),
    ).toBe("early");
  });

  it("falls back to array order when `order` is absent", () => {
    expect(timeAxisName(sys({ name: "first", type: "TIME" }, { name: "second", type: "TIME" }))).toBe(
      "first",
    );
  });
});

describe("channelAxisName / valueAxisName", () => {
  it("finds each by type", () => {
    const s = sys({ name: "t", type: "TIME" }, { name: "ch", type: "CHANNEL" }, { name: "val", type: "VALUE" });
    expect(channelAxisName(s)).toBe("ch");
    expect(valueAxisName(s)).toBe("val");
  });

  it("gives null for a recording's own system, which has no VALUE axis", () => {
    // Values are the data there, not a coordinate; only a drawing space has one.
    expect(valueAxisName(sys({ name: "t", type: "TIME" }))).toBeNull();
  });
});

describe("axisNamesOf", () => {
  it("returns declared order", () => {
    expect(
      axisNamesOf(sys({ name: "b", type: "TIME", order: 1 }, { name: "a", type: "CHANNEL", order: 0 })),
    ).toEqual(["a", "b"]);
  });
});

describe("axisSize", () => {
  it("reads the length of the named axis", () => {
    expect(axisSize(["c", "t"], [4, 1000], "t")).toBe(1000);
    expect(axisSize(["c", "t"], [4, 1000], "c")).toBe(4);
  });

  it("is null for an absent axis", () => {
    expect(axisSize(["c", "t"], [4, 1000], "z")).toBeNull();
    expect(axisSize(["c", "t"], [4, 1000], null)).toBeNull();
  });

  it("refuses a mismatched axisNames/shape pair instead of reading past the end", () => {
    expect(axisSize(["c", "t"], [1000], "t")).toBeNull();
  });

  it("is null when either side is missing", () => {
    expect(axisSize(null, [1000], "t")).toBeNull();
    expect(axisSize(["t"], null, "t")).toBeNull();
  });
});

describe("channelCount", () => {
  it("counts along the CHANNEL axis", () => {
    expect(
      channelCount({
        axisNames: ["c", "t"],
        shape: [8, 1000],
        intrinsicSystem: sys({ name: "c", type: "CHANNEL" }, { name: "t", type: "TIME" }),
      }),
    ).toBe(8);
  });

  it("counts a single-channel trace as one, not zero", () => {
    // A 1-D recording has no channel axis but is still one line.
    expect(
      channelCount({
        axisNames: ["t"],
        shape: [1000],
        intrinsicSystem: sys({ name: "t", type: "TIME" }),
      }),
    ).toBe(1);
  });

  it("falls back to one when the system is unknown", () => {
    expect(channelCount({ axisNames: ["t"], shape: [10] })).toBe(1);
  });
});

describe("sampleCount", () => {
  it("counts along the TIME axis whichever position it is at", () => {
    const system = sys({ name: "c", type: "CHANNEL" }, { name: "t", type: "TIME" });
    expect(sampleCount({ axisNames: ["c", "t"], shape: [8, 1000], intrinsicSystem: system })).toBe(1000);
  });

  it("is null without a time axis", () => {
    expect(
      sampleCount({
        axisNames: ["c"],
        shape: [8],
        intrinsicSystem: sys({ name: "c", type: "CHANNEL" }),
      }),
    ).toBeNull();
  });
});
