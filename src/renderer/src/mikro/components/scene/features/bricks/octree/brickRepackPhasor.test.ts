// @vitest-environment jsdom
// (`platform/model/phasor` imports the generated enums, whose module touches `window` on
// load — the repack itself does not import it: the DFT is inlined there so the
// worker bundle stays free of the Apollo barrel.)
import { describe, expect, it } from "vitest";

import type { BrickSpec } from "./brickSpec";
import { repackBrick, type RepackChunk } from "./brickRepack";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import { fetchVoxelBox, nodeVoxelBox } from "./nodeAddress";
import { reduceProfile } from "../../../platform/model/phasor";

/**
 * A FLIM-shaped fixture: dims [tau, c, z, y, x] — one microtime axis of 8 bins,
 * one channel, an 8×8×1 image. The layer's render graph has one phasor node, so
 * `levelGeometry` lays out four slabs: the channel, then the node's g, s and
 * mean-photon-count.
 *
 * The whole point of the reduce path is that the phasor axis is FETCHED WHOLE
 * (every bin, across however many chunks it spans) and consumed here, so the
 * fixture deliberately chunks the microtime axis in two — the DFT has to be
 * accumulated across both chunks to be right.
 */
const DIMS = ["tau", "c", "z", "y", "x"];
const BINS = 8;
const BINS_PER_CHUNK = 4;
const LAYER = {
  xAxis: "x",
  yAxis: "y",
  zAxis: "z",
  intensityAxis: "c",
  phasorAxis: "tau",
  phasors: [{ harmonic: 1, intensityIndex: 0 }],
};

const GEO = buildLayerLevelGeometry(DIMS, LAYER, [
  {
    shape: [BINS, 1, 1, 8, 8],
    chunks: [BINS_PER_CHUNK, 1, 1, 8, 8],
    dtype: "uint16",
    storeId: "s0",
  },
])!;

// 2D-style brick: the whole 8×8 image, one z slab, no border.
const SPEC: BrickSpec = {
  payload: [8, 8, 1],
  border: 0,
  stored: [8, 8, 1],
  channelCount: GEO.channelCount,
};

/** Each pixel decays at its own rate, so no two pixels share a phasor. */
const decayFor = (x: number, y: number): number[] => {
  const tau = 1 + ((x + y) % 4); // bins
  return Array.from({ length: BINS }, (_, bin) => 100 * Math.exp(-bin / tau));
};

/** One chunk of the microtime axis: strides for [tau, c, z, y, x]. */
const makeChunk = (phasorChunk: number): RepackChunk => {
  const data = new Float32Array(BINS_PER_CHUNK * 8 * 8);
  for (let bin = 0; bin < BINS_PER_CHUNK; bin++) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        data[(bin * 8 + y) * 8 + x] = decayFor(x, y)[phasorChunk * BINS_PER_CHUNK + bin];
      }
    }
  }
  return {
    coords: [0, 0, 0],
    channelChunk: 0,
    phasorChunk,
    data: data as unknown as RepackChunk["data"],
    // chunk shape [4, 1, 1, 8, 8] → strides [64, 64, 64, 8, 1]
    shape: [BINS_PER_CHUNK, 1, 1, 8, 8],
    stride: [64, 64, 64, 8, 1],
  };
};

const repack = () => {
  const output = new Float32Array(8 * 8 * 1 * GEO.channelCount);
  const result = repackBrick({
    spec: SPEC,
    level: GEO.levels[0],
    axes: GEO.axes,
    slabs: GEO.slabs,
    phasorBins: GEO.phasorBins,
    brickBox: nodeVoxelBox(GEO, SPEC, 0, [0, 0, 0]),
    fetchBox: fetchVoxelBox(GEO, SPEC, 0, [0, 0, 0]),
    fixedOffsets: [0, 0, 0, 0, 0],
    chunks: [makeChunk(0), makeChunk(1)],
    output,
  });
  const at = (slab: number, x: number, y: number) => output[slab * 64 + y * 8 + x];
  return { output, result, at };
};

describe("levelGeometry — the slab plan", () => {
  it("lays out the channel, then the phasor node's g, s and intensity", () => {
    expect(GEO.axes.phasorPos).toBe(0);
    expect(GEO.phasorBins).toBe(BINS);
    expect(GEO.channelSlabCount).toBe(1);
    expect(GEO.slabs).toEqual([
      { kind: "channel", channel: 0 },
      { kind: "phasor", component: "g", node: 0, channel: 0, harmonic: 1 },
      { kind: "phasor", component: "s", node: 0, channel: 0, harmonic: 1 },
      { kind: "phasor", component: "i", node: 0, channel: 0, harmonic: 1 },
    ]);
    expect(GEO.channelCount).toBe(4);
  });

  it("does not reduce an axis the graph has no phasor node for", () => {
    const plain = buildLayerLevelGeometry(
      DIMS,
      { ...LAYER, phasors: [] },
      [{ shape: [BINS, 1, 1, 8, 8], chunks: [BINS, 1, 1, 8, 8], dtype: "uint16", storeId: "s0" }],
    )!;
    expect(plain.phasorBins).toBe(0);
    expect(plain.slabs).toEqual([{ kind: "channel", channel: 0 }]);
  });
});

describe("repackBrick — the phasor reduction", () => {
  it("reduces every bin of the axis into g, s and the mean photon count", () => {
    const { at } = repack();

    for (const [x, y] of [
      [0, 0],
      [3, 5],
      [7, 7],
      [2, 1],
    ]) {
      const profile = decayFor(x, y);
      const expected = reduceProfile(profile, 1);

      // Slabs 1, 2, 3 are the node's g, s, i — see the slab plan above.
      expect(at(1, x, y)).toBeCloseTo(expected.g, 5);
      expect(at(2, x, y)).toBeCloseTo(expected.s, 5);
      expect(at(3, x, y)).toBeCloseTo(expected.intensity / BINS, 4);
    }
  });

  it("accumulates the DFT ACROSS the axis' chunks (not just the first)", () => {
    const { at } = repack();
    // Reducing only the first chunk's 4 bins would give a visibly different
    // phasor: assert we do not match that truncated reduction.
    const truncated = reduceProfile(decayFor(0, 0).slice(0, BINS_PER_CHUNK), 1);
    expect(at(1, 0, 0)).not.toBeCloseTo(truncated.g, 3);
    expect(at(1, 0, 0)).toBeCloseTo(reduceProfile(decayFor(0, 0), 1).g, 5);
  });

  it("gives a plain channel slab the MEAN over the reduced axis (the intensity image)", () => {
    const { at } = repack();
    for (const [x, y] of [
      [0, 0],
      [6, 2],
    ]) {
      const profile = decayFor(x, y);
      const mean = profile.reduce((a, b) => a + b, 0) / BINS;
      expect(at(0, x, y)).toBeCloseTo(mean, 4);
      // …which is exactly the phasor node's intensity slab.
      expect(at(3, x, y)).toBeCloseTo(mean, 4);
    }
  });

  it("has no phasor at all for a pixel with no photons", () => {
    const output = new Float32Array(8 * 8 * GEO.channelCount);
    const empty = makeChunk(0);
    (empty.data as Float32Array).fill(0);
    const other = makeChunk(1);
    (other.data as Float32Array).fill(0);

    const result = repackBrick({
      spec: SPEC,
      level: GEO.levels[0],
      axes: GEO.axes,
      slabs: GEO.slabs,
      phasorBins: GEO.phasorBins,
      brickBox: nodeVoxelBox(GEO, SPEC, 0, [0, 0, 0]),
      fetchBox: fetchVoxelBox(GEO, SPEC, 0, [0, 0, 0]),
      fixedOffsets: [0, 0, 0, 0, 0],
      chunks: [empty, other],
      output,
    });

    // 0/0 is the origin with no intensity — and a brick that is uniformly zero
    // is EMPTY, so it consumes no atlas slot.
    expect([...output].every((value) => value === 0)).toBe(true);
    expect(result.uniformValue).toBe(0);
  });
});
