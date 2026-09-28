import { describe, expect, it } from "vitest";
import {
  collapsibleLensDims,
  declaredDimExtents,
  foldDimExtents,
  lensDimExtents,
  publishedMaxIndex,
  sameDimExtents,
  TIME_DIM,
  type DimContribution,
} from "./dimExtents";
import type { SceneLayerFragment } from "@/mikro/api/graphql";

const lens = (overrides?: {
  axisNames?: string[];
  shape?: number[];
  slices?: { axis: string; start?: number; stop?: number; step?: number }[];
}) =>
  ({
    axisNames: overrides?.axisNames ?? ["t", "c", "z", "y", "x"],
    shape: overrides?.shape ?? [10, 4, 36, 1024, 1024],
    slices: overrides?.slices ?? [],
  }) as never;

const IMAGE_RENDERED = ["x", "y", "z", "c", null];

describe("collapsibleLensDims", () => {
  it("returns non-rendered dims with more than one sample", () => {
    expect(collapsibleLensDims(lens(), IMAGE_RENDERED)).toEqual(["t"]);
  });

  it("drops singleton dims: one sample is a fact, not a slider", () => {
    expect(
      collapsibleLensDims(
        lens({ axisNames: ["t", "c", "z", "y", "x"], shape: [1, 4, 36, 512, 512] }),
        IMAGE_RENDERED,
      ),
    ).toEqual([]);
  });

  it("ignores nulls, so callers may splat optional axis fields in", () => {
    expect(collapsibleLensDims(lens(), ["x", "y", null, undefined, "c"])).toEqual(["t", "z"]);
  });
});

describe("lensDimExtents", () => {
  it("states the range and the lens' collapsed default", () => {
    expect(lensDimExtents(lens(), IMAGE_RENDERED)).toEqual([
      { dim: TIME_DIM, maxIndex: 9, defaultIndex: 0 },
    ]);
  });

  it("takes the default from the dim's own slice, centred like the pool does", () => {
    const sliced = lens({ slices: [{ axis: "t", start: 4, stop: 9 }] });
    expect(lensDimExtents(sliced, IMAGE_RENDERED)).toEqual([
      // start 4, stop 9 → span 5 → centre 4 + floor(4/2) = 6.
      { dim: TIME_DIM, maxIndex: 9, defaultIndex: 6 },
    ]);
  });
});

/**
 * The regression the whole feature turns on. A vector layer's DISPLACEMENT axis
 * is consumed wholesale — every component builds one glyph's offset — so it is
 * RENDERED, exactly as a phasor axis is (see `sliceSignature.test.ts`'s twin).
 * Offering a "v" slider would scrub between the x, y and z components of a flow
 * field, which means nothing.
 */
describe("declaredDimExtents — a vector layer", () => {
  const vectorLayer = (vectorAxis: string) =>
    ({
      __typename: "VectorLayer",
      id: "1",
      vectorAxis,
      lens: {
        axisNames: ["v", "t", "z", "y", "x"],
        shape: [3, 10, 32, 80, 96],
        slices: [],
        renderAxes: { x: "x", y: "y", z: "z", t: "t", intensity: null, phasor: null },
      },
    }) as unknown as SceneLayerFragment;

  it("offers t, and never the displacement axis", () => {
    expect(declaredDimExtents(vectorLayer("v"))).toEqual([
      { dim: TIME_DIM, maxIndex: 9, defaultIndex: 0 },
    ]);
  });

  it("would offer the value axis if it were not named as the vector axis", () => {
    // Guards that the exclusion is the `vectorAxis` field doing the work, not
    // an accident of the shape.
    expect(declaredDimExtents(vectorLayer("nonesuch")).map((e) => e.dim)).toEqual(["v", "t"]);
  });

  it("has nothing to say about a layer with no lens", () => {
    expect(
      declaredDimExtents({ __typename: "TrackLayer", id: "2" } as unknown as SceneLayerFragment),
    ).toEqual([]);
  });
});

describe("foldDimExtents", () => {
  const declared = (layerId: string, extent: number, def = 0): DimContribution => ({
    layerId,
    declared: true,
    extents: [{ dim: TIME_DIM, maxIndex: extent, defaultIndex: def }],
  });
  const observed = (layerId: string, extent: number): DimContribution => ({
    layerId,
    declared: false,
    extents: [{ dim: TIME_DIM, maxIndex: extent, defaultIndex: extent }],
  });

  it("merges by dim NAME: one timeline, one slider", () => {
    const folded = foldDimExtents([declared("a", 9), observed("b", 4)], {});
    expect(folded).toHaveLength(1);
    expect(folded[0].dim).toBe(TIME_DIM);
    expect(folded[0].perLayer.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("widens the range to the longest contributor", () => {
    expect(foldDimExtents([declared("a", 9), observed("b", 30)], {})[0].maxIndex).toBe(30);
  });

  it("clamps each layer's readout to its OWN extent", () => {
    const folded = foldDimExtents([declared("a", 9), observed("b", 30)], { t: 25 });
    expect(folded[0].perLayer).toEqual([
      { id: "a", index: 9, maxIndex: 9 },
      { id: "b", index: 25, maxIndex: 30 },
    ]);
  });

  it("keeps the DECLARED default: adding a track must not move an image's frame", () => {
    // The observed contributor defaults to the end of its timeline; the declared
    // one to its lens' collapsed default. Declared wins whatever the order.
    expect(foldDimExtents([observed("b", 4), declared("a", 9, 3)], {})[0].defaultIndex).toBe(3);
  });

  it("falls back to an observed default when nothing declared the dim", () => {
    // A scene of only tracks still opens on the end of its timeline, drawing
    // whole trajectories rather than an empty first frame.
    expect(foldDimExtents([observed("b", 4)], {})[0].defaultIndex).toBe(4);
  });

  it("drops a dim with a single sample", () => {
    expect(foldDimExtents([declared("a", 0)], {})).toEqual([]);
  });

  it("sorts by name, so the sliders do not reorder as layers load", () => {
    const folded = foldDimExtents(
      [
        { layerId: "a", declared: true, extents: [{ dim: "tau", maxIndex: 5, defaultIndex: 0 }] },
        declared("b", 9),
      ],
      {},
    );
    expect(folded.map((entry) => entry.dim)).toEqual(["t", "tau"]);
  });
});

describe("sameDimExtents", () => {
  it("is a VALUE compare: the publisher rebuilds the array on every read", () => {
    const a = [{ dim: TIME_DIM, maxIndex: 9, defaultIndex: 0 }];
    const b = [{ dim: TIME_DIM, maxIndex: 9, defaultIndex: 0 }];
    expect(sameDimExtents(a, b)).toBe(true);
    expect(sameDimExtents(a, [{ dim: TIME_DIM, maxIndex: 10, defaultIndex: 0 }])).toBe(false);
    expect(sameDimExtents(a, [])).toBe(false);
  });
});

describe("publishedMaxIndex", () => {
  it("reduces a published list to the SCALAR a card may subscribe to", () => {
    expect(publishedMaxIndex([{ dim: TIME_DIM, maxIndex: 9, defaultIndex: 0 }], TIME_DIM)).toBe(9);
    expect(publishedMaxIndex(undefined, TIME_DIM)).toBeUndefined();
    expect(publishedMaxIndex([], TIME_DIM)).toBeUndefined();
  });
});
