/**
 * The display REMAP: one world axis drawn stretched (or squashed) by a factor,
 * for every layer in the scene, so a very anisotropic sample can be read.
 *
 * It is a placement preview (COORDINATE_SYSTEMS.md §1 R1b): a world delta `R`
 * left-multiplied onto each layer's server `asAffine`, so every placement
 * route, the planner, culling and the probe see an ordinary placement and
 * follow with no per-feature code. It is never written anywhere: what goes to
 * the server from a remapped view is brought back with `unremapViewPoint`, or
 * refused while the remap is on.
 *
 * Stated in WORLD order (slot and pivot), so it survives the XY / XZ / YZ
 * view, which only decides which screen slot shows that world axis.
 *
 * Pure: no store, no generated GraphQL, so its suite runs in `node`.
 */
import {
  IDENTITY_VIEW,
  type ViewAxes,
  type WorldSlot,
} from "@/core/data/scene/coords/viewAxes";

export type DisplayRemap = {
  /** The WORLD spatial slot drawn remapped (0 = x, 1 = y, 2 = z). */
  slot: WorldSlot;
  /** Drawn length / physical length along that axis. 1 = physical. */
  factor: number;
  /** The world coordinate along that axis that stays where it is. */
  pivot: number;
};

/** The slider's range: a decade either way. */
export const REMAP_RANGE = { min: 0.1, max: 10 } as const;

/** Close enough to 1 that the view is physical (the slider's own resolution). */
const UNIT_EPSILON = 1e-3;

/** True when the remap changes the drawing at all. */
export const isRemapActive = (remap: DisplayRemap | null | undefined): remap is DisplayRemap =>
  !!remap && Number.isFinite(remap.factor) && remap.factor > 0 && Math.abs(remap.factor - 1) > UNIT_EPSILON;

/** The screen slot the remapped world axis is drawn in, under `view`. */
export const remapViewSlot = (remap: DisplayRemap, view: ViewAxes | null | undefined): number =>
  (view ?? IDENTITY_VIEW).indexOf(remap.slot);

/**
 * The remap as a row-major 4×4 over VIEW slots (what three-space and every
 * placement's output side are): `x' = pivot + k · (x − pivot)` on the
 * remapped axis, identity elsewhere. Null when the remap is not active.
 */
export const remapDelta = (
  remap: DisplayRemap | null | undefined,
  view: ViewAxes | null | undefined,
): number[][] | null => {
  if (!isRemapActive(remap)) return null;
  const slot = remapViewSlot(remap, view);
  const delta = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  delta[slot][slot] = remap.factor;
  delta[slot][3] = remap.pivot * (1 - remap.factor);
  return delta;
};

/** A drawn (view-order) point back where it physically is. */
export const unremapViewPoint = (
  point: readonly [number, number, number],
  remap: DisplayRemap | null | undefined,
  view: ViewAxes | null | undefined,
): [number, number, number] => {
  const out: [number, number, number] = [point[0], point[1], point[2]];
  if (!isRemapActive(remap)) return out;
  const slot = remapViewSlot(remap, view);
  out[slot] = remap.pivot + (point[slot] - remap.pivot) / remap.factor;
  return out;
};

/** A physical (view-order) point where the remap draws it. */
export const remapViewPoint = (
  point: readonly [number, number, number],
  remap: DisplayRemap | null | undefined,
  view: ViewAxes | null | undefined,
): [number, number, number] => {
  const out: [number, number, number] = [point[0], point[1], point[2]];
  if (!isRemapActive(remap)) return out;
  const slot = remapViewSlot(remap, view);
  out[slot] = remap.pivot + (point[slot] - remap.pivot) * remap.factor;
  return out;
};

/** Relative tolerance for "this entry is zero" against the matrix' own scale. */
const ALIGN_TOLERANCE = 1e-6;

/**
 * Whether stretching view slot `slot` keeps this data→view placement a
 * stretch of the data (the layer's own axis grows) rather than a shear: some
 * data axis j lands on that axis alone, and nothing else does. A layer
 * rotated relative to the world fails, and the remap draws it sheared.
 *
 * `spatial` is the data→view spatial 4×4 (`placementToSpatialAffine`), null =
 * identity.
 */
export const isAlignedTo = (spatial: readonly (readonly number[])[] | null, slot: number): boolean => {
  if (!spatial) return true;
  const block = [0, 1, 2].map((r) => [0, 1, 2].map((c) => spatial[r][c]));
  const scale = Math.max(...block.flat().map(Math.abs));
  if (!(scale > 0)) return true;
  const zero = (value: number) => Math.abs(value) <= ALIGN_TOLERANCE * scale;
  const row = block[slot];
  const nonZero = [0, 1, 2].filter((c) => !zero(row[c]));
  // No data axis feeds this world axis (a plane placed at a fixed depth):
  // the stretch only moves it, which is no shear.
  if (nonZero.length === 0) return true;
  if (nonZero.length > 1) return false;
  const column = nonZero[0];
  return [0, 1, 2].every((r) => r === slot || zero(block[r][column]));
};

/**
 * The world slot a remap most likely wants: the axis whose drawn voxel size
 * is furthest (in log ratio) from the other two, over every volumetric layer.
 * `lattices` are lattice→view 4×4s (`LayerState.affineMatrix`); a layer with
 * no depth contributes nothing. Falls back to `fallback` (the world's z, or
 * its last space axis) when nothing is volumetric or all are isotropic.
 */
export const defaultRemapSlot = (
  lattices: readonly (readonly (readonly number[])[] | null)[],
  view: ViewAxes | null | undefined,
  available: readonly WorldSlot[],
  fallback: WorldSlot,
): WorldSlot => {
  const order = view ?? IDENTITY_VIEW;
  const score = new Map<WorldSlot, number>();
  for (const lattice of lattices) {
    if (!lattice) continue;
    const sizes = [0, 1, 2].map((r) => Math.hypot(lattice[r][0], lattice[r][1], lattice[r][2]));
    if (sizes.some((size) => !(size > 0))) continue;
    const logs = sizes.map(Math.log);
    for (let viewSlot = 0; viewSlot < 3; viewSlot++) {
      const others = logs.filter((_, index) => index !== viewSlot);
      const deviation = Math.abs(logs[viewSlot] - (others[0] + others[1]) / 2);
      const world = order[viewSlot];
      score.set(world, Math.max(score.get(world) ?? 0, deviation));
    }
  }
  let best: WorldSlot = fallback;
  let bestScore = Math.log(1.5); // below a 1.5× ratio there is nothing to fix
  for (const slot of available) {
    const value = score.get(slot) ?? 0;
    if (value > bestScore) {
      best = slot;
      bestScore = value;
    }
  }
  return available.includes(best) ? best : (available.at(-1) ?? fallback);
};

/** `a · b` for row-major 4×4 deltas (b first, then a); a null side is identity. */
export const composeDeltas = (
  a: readonly (readonly number[])[] | null,
  b: readonly (readonly number[])[] | null,
): (readonly (readonly number[])[]) | null => {
  if (!a) return b;
  if (!b) return a;
  return [0, 1, 2, 3].map((r) =>
    [0, 1, 2, 3].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c] + a[r][3] * b[3][c]),
  );
};

/**
 * The remap that draws the voxels CUBIC ("Force isotropy"): the world axis
 * whose voxel size stands out most, scaled to the geometric mean of the other
 * two. Measured on PHYSICAL lattices — `current` is divided back out of the
 * drawn ones (`LayerState.affineMatrix` carries it) — so pressing it twice
 * gives the same answer. With several volumetric layers the median factor
 * wins. Null when nothing is volumetric or the voxels are already within
 * `tolerance` of cubic; the factor is clamped to `REMAP_RANGE`.
 */
export const isotropicRemap = (
  lattices: readonly (readonly (readonly number[])[] | null)[],
  view: ViewAxes | null | undefined,
  current: DisplayRemap | null | undefined,
  available: readonly WorldSlot[],
  tolerance = 1.05,
): { slot: WorldSlot; factor: number } | null => {
  const order = view ?? IDENTITY_VIEW;
  const drawnSlot = isRemapActive(current) ? remapViewSlot(current, view) : -1;
  const physical = lattices.flatMap((lattice) => {
    if (!lattice) return [];
    const sizes = [0, 1, 2].map((r) => Math.hypot(lattice[r][0], lattice[r][1], lattice[r][2]));
    if (drawnSlot >= 0) sizes[drawnSlot] /= current!.factor;
    return sizes.every((size) => size > 0) ? [sizes] : [];
  });
  if (!physical.length) return null;

  // Per world slot: each layer's factor to cubic, and how far off it is.
  let best: { slot: WorldSlot; factors: number[]; deviation: number } | null = null;
  for (const slot of available) {
    const viewSlot = order.indexOf(slot);
    const factors = physical.map((sizes) => {
      const others = sizes.filter((_, index) => index !== viewSlot);
      return Math.sqrt(others[0] * others[1]) / sizes[viewSlot];
    });
    const deviation = Math.max(...factors.map((factor) => Math.abs(Math.log(factor))));
    if (!best || deviation > best.deviation) best = { slot, factors, deviation };
  }
  if (!best || best.deviation <= Math.log(tolerance)) return null;

  const sorted = [...best.factors].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const factor = Math.min(REMAP_RANGE.max, Math.max(REMAP_RANGE.min, median));
  return { slot: best.slot, factor };
};
