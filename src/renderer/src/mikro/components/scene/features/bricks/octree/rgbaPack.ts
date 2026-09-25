/**
 * Planar → interleaved repack for RGBA8 atlases (`atlasFormat.ts` `rgba8`).
 *
 * `repackBrick` writes one z-stacked SLAB per channel (`[slab][z][y][x]`, the
 * layout every single-channel-per-texel atlas stores). An rgba8 atlas stores
 * the four slabs of a voxel in ONE texel, so the CPU path repacks planar into
 * a scratch and then interleaves here; the GPU path's kernel writes the
 * interleaved layout directly (`REPACK_KERNEL_RGBA8_WGSL`). A pool with 3
 * slabs leaves `.a` = 0.
 */

/** Interleave `slabCount` planar slabs of `voxelsPerSlab` bytes into `out`
 * (`voxelsPerSlab * 4` bytes, missing slabs zero). Returns `out`. */
export function interleaveSlabsRgba8(
  planar: Uint8Array,
  voxelsPerSlab: number,
  slabCount: number,
  out: Uint8Array,
): Uint8Array {
  const slabs = Math.min(4, slabCount);
  for (let v = 0; v < voxelsPerSlab; v++) {
    const o = v * 4;
    out[o] = planar[v];
    out[o + 1] = slabs > 1 ? planar[voxelsPerSlab + v] : 0;
    out[o + 2] = slabs > 2 ? planar[2 * voxelsPerSlab + v] : 0;
    out[o + 3] = slabs > 3 ? planar[3 * voxelsPerSlab + v] : 0;
  }
  return out;
}

/** The inverse (tests, probes over a CPU mirror). */
export function deinterleaveSlabsRgba8(
  interleaved: Uint8Array,
  voxelsPerSlab: number,
  slabCount: number,
  out: Uint8Array,
): Uint8Array {
  const slabs = Math.min(4, slabCount);
  for (let s = 0; s < slabs; s++) {
    for (let v = 0; v < voxelsPerSlab; v++) out[s * voxelsPerSlab + v] = interleaved[v * 4 + s];
  }
  return out;
}

/** Output bytes of one repacked brick for an rgba8 atlas: the planar
 * element count (`voxels × slabs`) collapses to `voxels × 4`. */
export const rgba8OutputBytes = (planarElementCount: number, slabCount: number): number =>
  (planarElementCount / Math.max(1, slabCount)) * 4;
