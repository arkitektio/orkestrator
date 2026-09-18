import { describe, expect, it } from "vitest";
import { buildSpikeSource, laneCountOf, packSpikes, unitLanes } from "./spikeSource";

const layout = (indexedAxis: number, path = `layouts/axis${indexedAxis}`) => ({
  path,
  indexedAxis,
  indexOrder: [indexedAxis === 0 ? 1 : 0],
  rangeReadable: false,
});

const dataset = (over: Record<string, unknown> = {}) => ({
  id: "d",
  name: "units",
  axisNames: ["unit", "t"],
  shape: [3, 30_000],
  coordinateSystem: {
    axes: [
      { name: "unit", type: "INDEX" },
      { name: "t", type: "TIME" },
    ],
  },
  arrays: [
    { path: "layouts/axis1", indexedAxis: 1, store: { id: "s", key: "k", layouts: [layout(1)] } },
    { path: "layouts/axis0", indexedAxis: 0, store: { id: "s", key: "k", layouts: [layout(0)] } },
  ],
  ...over,
});
const world = { axes: [{ name: "time", type: "TIME" }] };
const asAffine = { matrix: [[0.1, 0]], inputAxes: ["t"], outputAxes: ["time"], total: true };

describe("buildSpikeSource", () => {
  it("reads the layout indexed on the UNIT axis, found by type", () => {
    const result = buildSpikeSource({ dataset: dataset(), asAffine, world });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.choice.layout.path).toBe("layouts/axis0");
    expect(result.source.choice.objectAxis).toBe(1);
    expect(result.source.unitCount).toBe(3);
    expect(result.source.timeMap).toMatchObject({ period: 0.1, t0: 0 });
  });

  it("works in (time, unit) order too", () => {
    const flipped = dataset({
      axisNames: ["t", "unit"],
      shape: [30_000, 3],
      arrays: [{ path: "layouts/axis1", indexedAxis: 1, store: { id: "s", key: "k", layouts: [layout(1)] } }],
    });
    const result = buildSpikeSource({ dataset: flipped, asAffine, world });
    expect(result.ok && result.source.choice.indexedAxis).toBe(1);
  });

  it("says why it cannot", () => {
    expect(
      buildSpikeSource({
        dataset: dataset({ arrays: [dataset().arrays[0]] }),
        asAffine,
        world,
      }),
    ).toEqual({ ok: false, reason: "no-unit-layout" });
    expect(
      buildSpikeSource({ dataset: dataset({ coordinateSystem: { axes: [] } }), asAffine, world }),
    ).toEqual({ ok: false, reason: "no-unit-axis" });
    expect(buildSpikeSource({ dataset: dataset(), asAffine: null, world })).toEqual({
      ok: false,
      reason: "no-placement",
    });
  });
});

describe("unitLanes", () => {
  it("orders by the given order and drops filtered units", () => {
    const lanes = unitLanes(4, [3, 1, 0, 2], (u) => u !== 1);
    expect(Array.from(lanes)).toEqual([1, -1, 2, 0]);
    expect(laneCountOf(lanes)).toBe(3);
  });

  it("defaults to index order", () => {
    expect(Array.from(unitLanes(3, null, null))).toEqual([0, 1, 2]);
  });
});

describe("packSpikes", () => {
  it("places each unit's spikes in its lane, skipping filtered units", () => {
    const block = { offsets: [0, 2, 3, 5], indices: [10, 20, 5, 1, 2], values: [1, 2, 3, 4, 5] };
    const packed = packSpikes(block, (u) => (u === 1 ? -1 : u), { period: 0.1, t0: 100 }, 100);
    expect(Array.from(packed.xs).map((x) => Math.round(x * 10) / 10)).toEqual([1, 2, 0.1, 0.2]);
    expect(Array.from(packed.lanes)).toEqual([0, 0, 2, 2]);
    expect(Array.from(packed.values)).toEqual([1, 2, 4, 5]);
  });
});
