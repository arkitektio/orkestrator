import { describe, expect, it } from "vitest";
import { computeFixedIndices } from "./brickChunks";

type Args = Parameters<typeof computeFixedIndices>;

/** A (t, y, x) layer whose levels are chunked as given along t. */
function fixedFor(levels: { shape: number[]; chunks: number[] }[], t: number) {
  const layer = { lens: { dataset: { axisNames: ["t", "y", "x"] }, slices: [] } };
  const geometry = {
    axes: { xPos: 2, yPos: 1, zPos: -1, intensityPos: -1, phasorPos: -1 },
    phasorBins: 0,
  };
  return computeFixedIndices(
    layer as unknown as Args[0],
    geometry as unknown as Args[1],
    levels as unknown as Args[2],
    { t } as Args[3],
  );
}

describe("computeFixedIndices", () => {
  it("addresses every level by its OWN chunk extent along a collapsed dim", () => {
    // Level 0 one frame per chunk; the coarse level 306 frames per chunk (what
    // the old writer produced). Frame 250 is chunk 250 on one and chunk 0 on
    // the other — reusing level 0's coordinate asks the coarse level for a
    // chunk it does not have.
    const { fixedChunkCoords, fixedOffsets } = fixedFor(
      [
        { shape: [500, 512, 512], chunks: [1, 512, 512] },
        { shape: [500, 256, 256], chunks: [306, 256, 256] },
      ],
      250,
    );

    expect(fixedChunkCoords.map((level) => level[0])).toEqual([250, 0]);
    expect(fixedOffsets.map((level) => level[0])).toEqual([0, 250]);
  });

  it("holds the selection at the proportional index on a level that re-bins the dim", () => {
    const { fixedChunkCoords, fixedOffsets } = fixedFor(
      [
        { shape: [500, 512, 512], chunks: [1, 512, 512] },
        { shape: [250, 256, 256], chunks: [100, 256, 256] },
      ],
      499,
    );

    expect(fixedChunkCoords.map((level) => level[0])).toEqual([499, 2]);
    expect(fixedOffsets.map((level) => level[0])).toEqual([0, 49]);
  });

  it("leaves spatial dims unpinned on every level", () => {
    const { fixedChunkCoords } = fixedFor([{ shape: [5, 64, 64], chunks: [1, 64, 64] }], 3);
    expect(fixedChunkCoords).toEqual([[3, 0, 0]]);
  });
});
