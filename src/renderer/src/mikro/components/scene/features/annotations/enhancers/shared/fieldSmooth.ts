import type { CorridorBox } from "./corridorPlan";
import { corridorIndex } from "./corridorPlan";

/**
 * Separable box blur of a corridor cost field — the smooth-blob mode's
 * "Smooth" slider. Blurring the FIELD (not the mesh) is what makes the
 * isosurface genuinely rounder: voxel-noise bumps average away before the
 * march ever sees them, and no post-hoc mesh filter has to reconstruct
 * connectivity from a triangle soup.
 *
 * This is the CPU twin of `skeletonKernel.SKELETON_SMOOTH_WGSL`; the parity
 * self-test pins the two. Semantics both sides implement identically:
 * - Input values clamp to `clampValue` first (`tubeMarch.tubeClampValue`) —
 *   INF corridor walls must soften like any other "outside", not poison
 *   their neighbourhood with 1e30.
 * - Edges replicate (coordinate clamp), so the window count stays 2r+1
 *   everywhere and the box boundary doesn't darken.
 * - One pass per axis, x → y → z. A radius of 0 is the identity.
 *
 * The GEODESIC must never run on the blurred field — walls have to stay
 * INF-impassable — so this always writes a copy and leaves `cost` alone.
 */
export function smoothCostField(opts: {
  cost: Float32Array;
  box: CorridorBox;
  /** Box-blur radius in level voxels; <1 returns a clamped copy. */
  radius: number;
  clampValue: number;
}): Float32Array {
  const { cost, box, clampValue } = opts;
  const radius = Math.floor(opts.radius);
  const [sx, sy, sz] = box.size;

  let source = new Float32Array(cost.length);
  for (let i = 0; i < cost.length; i += 1) {
    source[i] = Math.min(cost[i], clampValue);
  }
  if (radius < 1) return source;

  let target = new Float32Array(cost.length);
  const window = 2 * radius + 1;

  for (const axis of [0, 1, 2] as const) {
    const extent = box.size[axis];
    for (let z = 0; z < sz; z += 1) {
      for (let y = 0; y < sy; y += 1) {
        for (let x = 0; x < sx; x += 1) {
          const pos = [x, y, z];
          let sum = 0;
          for (let k = -radius; k <= radius; k += 1) {
            const sample = [x, y, z];
            sample[axis] = Math.min(extent - 1, Math.max(0, pos[axis] + k));
            sum += source[corridorIndex(box, sample[0], sample[1], sample[2])];
          }
          target[corridorIndex(box, x, y, z)] = sum / window;
        }
      }
    }
    [source, target] = [target, source];
  }
  return source;
}
