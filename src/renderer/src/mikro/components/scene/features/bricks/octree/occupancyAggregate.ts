import type { BrickSpec } from "./brickSpec";
import type { LayerLevelGeometry, Vec3 } from "../../../platform/coords/levelGeometry";
import { brickGridForLevel, childrenOf, nodeBaseBox, nodeKey } from "./nodeAddress";

/**
 * Hierarchical-occupancy aggregation (R4, `orkestrator.occHierarchy`) —
 * the pure CPU half; the impure hooks live in `features/bricks/residency/brickResidency.ts`
 * and the GPU write in `pageTableTexture.setAggregateEntry`.
 *
 * GROUNDING RULE (the R4 caveat, made precise): the aggregate texel at
 * (level h, cell c) bounds ONLY the level-(h−1) bricks overlapping that
 * cell, as the conservative union of their MEASURED (repack-scan) ranges.
 * Coarse pyramid DATA never bounds fine data (mean/max/nearest downsampling
 * all keep coarser values inside the finer hull, never the reverse), so an
 * aggregate is written only when EVERY child's range is known — absent
 * (all-zero) means "unknown, never hop". The child set is EXACTLY
 * `childrenOf(geometry, spec, h, c)`: `parentCellsOf` below is defined by
 * membership in that enumeration, so completeness bookkeeping and the
 * aggregation contract can never disagree — including on non-dyadic
 * pyramids where a straddling child overlaps two parents
 * (COORDINATE_SYSTEMS.md "Known planner nit").
 *
 * Measured ranges are statements about the DATA, not residency: they
 * survive eviction and are invalidated only by a pool flush.
 */

const sameCoords = (a: Vec3, b: Vec3): boolean =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * The level-(childLevel+1) cells whose child enumeration contains the given
 * child brick. Candidates come from the child's base box divided by the
 * parent cell extent (±1 guard for the fractional-scale straddle), then are
 * filtered by actual `childrenOf` membership — the single source of truth.
 */
export function parentCellsOf(
  geometry: LayerLevelGeometry,
  spec: BrickSpec,
  childLevel: number,
  childCoords: Vec3,
): Vec3[] {
  const parentLevel = childLevel + 1;
  if (parentLevel >= geometry.levels.length) return [];
  const grid = brickGridForLevel(geometry, spec, parentLevel);
  const scale = geometry.levels[parentLevel].scale;
  const box = nodeBaseBox(geometry, spec, childLevel, childCoords);

  const lo: number[] = [];
  const hi: number[] = [];
  for (const axis of [0, 1, 2] as const) {
    const extent = spec.payload[axis] * scale[axis];
    lo.push(Math.max(0, Math.floor(box.min[axis] / extent) - 1));
    hi.push(Math.min(grid[axis], Math.ceil(box.max[axis] / extent) + 1));
  }

  const parents: Vec3[] = [];
  for (let z = lo[2]; z < hi[2]; z++)
    for (let y = lo[1]; y < hi[1]; y++)
      for (let x = lo[0]; x < hi[0]; x++) {
        const cell: Vec3 = [x, y, z];
        const children = childrenOf(geometry, spec, parentLevel, cell);
        if (children.some((c) => sameCoords(c, childCoords))) parents.push(cell);
      }
  return parents;
}

/**
 * The conservative union of the measured ranges of every child of
 * (parentLevel, parentCell) — or null when any child is unknown (or the
 * cell has no children at all): the "write only when complete" contract.
 */
/**
 * Per-slab twin of `aggregateIfComplete` (`orkestrator.occPerSlab`): the
 * slab-wise union of every child's measured slab ranges, or null when any
 * child is unknown. Same children enumeration, same completeness contract —
 * a child measured only as a union (older entry) is unknown per slab.
 */
export function aggregateSlabsIfComplete(
  geometry: LayerLevelGeometry,
  spec: BrickSpec,
  parentLevel: number,
  parentCell: Vec3,
  measuredSlabRanges: ReadonlyMap<string, readonly (readonly [number, number])[]>,
  slabCount: number,
): [number, number][] | null {
  const children = childrenOf(geometry, spec, parentLevel, parentCell);
  if (children.length === 0) return null;
  const out: [number, number][] = Array.from({ length: slabCount }, () => [
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]);
  for (const child of children) {
    const ranges = measuredSlabRanges.get(nodeKey(parentLevel - 1, child));
    if (!ranges || ranges.length < slabCount) return null;
    for (let s = 0; s < slabCount; s++) {
      if (ranges[s][0] < out[s][0]) out[s][0] = ranges[s][0];
      if (ranges[s][1] > out[s][1]) out[s][1] = ranges[s][1];
    }
  }
  return out;
}

export function aggregateIfComplete(
  geometry: LayerLevelGeometry,
  spec: BrickSpec,
  parentLevel: number,
  parentCell: Vec3,
  measuredRanges: ReadonlyMap<string, readonly [number, number]>,
): [number, number] | null {
  const children = childrenOf(geometry, spec, parentLevel, parentCell);
  if (children.length === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const child of children) {
    const range = measuredRanges.get(nodeKey(parentLevel - 1, child));
    if (!range) return null;
    if (range[0] < min) min = range[0];
    if (range[1] > max) max = range[1];
  }
  return [min, max];
}
