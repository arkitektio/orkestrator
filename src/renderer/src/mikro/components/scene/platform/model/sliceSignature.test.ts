import { describe, expect, it } from "vitest";
import { buildSliceSignature, collapsibleDims } from "./sliceSignature";
import { resolveFixedDimIndex } from "../coords/selection";
import { resolveIntensityAxis } from "./dims";
import type { LayerState } from "./layerModel";

const makeLayer = (overrides?: {
  axisNames?: string[];
  shape?: number[];
  zAxis?: string | null;
}): LayerState =>
  ({
    xAxis: "x",
    yAxis: "y",
    zAxis: overrides?.zAxis === undefined ? "z" : overrides.zAxis,
    intensityAxis: "c",
    lens: {
      axisNames: overrides?.axisNames ?? ["t", "c", "z", "y", "x"],
      shape: overrides?.shape ?? [10, 4, 36, 1024, 1024],
      slices: [],
    },
  }) as unknown as LayerState;

/**
 * The pool-flush contract, pinned to a literal.
 *
 * `buildSliceSignature`'s output IS a brick pool's identity: the residency
 * manager flushes a layer wholesale when it changes. So a refactor of the dim
 * vocabulary underneath it — `collapsibleDims` now delegates to
 * `dimExtents.collapsibleLensDims`, shared with the non-brick lens kinds — must
 * leave the string byte-identical, or the first load after deploy refetches
 * every layer in every scene for no reason. Comparing to a recomputed value
 * would not catch that; only a literal does.
 */
describe("buildSliceSignature — the pool identity", () => {
  it("is byte-identical for a canonical layer", () => {
    expect(buildSliceSignature(makeLayer(), { t: 3 })).toBe(
      '{"xAxis":"x","yAxis":"y","zAxis":"z","intensityAxis":"c","phasorAxis":null,' +
        '"phasors":[],"selections":{"t":3},"slices":[]}',
    );
  });
});

describe("collapsibleDims", () => {
  it("returns non-rendered dims with extent > 1", () => {
    expect(collapsibleDims(makeLayer())).toEqual(["t"]);
    expect(
      collapsibleDims(
        makeLayer({ axisNames: ["t", "c", "z", "y", "x", "tau"], shape: [1, 1, 18, 512, 512, 256] }),
      ),
    ).toEqual(["tau"]); // t is singleton, tau collapses
  });
});

describe("collapsibleDims — a reduced phasor axis", () => {
  const flimLayer = (phasorAxis: string | null) =>
    ({
      ...makeLayer({ axisNames: ["tau", "c", "z", "y", "x"], shape: [256, 1, 18, 512, 512] }),
      phasorAxis,
      phasors: phasorAxis ? [{ harmonic: 1, intensityIndex: 0 }] : [],
    }) as unknown as LayerState;

  it("has no dim slider: the repack consumes every bin, so no index pins it", () => {
    // Without a phasor node the microtime axis is just another scrubbable dim…
    expect(collapsibleDims(flimLayer(null))).toEqual(["tau"]);
    // …with one, it is RENDERED (reduced into g/s/intensity slabs) and gone
    // from the sliders.
    expect(collapsibleDims(flimLayer("tau"))).toEqual([]);
  });

  it("flushes the pool when the harmonic changes (the reduction is baked into the bricks)", () => {
    const base = flimLayer("tau");
    const secondHarmonic = {
      ...base,
      phasors: [{ harmonic: 2, intensityIndex: 0 }],
    } as unknown as LayerState;
    expect(buildSliceSignature(secondHarmonic, {})).not.toBe(buildSliceSignature(base, {}));
  });

  it("does not flush the pool when only the phasor's COLOR changes", () => {
    // Mode / colormap / cursors are shader uniforms — re-fetching every brick
    // because someone dragged a cursor would be a disaster.
    const base = flimLayer("tau");
    const recolored = {
      ...base,
      phasors: [{ harmonic: 1, intensityIndex: 0, transfer: { mode: "MODULATION" } }],
    } as unknown as LayerState;
    expect(buildSliceSignature(recolored, {})).toBe(buildSliceSignature(base, {}));
  });
});

describe("buildSliceSignature with dim selections", () => {
  it("changes when a selection on the layer's own dim changes", () => {
    const layer = makeLayer();
    expect(buildSliceSignature(layer, { t: 0 })).not.toBe(buildSliceSignature(layer, { t: 1 }));
  });

  it("ignores selections for dims the layer does not collapse", () => {
    const layer = makeLayer(); // has t, not tau
    expect(buildSliceSignature(layer, { tau: 12 })).toBe(buildSliceSignature(layer, {}));
    // z / spatial / channel selections can never leak into the signature.
    expect(buildSliceSignature(layer, { z: 5, x: 3, c: 1 })).toBe(buildSliceSignature(layer, {}));
  });

  it("is stable when no selections exist (default collapse)", () => {
    const layer = makeLayer();
    expect(buildSliceSignature(layer)).toBe(buildSliceSignature(layer, {}));
  });
});

describe("resolveIntensityAxis", () => {
  const renderAxes = { x: "x", y: "y", z: null, t: "t", intensity: "c" };

  it("accepts a graph intensityAxis that is a genuine extra axis", () => {
    expect(resolveIntensityAxis("c", renderAxes)).toBe("c");
    expect(resolveIntensityAxis("lambda", renderAxes)).toBe("lambda");
  });

  it("rejects a graph intensityAxis that names a render axis (live t bug)", () => {
    // Shipped data: time-lapse layer whose ChannelSourceNode said
    // intensityAxis: "t" — 16 timepoints would become 16 channel slabs and
    // the t-slider would vanish. Falls back to renderAxes.intensity.
    expect(resolveIntensityAxis("t", { ...renderAxes, intensity: null })).toBeNull();
    expect(resolveIntensityAxis("x", renderAxes)).toBe("c");
  });

  it("falls back to renderAxes.intensity when the graph has none", () => {
    expect(resolveIntensityAxis(null, renderAxes)).toBe("c");
    expect(resolveIntensityAxis(undefined, { ...renderAxes, intensity: null })).toBeNull();
  });
});

describe("resolveFixedDimIndex", () => {
  it("prefers the slider selection, clamped to the axis", () => {
    expect(resolveFixedDimIndex(undefined, 7, 10)).toBe(7);
    expect(resolveFixedDimIndex(undefined, 99, 10)).toBe(9);
    expect(resolveFixedDimIndex(undefined, -3, 10)).toBe(0);
  });

  it("falls back to the lens slice's collapsed default", () => {
    // Center of the slice [2, 8): indices 2..7 → center 4 (floor((6-1)/2)+2).
    expect(
      resolveFixedDimIndex({ axis: "t", start: 2, stop: 8, step: 1 }, undefined, 10),
    ).toBe(4);
    expect(resolveFixedDimIndex(undefined, undefined, 10)).toBe(0);
  });
});
