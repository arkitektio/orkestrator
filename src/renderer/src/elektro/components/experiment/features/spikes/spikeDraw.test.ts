import { describe, expect, it } from "vitest";
import { CLIP_TICKS_ABOVE, clipTicks, spikeDrawFor } from "./spikeDraw";

const raster = (n: number) => ({
  xs: Float64Array.from({ length: n }, (_, i) => i),
  lanes: new Uint32Array(n),
  values: new Float32Array(n),
  laneCount: 1,
  unitOfLane: Int32Array.from([0]),
});

describe("spikeDrawFor", () => {
  it("passes a modest raster through by identity", () => {
    const r = raster(1000);
    const draw = spikeDrawFor(r, null, { start: 0, end: 10 }, 1000, null);
    expect(draw.xs).toBe(r.xs);
  });

  it("clips a huge raster to the window ± half its width", () => {
    const r = raster(CLIP_TICKS_ABOVE + 10);
    const draw = spikeDrawFor(r, null, { start: 100, end: 110 }, 1000, null);
    expect(Array.from(draw.xs)).toEqual(Array.from({ length: 21 }, (_, i) => 95 + i));
  });

  it("clips colours alongside the ticks", () => {
    const clipped = clipTicks({ xs: [0, 5, 10], lanes: [0, 1, 2] }, Float32Array.from([1, 1, 1, 2, 2, 2, 3, 3, 3]), 4, 6);
    expect(Array.from(clipped.xs)).toEqual([5]);
    expect(Array.from(clipped.colors!)).toEqual([2, 2, 2]);
  });
});
