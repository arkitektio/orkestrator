import type { Vec3 } from "../../field/stamps";
import type { IntensitySampler } from "./radialProfile";
import { createTimeSlicer } from "./timeSlice";

/**
 * The BALL fit: one click → the ellipsoid that best describes the bright
 * object under it.
 *
 * The object is the region CONNECTED to the click and brighter than the
 * threshold, flooded on a regular world-space grid until its own boundary
 * stops the flood (or a distance / size limit does). Its mean is the centre;
 * its covariance gives the axes. A solid ellipsoid with semi-axes (a, b, c)
 * has variance a²/5 along each, so the semi-axes are √(5·λ) of the
 * covariance's eigenvalues — the fitted ellipsoid has the region's own
 * second moments, whatever its surface noise.
 *
 * Pure, like `radialProfile`: the data is a `sample(x, y, z)` in WORLD space.
 */

export type BallFitOptions = {
  /** Grid cell (world units) — about one voxel of the level being read. */
  cell: number;
  /** Inside = intensity ≥ threshold (same units as the sampler). */
  threshold: number;
  /** The object is followed no further than this from the click (world units). */
  maxRadius: number;
  shape: "sphere" | "ellipsoid";
  /** Multiplier on the fitted radii. */
  scale: number;
  /** Flood budget, in cells. Default 200 000. */
  maxCells?: number;
};

export type BallFit = {
  center: Vec3;
  /** Unit axes, columns of the rotation; `radii[i]` belongs to `axes[i]`. */
  axes: [Vec3, Vec3, Vec3];
  radii: Vec3;
  cells: number;
  /** False when the object reached the distance limit or outgrew the budget. */
  closed: boolean;
};

const NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

/**
 * Eigen-decomposition of a symmetric 3×3 (Jacobi rotations). `m` is
 * [xx, xy, xz, yy, yz, zz]; returns eigenvalues with matching unit vectors.
 */
export function symmetricEigen3(m: readonly number[]): { values: Vec3; vectors: [Vec3, Vec3, Vec3] } {
  const a = [
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 24; sweep++) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-14 * (Math.abs(a[0][0]) + Math.abs(a[1][1]) + Math.abs(a[2][2]) + 1e-300)) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const column = (i: number): Vec3 => [v[0][i], v[1][i], v[2][i]];
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: [column(0), column(1), column(2)] };
}

type Flood = { cells: Int32Array; count: number; touches: boolean; truncated: boolean };

/** Cells per axis the key packing has room for, each side of the seed. */
const MAX_REACH_CELLS = 4096;
const KEY_SPAN = 2 * MAX_REACH_CELLS + 1;

/**
 * ONE flood of the bright region connected to the seed, out to `maxRadius`
 * at most and `maxCells` at most. A closed object stops the flood by itself
 * — its boundary is where the brightness ends — so there is no search sphere
 * to grow and re-flood: `touches` (the object reached `maxRadius`) and
 * `truncated` (it outgrew the budget) are simply the two ways it was NOT
 * closed. Visited cells are a hash set bounded by the budget, never a dense
 * grid over the search volume. Yields between chunks (`timeSlice.ts`); null
 * when `stale` withdrew it.
 */
async function floodRegion(
  seed: Vec3,
  sample: IntensitySampler,
  cell: number,
  threshold: number,
  maxRadius: number,
  maxCells: number,
  stale: () => boolean,
): Promise<Flood | null> {
  const reach = Math.min(MAX_REACH_CELLS, Math.ceil(maxRadius / cell));
  const key = (x: number, y: number, z: number) =>
    x + MAX_REACH_CELLS + (y + MAX_REACH_CELLS) * KEY_SPAN + (z + MAX_REACH_CELLS) * KEY_SPAN * KEY_SPAN;
  const visited = new Set<number>([key(0, 0, 0)]);
  const cells = new Int32Array(maxCells * 3);
  const stack: number[] = [0, 0, 0];
  let count = 0;
  let touches = false;
  let truncated = false;
  const limit = reach * reach;
  const slicer = createTimeSlicer();
  let sinceTick = 0;
  while (stack.length > 0) {
    if (++sinceTick >= 2048) {
      sinceTick = 0;
      await slicer.tick();
      if (stale()) return null;
    }
    const z = stack.pop()!;
    const y = stack.pop()!;
    const x = stack.pop()!;
    const value = sample(seed[0] + x * cell, seed[1] + y * cell, seed[2] + z * cell);
    if (value === null || value < threshold) continue;
    if (count >= maxCells) {
      truncated = true;
      break;
    }
    cells[count * 3] = x;
    cells[count * 3 + 1] = y;
    cells[count * 3 + 2] = z;
    count += 1;
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      // The search's wall: an inside cell whose neighbour is beyond it means
      // the object may continue past what was looked at.
      if (nx * nx + ny * ny + nz * nz > limit) {
        touches = true;
        continue;
      }
      const k = key(nx, ny, nz);
      if (visited.has(k)) continue;
      visited.add(k);
      stack.push(nx, ny, nz);
    }
  }
  return { cells, count, touches, truncated };
}

/** A cell above the threshold at or right next to the click, or null. */
function settleSeed(seed: Vec3, sample: IntensitySampler, cell: number, threshold: number): Vec3 | null {
  let best: Vec3 | null = null;
  let bestValue = threshold;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const p: Vec3 = [seed[0] + dx * cell, seed[1] + dy * cell, seed[2] + dz * cell];
        const value = sample(p[0], p[1], p[2]);
        if (value === null) continue;
        // The click itself wins whenever it is inside.
        if (dx === 0 && dy === 0 && dz === 0 && value >= threshold) return p;
        if (value >= bestValue) {
          bestValue = value;
          best = p;
        }
      }
    }
  }
  return best;
}

/**
 * Null when nothing at the click is brighter than the threshold, or when
 * `stale` said a newer run took over. Async: main-thread work, sliced.
 */
export async function fitBall(
  seedWorld: Vec3,
  sample: IntensitySampler,
  opts: BallFitOptions,
  stale: () => boolean = () => false,
): Promise<BallFit | null> {
  const { cell, threshold } = opts;
  const seed = settleSeed(seedWorld, sample, cell, threshold);
  if (!seed) return null;
  const flood = await floodRegion(
    seed,
    sample,
    cell,
    threshold,
    Math.max(opts.maxRadius, 3 * cell),
    opts.maxCells ?? 200_000,
    stale,
  );
  if (!flood || flood.count === 0) return null;

  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let i = 0; i < flood.count; i++) {
    mx += flood.cells[i * 3];
    my += flood.cells[i * 3 + 1];
    mz += flood.cells[i * 3 + 2];
  }
  mx /= flood.count;
  my /= flood.count;
  mz /= flood.count;
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (let i = 0; i < flood.count; i++) {
    const x = flood.cells[i * 3] - mx;
    const y = flood.cells[i * 3 + 1] - my;
    const z = flood.cells[i * 3 + 2] - mz;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  const n = flood.count;
  // +1/12 per axis: a cell is a little cube, not a point, and for an object
  // a few cells wide that is most of its variance.
  const eigen = symmetricEigen3([xx / n + 1 / 12, xy / n, xz / n, yy / n + 1 / 12, yz / n, zz / n + 1 / 12]);
  const semi = eigen.values.map((value) => Math.sqrt(5 * Math.max(value, 1 / 12)) * cell) as unknown as [
    number,
    number,
    number,
  ];
  const radii: Vec3 =
    opts.shape === "sphere"
      ? (() => {
          // Volume-preserving: the sphere holds what the ellipsoid held.
          const r = Math.cbrt(semi[0] * semi[1] * semi[2]) * opts.scale;
          return [r, r, r] as const;
        })()
      : [semi[0] * opts.scale, semi[1] * opts.scale, semi[2] * opts.scale];

  return {
    center: [seed[0] + mx * cell, seed[1] + my * cell, seed[2] + mz * cell],
    axes: eigen.vectors,
    radii,
    cells: flood.count,
    closed: !flood.touches && !flood.truncated,
  };
}
