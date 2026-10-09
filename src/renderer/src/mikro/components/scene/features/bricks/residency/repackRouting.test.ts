import { describe, expect, it } from "vitest";
import { GPU_REPACK_MAX_CHUNKS, gpuRepackIsCheaper } from "./repackRouting";

describe("gpuRepackIsCheaper", () => {
  it("keeps bricks made of a few chunks on the GPU", () => {
    expect(gpuRepackIsCheaper(1)).toBe(true); // brick-aligned, one channel
    expect(gpuRepackIsCheaper(27)).toBe(true); // an interior brick's halo
    expect(gpuRepackIsCheaper(GPU_REPACK_MAX_CHUNKS)).toBe(true);
  });

  it("sends bricks made of many chunks to the workers", () => {
    expect(gpuRepackIsCheaper(GPU_REPACK_MAX_CHUNKS + 1)).toBe(false);
    expect(gpuRepackIsCheaper(184)).toBe(false); // 46 planes x 4 channels
  });
});
