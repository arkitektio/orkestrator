import { describe, expect, it } from "vitest";
import { ARRAY_LINE_SAMPLE_CAP, markerFor, planArrayLine } from "./arrayLine";
import { arrayHop } from "./__fixtures__/plans";

describe("planArrayLine", () => {
  it("reads one position along the key axis, wherever that axis sits", () => {
    expect(planArrayLine(arrayHop(), 1)).toMatchObject({
      kind: "read",
      read: { index: 0, stride: 1, axis: "t", valueAxisIndex: 1, ranges: [{ start: 0, stop: 1 }, null] },
    });
    const swapped = arrayHop({
      arrayDataset: {
        id: "ad2",
        name: "traces",
        axisNames: ["t", "cell"],
        shape: [600, 40],
        dataArrays: [{ shape: [600, 40], store: { id: "z2", key: "k" } }],
      },
    });
    expect(planArrayLine(swapped, 3n)).toMatchObject({
      kind: "read",
      read: { index: 2, valueAxisIndex: 0, ranges: [null, { start: 2, stop: 3 }] },
    });
  });

  it("takes the id as the position when the hop states no key map", () => {
    const hop = arrayHop();
    const plain = { ...hop, lookup: { ...hop.lookup, keyMap: null } };
    expect(planArrayLine(plain, 5)).toMatchObject({ kind: "read", read: { index: 5 } });
  });

  it("is absent past the extent and an error off the grid", () => {
    expect(planArrayLine(arrayHop(), 0).kind).toBe("absent");
    expect(planArrayLine(arrayHop(), 41).kind).toBe("absent");
    const hop = arrayHop();
    const halved = { ...hop, lookup: { ...hop.lookup, keyMap: { scale: 0.5, offset: 0 } } };
    expect(planArrayLine(halved, 3).kind).toBe("error");
  });

  it("strides a line longer than the cap, and reads the full-resolution level", () => {
    const length = ARRAY_LINE_SAMPLE_CAP * 3 + 1;
    const long = arrayHop({
      arrayDataset: {
        id: "ad3",
        name: "long",
        axisNames: ["cell", "t"],
        shape: [40, length],
        dataArrays: [
          { shape: [40, 100], store: { id: "coarse", key: "c" } },
          { shape: [40, length], store: { id: "full", key: "f" } },
        ],
      },
    });
    expect(planArrayLine(long, 1)).toMatchObject({
      kind: "read",
      read: { stride: 4, store: { id: "full" }, ranges: [{ start: 0, stop: 1 }, { start: 0, stop: length, step: 4 }] },
    });
  });

  it("refuses an array that is not one key axis and one value axis", () => {
    const cube = arrayHop({
      arrayDataset: { id: "ad4", name: "cube", axisNames: ["cell", "c", "t"], shape: [4, 2, 9], dataArrays: [] },
    });
    expect(planArrayLine(cube, 1).kind).toBe("error");
  });
});

describe("markerFor", () => {
  const series = { axis: "t", stride: 2, values: new Float32Array(10) };

  it("maps the probed index onto the samples, through the stride", () => {
    expect(markerFor(arrayHop(), series, { t: 6 })).toBe(3);
  });

  it("is null without a map, without the axis, or off the line", () => {
    const hop = arrayHop();
    const unmapped = { ...hop, lookup: { ...hop.lookup, valueAxisMaps: null } };
    expect(markerFor(unmapped, series, { t: 6 })).toBeNull();
    expect(markerFor(hop, series, { y: 6 })).toBeNull();
    expect(markerFor(hop, series, { t: 40 })).toBeNull();
    expect(markerFor(hop, series, null)).toBeNull();
  });
});
