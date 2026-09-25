import * as THREE from "three";
import { konnektionCellKey, type KonnektionCellEntry, type KonnektionCellIndex } from "./konnektionCatalogs";

/**
 * Which cells to draw, and at which level.
 *
 * ## Why this is not `fabriksPlanner.ts`
 *
 * The mesh planner descends the octree per cell and returns a plan at MIXED
 * levels — a far region coarse, a near one fine, meeting without a crack
 * because fabriks declares `boundary: LOCKED` and its clipped vertices are
 * pinned to the cell plane.
 *
 * **konnektion makes no such claim, and its absence is a design decision rather
 * than an omission.** Two reasons, neither fixable:
 *
 *  - A traced node sits wherever the tracer put it. Unlike a clipped triangle's
 *    new vertices, there are typically NO nodes on a cell plane to pin, so the
 *    claim would quantify over an empty set.
 *  - Coarsening drops whole branches. A branch present at level 0 may be absent
 *    at level 1 *entirely* — that is what Strahler pruning is for — and no
 *    amount of pinning recovers an edge one level has and the other does not.
 *
 * So a seam between levels here is not a crack, it is a **missing branch**, and
 * mixing levels across a plane would draw a dendrite that stops in mid-air.
 *
 * What konnektion offers instead is that every level is INDEPENDENTLY correct:
 * coarsening is decided per object over the whole graph and only then
 * partitioned into cells, so within one level every cell agrees and a ghost is
 * always a copy of a node that really is there. The format's own reading advice
 * follows directly — *"draw a contiguous region at one level"* — and it is
 * cheap here in a way it is not for meshes, a graph being far smaller than the
 * surface it runs through.
 *
 * ## So: choose a level, then cull
 *
 * 1. Pick ONE level for the whole collection, the coarsest whose worst
 *    in-view screen error stays under the pixel budget.
 * 2. Frustum-cull that level's cells and order them near-first.
 *
 * Everything is in WORLD space. `lodError` and the catalog's boxes are in
 * VOXELS, and voxels are not world units — with a 5× z-step, planning in voxel
 * space is wrong by 5× in exactly the direction that matters — so
 * `buildKonnektionCellIndex` transforms boxes to world AABBs once at load and
 * scales `lodError` by the matrix's max axis scale.
 */

export type KonnektionPlanInput = {
  index: KonnektionCellIndex;
  /** Camera frustum in WORLD space; null disables culling. */
  frustum: THREE.Frustum | null;
  /** Camera position in WORLD space; null plans without a camera. */
  cameraPosition: readonly [number, number, number] | null;
  /**
   * `0.5 · viewportHeight / tan(0.5 · fovY)`: an object of world size `s` at
   * distance `d` covers `s · focalPixels / d` pixels.
   */
  focalPixels: number;
  /** Screen-space error a level may carry before a finer one is chosen. */
  pixelBudget: number;
  /** Camera-free alternative (an ORTHOGRAPHIC camera has no focal length):
   *  choose while the world-space error exceeds this. Without it an ortho plan
   *  refines to level 0 unconditionally. */
  errorBudget?: number;
  /** The layer's `maxLevel` — a BUDGET capping detail, not a choice of level.
   *  Null lets the viewer decide. */
  maxLevel?: number | null;
  /** Cap on planned cells. Exhausting it coarsens where a coarser level
   *  exists, and TRUNCATES the plan near-first where none does. */
  maxCells: number;
  /**
   * Hard caps on what a plan may ask to decode and draw, in catalog counts
   * (nodes include ghosts — a ghost is decoded and buffered like any node).
   *
   * These are the OOM guard. `maxCells` alone cannot be one: a single-level
   * collection — the expected case for traced data — has nothing coarser to
   * fall back to, so without a count budget the plan is "the whole collection",
   * whatever its size. Exceeding a budget truncates the near-first ordering
   * rather than refusing to draw: a partial network labelled `truncated` beats
   * an allocation the renderer dies inside.
   */
  maxNodes?: number;
  maxEdges?: number;
  /** The level the previous plan chose, for hysteresis. */
  previousLevel?: number | null;
};

export type KonnektionPlan = {
  /** The one level every selected cell belongs to. */
  level: number;
  /** Selected cells at that level, near-first. */
  cells: KonnektionCellEntry[];
  totalNodes: number;
  totalEdges: number;
  /** True when a budget forced a coarser level than the error wanted. */
  coarsenedForBudget: boolean;
  /** True when the chosen level itself blew a budget and was cut near-first —
   *  the far part of the network is missing, deliberately. */
  truncated: boolean;
  keys: Set<string>;
};

/**
 * Margin a level must clear before the plan switches to it (~15%).
 *
 * The plan runs at camera-SETTLE cadence, so a camera parked on the threshold
 * would otherwise flip the WHOLE COLLECTION between levels — and refetch all of
 * it — on consecutive plans. Far more visible here than for meshes, where a
 * flip affects one region: switching level in a graph can make branches appear
 * and disappear wholesale.
 */
export const LOD_HYSTERESIS = 1.15;

const scratchBox = new THREE.Box3();

const boxDistance = (
  entry: KonnektionCellEntry,
  eye: readonly [number, number, number],
): number => {
  let sum = 0;
  for (const axis of [0, 1, 2] as const) {
    const outside = Math.max(entry.worldMin[axis] - eye[axis], eye[axis] - entry.worldMax[axis], 0);
    sum += outside * outside;
  }
  return Math.sqrt(sum);
};

const inFrustum = (entry: KonnektionCellEntry, frustum: THREE.Frustum | null): boolean => {
  if (!frustum) return true;
  scratchBox.min.set(entry.worldMin[0], entry.worldMin[1], entry.worldMin[2]);
  scratchBox.max.set(entry.worldMax[0], entry.worldMax[1], entry.worldMax[2]);
  return frustum.intersectsBox(scratchBox);
};

/**
 * How many pixels this cell's LOD error is worth from the camera.
 *
 * Distance is to the cell BOX, not its centre: a camera inside a cell gets
 * distance 0 and therefore infinite error, which refines — the right answer,
 * where a centre distance would happily leave the cell you are standing in
 * coarse.
 */
export function screenError(
  entry: KonnektionCellEntry,
  eye: readonly [number, number, number],
  focalPixels: number,
): number {
  const distance = boxDistance(entry, eye);
  if (distance <= 0) return Number.POSITIVE_INFINITY;
  return (entry.worldLodError * focalPixels) / distance;
}

const emptyPlan = (level: number): KonnektionPlan => ({
  level,
  cells: [],
  totalNodes: 0,
  totalEdges: 0,
  coarsenedForBudget: false,
  truncated: false,
  keys: new Set(),
});

/** Whether a level's visible cells exceed any budget, without materializing
 *  anything: an early-out sum over catalog counts. */
function overBudget(cells: readonly KonnektionCellEntry[], input: KonnektionPlanInput): boolean {
  const maxNodes = input.maxNodes ?? Number.POSITIVE_INFINITY;
  const maxEdges = input.maxEdges ?? Number.POSITIVE_INFINITY;
  if (cells.length > input.maxCells) return true;
  let nodes = 0;
  let edges = 0;
  for (const entry of cells) {
    nodes += entry.nodeCount + entry.ghostCount;
    edges += entry.edgeCount;
    if (nodes > maxNodes || edges > maxEdges) return true;
  }
  return false;
}

/**
 * Cut a level's cells to the budgets, keeping the given (near-first) order.
 *
 * The first cell is always kept even when it alone exceeds a budget — a cell is
 * the atom of the format and cannot be subdivided, and drawing nothing would
 * read as an empty collection rather than as a budget.
 */
function capToBudgets(
  cells: readonly KonnektionCellEntry[],
  input: KonnektionPlanInput,
): { cells: KonnektionCellEntry[]; truncated: boolean } {
  const maxNodes = input.maxNodes ?? Number.POSITIVE_INFINITY;
  const maxEdges = input.maxEdges ?? Number.POSITIVE_INFINITY;
  const kept: KonnektionCellEntry[] = [];
  let nodes = 0;
  let edges = 0;
  for (const entry of cells) {
    const nextNodes = nodes + entry.nodeCount + entry.ghostCount;
    const nextEdges = edges + entry.edgeCount;
    if (
      kept.length > 0 &&
      (kept.length >= input.maxCells || nextNodes > maxNodes || nextEdges > maxEdges)
    ) {
      return { cells: kept, truncated: true };
    }
    kept.push(entry);
    nodes = nextNodes;
    edges = nextEdges;
  }
  return { cells: kept, truncated: false };
}

/**
 * Cells of one level that survive the frustum, ordered near-first.
 *
 * Ordering is FETCH PRIORITY only — every cell in the list is drawn, so the
 * order changes when something appears, never whether it does.
 */
function visibleCells(
  index: KonnektionCellIndex,
  level: number,
  input: KonnektionPlanInput,
): KonnektionCellEntry[] {
  const all = index.byLevel.get(level) ?? [];
  const visible = all.filter((entry) => inFrustum(entry, input.frustum));
  const eye = input.cameraPosition;
  if (!eye) return visible;
  return visible
    .map((entry) => ({ entry, distance: boxDistance(entry, eye) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ entry }) => entry);
}

/**
 * Whether a level is detailed enough to draw as-is.
 *
 * Level 0 always is — there is nothing finer, so the question does not arise.
 * `stickiness` implements the hysteresis: the level already on screen is
 * judged against a looser budget than one the plan would newly switch to.
 */
function goodEnough(
  cells: readonly KonnektionCellEntry[],
  level: number,
  input: KonnektionPlanInput,
  stickiness: number,
): boolean {
  if (level === 0) return true;
  if (cells.length === 0) return true;

  if (input.errorBudget !== undefined || !input.cameraPosition || input.focalPixels <= 0) {
    // Scale-free branch: an orthographic camera has no focal length, so a
    // screen error cannot be formed and a world-space budget is used instead.
    const budget = (input.errorBudget ?? 0) * stickiness;
    if (budget <= 0) return false;
    return cells.every((entry) => entry.worldLodError <= budget);
  }

  const budget = input.pixelBudget * stickiness;
  const eye = input.cameraPosition;
  // The WORST in-view cell decides, because the level is chosen for all of
  // them: one cell too coarse to read is a level too coarse to draw.
  return cells.every((entry) => screenError(entry, eye, input.focalPixels) <= budget);
}

/**
 * Choose one level and the cells of it that are in view.
 *
 * Walks coarse → fine and takes the FIRST level that is good enough, so the
 * cheapest acceptable level wins. `maxLevel` caps the coarse end (it is a
 * budget on detail); `maxCells` caps the fine end, and exhausting it keeps the
 * coarser level rather than dropping cells — a dropped cell is a missing
 * branch, which reads as corrupt data rather than as a lower setting.
 */
export function planKonnektionCells(input: KonnektionPlanInput): KonnektionPlan {
  const { index } = input;
  if (index.levels.length === 0) return emptyPlan(0);

  const cap = input.maxLevel ?? Number.POSITIVE_INFINITY;
  // Coarse → fine, never coarser than the catalog's root, never finer than 0.
  const candidates = [...index.levels]
    .filter((level) => level <= Math.min(index.root, cap))
    .sort((a, b) => b - a);
  if (candidates.length === 0) return emptyPlan(index.levels[0]);

  let coarsenedForBudget = false;
  let chosen: { level: number; cells: KonnektionCellEntry[] } | null = null;

  for (const level of candidates) {
    const cells = visibleCells(index, level, input);
    const sticky = level === input.previousLevel ? LOD_HYSTERESIS : 1 / LOD_HYSTERESIS;

    if (chosen && overBudget(cells, input)) {
      // Refining further would blow a budget. Keep what we have and say so,
      // rather than draw a partial level when a whole coarser one exists.
      coarsenedForBudget = true;
      break;
    }
    chosen = { level, cells };
    if (goodEnough(cells, level, input, sticky)) break;
  }

  if (!chosen) return emptyPlan(candidates[0]);

  // The coarsest level is taken unconditionally above — there is nothing to
  // fall back to — so it must still answer to the budgets. Without this cut a
  // single-level collection plans ITSELF, whole, whatever its size.
  const capped = capToBudgets(chosen.cells, input);

  let totalNodes = 0;
  let totalEdges = 0;
  for (const entry of capped.cells) {
    totalNodes += entry.nodeCount;
    totalEdges += entry.edgeCount;
  }

  return {
    level: chosen.level,
    cells: capped.cells,
    totalNodes,
    totalEdges,
    coarsenedForBudget,
    truncated: capped.truncated,
    keys: new Set(capped.cells.map((entry) => konnektionCellKey(entry.level, entry.cell))),
  };
}

/** One fetch: the cells of a plan that share a (level, part, row group). */
export type KonnektionFetchGroup = {
  level: number;
  part: number | null;
  rowGroup: number | null;
  cells: KonnektionCellEntry[];
};

/**
 * Group a plan's cells by their locator.
 *
 * This is the whole point of the catalog's `part`/`row_group` columns: several
 * planned cells routinely live in one row group, and a row group is the
 * smallest thing a reader can fetch. Grouping turns N cells into far fewer
 * ranged reads.
 *
 * Order is preserved from the plan, so near-first survives into fetch order.
 */
export function groupByRowGroup(cells: readonly KonnektionCellEntry[]): KonnektionFetchGroup[] {
  const groups = new Map<string, KonnektionFetchGroup>();
  for (const entry of cells) {
    const key = `${entry.level}:${entry.part ?? "?"}:${entry.rowGroup ?? "?"}`;
    const existing = groups.get(key);
    if (existing) existing.cells.push(entry);
    else {
      groups.set(key, {
        level: entry.level,
        part: entry.part,
        rowGroup: entry.rowGroup,
        cells: [entry],
      });
    }
  }
  return [...groups.values()];
}
