/**
 * CPU mirror of the raymarchers' jitter hash (`rand2` in
 * `gpu/brickNodeMaterials.ts`): pcg2d over the integer pixel coordinate,
 * top 24 bits of the x lane as a float in [0, 1). u32 arithmetic is emulated
 * with `Math.imul` + `>>> 0`, which wraps exactly like WGSL's `u32`.
 */
const PCG_MUL = 1664525;
const PCG_INC = 1013904223;

export function jitterHash(px: number, py: number): number {
  let x = (Math.imul(px >>> 0, PCG_MUL) + PCG_INC) >>> 0;
  let y = (Math.imul(py >>> 0, PCG_MUL) + PCG_INC) >>> 0;
  x = (x + Math.imul(y, PCG_MUL)) >>> 0;
  y = (y + Math.imul(x, PCG_MUL)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  y = (y ^ (y >>> 16)) >>> 0;
  x = (x + Math.imul(y, PCG_MUL)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x >>> 8) / 16777216;
}
