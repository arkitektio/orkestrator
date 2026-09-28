import * as THREE from "three";
import { maskedChildren } from "./fabriksGrid";
import { fabriksCellKey, type FabriksCellEntry, type FabriksCellIndex } from "./fabriksCatalogs";

/**
 * Which cells to draw, at which level — the question the whole format exists
 * to answer cheaply, and the reason `catalog/cells.parquet` is a separate file:
 * one small table, read once, decides an entire frame without opening a single
 * geometry file.
 *
 * ## The descent
 *
 * Start at the coarsest level. At each cell ask whether THIS level is good
 * enough; if it is, take the cell and stop; if it is not, descend into the
 * children `child_mask` names — so descending costs no listing and no second
 * query.
 *
 * "Good enough" is `lodError`, which the writer records as an upper bound on
 * how far a vertex at this level may sit from where it sits at level 0. It is
 * spent two ways:
 *
 *  - **in pixels** (`focalPixels`): project that distance through a perspective
 *    camera and take the coarsest level whose error stays under a pixel budget.
 *    Error shrinks with distance, so a far region settles coarse and a near one
 *    descends — the reason for an octree.
 *  - **in world units** (`errorBudget`): scale-free, for a camera-less plan.
 *
 * ## Everything here is in WORLD space
 *
 * `lodError` and the catalog's boxes are in VOXELS, and voxels are not world
 * units — with a 5× z-step, planning in voxel space is wrong by 5× in exactly
 * the direction that matters. So `buildFabriksCellIndex` transforms the boxes
 * to world AABBs once at load and scales `lodError` by the matrix's max axis
 * scale (the conservative choice: an LOD error is a scalar under an
 * anisotropic map, and its worst-case world magnitude is the max axis scale).
 * The planner then works with the real camera and the real frustum — no
 * inverse-matrix pull-through, no per-plan `Frustum` clone.
 *
 * ## Budget degrades detail, never drops geometry
 *
 * Running out of `maxCells` makes a region COARSER; it never removes it. A
 * dropped cell is a hole in a surface, which reads as corruption rather than
 * as a lower setting.
 */

export type FabriksPlanInput = {
  index: FabriksCellIndex;
  /** Camera frustum in WORLD space; null disables culling. */
  frustum: THREE.Frustum | null;
  /** Camera position in WORLD space; null plans without a camera. */
  cameraPosition: readonly [number, number, number] | null;
  /**
   * `0.5 · viewportHeight / tan(0.5 · fovY)`: an object of world size `s` at
   * distance `d` covers `s · focalPixels / d` pixels.
   */
  focalPixels: number;
  /** Screen-space error a cell may carry before it is refined. */
  pixelBudget: number;
  /** Camera-free alternative: refine while the world-space error exceeds this. */
  errorBudget?: number;
  /** Cap on planned cells. Exhausting it coarsens; it never drops a region. */
  maxCells: number;
  /**
   * Cap on the plan's TOTAL index count — the geometry budget `maxCells`
   * cannot express (cells vary by orders of magnitude in density). Exhausting
   * it coarsens exactly like `maxCells`: a refinement that would push the
   * running total over the cap keeps the coarse cell instead.
   */
  maxIndices?: number;
  /** The previous plan's selected keys, for hysteresis. */
  previousKeys?: ReadonlySet<string>;
};

export type FabriksPlan = {
  /** Selected cells, at mixed levels, near-first. */
  cells: FabriksCellEntry[];
  totalIndices: number;
  /** Regions left coarser than the budget wanted (never dropped). */
  coarsenedRegions: number;
  keys: Set<string>;
};

/**
 * Margin a cell must clear before it changes level (~15%).
 *
 * fabriks's own planner has none, but this one runs at camera-SETTLE cadence:
 * a camera parked on the budget threshold would otherwise flip a region
 * between levels — and refetch it — on consecutive plans. A cell that was
 * selected last time is stickier; one that was not has to clear a higher bar
 * to newly refine.
 */
export const LOD_HYSTERESIS = 1.15;

const EMPTY_PLAN: FabriksPlan = {
  cells: [],
  totalIndices: 0,
  coarsenedRegions: 0,
  keys: new Set(),
};

const scratchBox = new THREE.Box3();

const boxDistance = (entry: FabriksCellEntry, eye: readonly [number, number, number]): number => {
  let sum = 0;
  for (const axis of [0, 1, 2] as const) {
    const outside = Math.max(entry.worldMin[axis] - eye[axis], eye[axis] - entry.worldMax[axis], 0);
    sum += outside * outside;
  }
  return Math.sqrt(sum);
};

const inFrustum = (entry: FabriksCellEntry, frustum: THREE.Frustum | null): boolean => {
  if (!frustum) return true;
  scratchBox.min.set(entry.worldMin[0], entry.worldMin[1], entry.worldMin[2]);
  scratchBox.max.set(entry.worldMax[0], entry.worldMax[1], entry.worldMax[2]);
  return frustum.intersectsBox(scratchBox);
};

/**
 * How many pixels this cell's LOD error is worth from the camera.
 *
 * Distance is measured to the cell's BOX, not its centre: a camera inside the
 * box would otherwise report a near-zero distance from one corner and descend
 * forever — hence the explicit `Infinity`, which always refines.
 */
export function screenError(
  entry: FabriksCellEntry,
  eye: readonly [number, number, number],
  focalPixels: number,
): number {
  const distance = boxDistance(entry, eye);
  if (distance <= 0) return Number.POSITIVE_INFINITY;
  return (entry.worldLodError * focalPixels) / distance;
}

/**
 * Plan a frame from the cell catalog alone.
 *
 * Breadth-first by level rather than fabriks's max-heap: levels are bounded by
 * pyramid depth (≤ ~10), so a per-level pass is exact and needs no heap. The
 * result is a complete covering at mixed levels by construction.
 */
export function planFabriksCells(input: FabriksPlanInput): FabriksPlan {
  const { index, frustum } = input;
  const roots = index.roots.filter((entry) => inFrustum(entry, frustum));
  if (roots.length === 0) return EMPTY_PLAN;

  const eye = input.cameraPosition;
  const selected: FabriksCellEntry[] = [];
  let coarsenedRegions = 0;

  /** Is this cell's error small enough to stop here? */
  const goodEnough = (entry: FabriksCellEntry): boolean => {
    if (entry.level === 0) return true; // nothing finer exists
    if (input.errorBudget !== undefined) return entry.worldLodError <= input.errorBudget;
    if (!eye) return false;
    // Sticky: a cell that was drawn last time keeps a looser budget, one that
    // was not must clear a tighter one. Either way the band is ±15%.
    const wasSelected = input.previousKeys?.has(entry.key) ?? false;
    const budget = wasSelected ? input.pixelBudget * LOD_HYSTERESIS : input.pixelBudget / LOD_HYSTERESIS;
    return screenError(entry, eye, input.focalPixels) <= budget;
  };

  let frontier = roots;
  // Running total under the covering AS IT STANDS: every cell currently in
  // `selected`, `next` or the unvisited frontier contributes its own count.
  // Refining an entry swaps its count for its children's sum.
  let plannedIndices = roots.reduce((sum, entry) => sum + entry.indexCount, 0);
  while (frontier.length > 0) {
    const next: FabriksCellEntry[] = [];
    for (const entry of frontier) {
      if (goodEnough(entry)) {
        selected.push(entry);
        continue;
      }
      const children = maskedChildren(entry.cell, entry.childMask)
        .map((code) => index.byKey.get(fabriksCellKey(entry.level - 1, code)))
        .filter((child): child is FabriksCellEntry => child !== undefined)
        .filter((child) => inFrustum(child, frustum));

      if (children.length === 0) {
        // A leaf of the sparse pyramid: no finer geometry exists here, so this
        // cell covers its own region. Not an empty region — a coarse one.
        selected.push(entry);
        continue;
      }
      const childIndices = children.reduce((sum, child) => sum + child.indexCount, 0);
      const overCells =
        selected.length + next.length + frontier.length + children.length > input.maxCells;
      const overIndices =
        input.maxIndices !== undefined &&
        plannedIndices - entry.indexCount + childIndices > input.maxIndices;
      if (overCells || overIndices) {
        // Out of budget: keep the COARSE cell whole rather than refine it. The
        // plan stays a complete covering; only its detail degrades.
        selected.push(entry);
        coarsenedRegions++;
        continue;
      }
      plannedIndices += childIndices - entry.indexCount;
      next.push(...children);
    }
    frontier = next;
  }

  // Near-first: fetch ordering only. The plan is already complete, so this
  // decides what arrives first, never what arrives.
  const ordered = eye
    ? selected
        .map((entry) => ({ entry, distance: boxDistance(entry, eye) }))
        .sort((a, b) => a.distance - b.distance)
        .map((scored) => scored.entry)
    : selected;

  return {
    cells: ordered,
    totalIndices: ordered.reduce((sum, entry) => sum + entry.indexCount, 0),
    coarsenedRegions,
    keys: new Set(ordered.map((entry) => entry.key)),
  };
}

/**
 * Group a plan's cells by the row group that holds them.
 *
 * The whole point of the cell catalog's `(part, rowGroup)` locator: a row
 * group is the smallest thing a reader can fetch, and several planned cells
 * routinely share one. Fetching per cell would re-read the same bytes.
 *
 * Cells whose locator is null (a legal, hand-written manifest) are grouped
 * under `rowGroup: null`, which the fetcher reads as "this part, whole".
 */
export type FabriksFetchGroup = {
  level: number;
  part: number | null;
  rowGroup: number | null;
  cells: FabriksCellEntry[];
};

export function groupByRowGroup(cells: readonly FabriksCellEntry[]): FabriksFetchGroup[] {
  const groups = new Map<string, FabriksFetchGroup>();
  for (const entry of cells) {
    const key = `${entry.level}:${entry.part ?? "?"}:${entry.rowGroup ?? "?"}`;
    const group = groups.get(key);
    if (group) group.cells.push(entry);
    else {
      groups.set(key, {
        level: entry.level,
        part: entry.part,
        rowGroup: entry.rowGroup,
        cells: [entry],
      });
    }
  }
  // Insertion order is the plan's near-first order, so the nearest cell's row
  // group is fetched first.
  return [...groups.values()];
}
