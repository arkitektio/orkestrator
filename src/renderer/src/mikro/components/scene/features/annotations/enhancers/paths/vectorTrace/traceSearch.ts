/**
 * A* over a 3D voxel lattice — the search behind the vector enhancer.
 *
 * The tool computes a path only when the user clicks (one hop between two known
 * waypoints), which is exactly the case A* is for: a single source and a single
 * goal, with a heuristic to prune. The livewire alternative — Dijkstra from a
 * seed, keeping the back-pointer field — only pays off when a moving cursor asks
 * for a new path every frame, and nothing here does.
 *
 * The grid is a plain cost field: `cost[node]` says how much this voxel RESISTS
 * being travelled through, in [0, 1], or `Infinity` for "cannot" (nothing
 * resident there). What makes a voxel cheap — bright, edge-like, near the chord
 * between the waypoints — is `traceCost.ts`'s business, not this module's.
 *
 * Steps are measured in WORLD length, not in voxels. Z spacing is routinely
 * several times the xy spacing, and a lattice that treats every step as 1 would
 * quietly prefer z-hops because they cover more ground for the same price.
 */

import { MinHeap as NodeHeap } from "../../shared/binaryHeap";

/** Node coordinates in the search grid (not level-0 voxels — see `traceBox`). */
export type TraceNode = [number, number, number];

export type TraceGrid = {
  /** Node counts along x, y, z. */
  size: readonly [number, number, number];
  /** World length of ONE node step along each axis. */
  spacing: readonly [number, number, number];
  /**
   * Per-node resistance in [0, 1]; `Infinity` is impassable. Indexed
   * x-fastest: `x + y * size[0] + z * size[0] * size[1]`.
   */
  cost: Float32Array;
};

export type TraceSearchOptions = {
  /**
   * Max nodes expanded before the search gives up. A cap, not a target: it
   * exists so one pathological hop cannot wedge the UI thread.
   */
  budget?: number;
};

export type TraceFailure = "blocked-endpoint" | "unreachable" | "budget";

export type TraceResult =
  | { ok: true; path: TraceNode[]; expanded: number }
  | { ok: false; reason: TraceFailure; expanded: number };

/**
 * The floor on per-step cost. Two jobs: it keeps the metric strictly positive
 * (a zero-cost region would let the path wander through it for free), and it is
 * the minimum per-unit cost the heuristic multiplies by, which is what makes
 * that heuristic admissible — and so the result optimal for these weights.
 */
export const TRACE_BASE_COST = 0.05;

/** Default expansion cap: ~a second of work in the worst case, far less in practice. */
export const DEFAULT_TRACE_BUDGET = 2_000_000;

const nodeIndex = (
  x: number,
  y: number,
  z: number,
  size: readonly [number, number, number],
): number => x + y * size[0] + z * size[0] * size[1];

const inBounds = (
  x: number,
  y: number,
  z: number,
  size: readonly [number, number, number],
): boolean =>
  x >= 0 && y >= 0 && z >= 0 && x < size[0] && y < size[1] && z < size[2];

/** The 26 neighbours of a voxel: every ±1 combination except staying put. */
const neighbourOffsets = (): [number, number, number][] => {
  const offsets: [number, number, number][] = [];
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        offsets.push([dx, dy, dz]);
      }
    }
  }
  return offsets;
};

const OFFSETS = neighbourOffsets();

/**
 * Binary min-heap over (priority, node). Hand-rolled against typed arrays
 * because the search pushes on the order of the node count and a sorted-array
 * queue turns the whole thing quadratic.
 */
/**
 * Cost of stepping between two ADJACENT nodes: the step's world length times
 * the resistance it passes through, averaged over the two ends. Averaging is
 * what stops a path from hugging the boundary of an expensive region and paying
 * only for the cheap side of it.
 */
const stepCost = (
  length: number,
  costFrom: number,
  costTo: number,
): number => length * (TRACE_BASE_COST + (costFrom + costTo) / 2);

/**
 * The shortest path from `start` to `goal` through `grid`, as node coordinates
 * INCLUSIVE of both ends.
 *
 * Fails rather than approximates: an endpoint on an impassable voxel, a goal
 * walled off by impassable ones, and a budget exhaustion are three different
 * answers, and the caller says something different about each.
 */
export function findTracePath(
  grid: TraceGrid,
  start: TraceNode,
  goal: TraceNode,
  options: TraceSearchOptions = {},
): TraceResult {
  const { size, spacing, cost } = grid;
  const total = size[0] * size[1] * size[2];
  const budget = options.budget ?? DEFAULT_TRACE_BUDGET;

  if (!inBounds(...start, size) || !inBounds(...goal, size)) {
    return { ok: false, reason: "blocked-endpoint", expanded: 0 };
  }

  const startIndex = nodeIndex(start[0], start[1], start[2], size);
  const goalIndex = nodeIndex(goal[0], goal[1], goal[2], size);

  if (!Number.isFinite(cost[startIndex]) || !Number.isFinite(cost[goalIndex])) {
    return { ok: false, reason: "blocked-endpoint", expanded: 0 };
  }
  if (startIndex === goalIndex) {
    return { ok: true, path: [[...start] as TraceNode], expanded: 0 };
  }

  // Step lengths per offset, precomputed: 26 square roots instead of 26 per node.
  const stepLengths = OFFSETS.map(([dx, dy, dz]) =>
    Math.hypot(dx * spacing[0], dy * spacing[1], dz * spacing[2]),
  );

  const gScore = new Float64Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  /**
   * Straight-line world distance to the goal, priced at the cheapest possible
   * per-unit cost. Never overestimates — no route can beat the floor — so A*
   * stays optimal.
   */
  const heuristic = (x: number, y: number, z: number): number =>
    Math.hypot(
      (goal[0] - x) * spacing[0],
      (goal[1] - y) * spacing[1],
      (goal[2] - z) * spacing[2],
    ) * TRACE_BASE_COST;

  const open = new NodeHeap(Math.min(total, 1 << 16));
  gScore[startIndex] = 0;
  open.push(heuristic(start[0], start[1], start[2]), startIndex);

  let expanded = 0;

  while (open.size > 0) {
    const current = open.pop();
    if (closed[current]) continue; // a stale copy from a cheaper re-push
    closed[current] = 1;
    expanded += 1;

    if (current === goalIndex) {
      return { ok: true, path: reconstruct(cameFrom, current, size), expanded };
    }
    if (expanded >= budget) {
      return { ok: false, reason: "budget", expanded };
    }

    const x = current % size[0];
    const y = Math.floor(current / size[0]) % size[1];
    const z = Math.floor(current / (size[0] * size[1]));
    const currentCost = cost[current];
    const currentScore = gScore[current];

    for (let index = 0; index < OFFSETS.length; index += 1) {
      const [dx, dy, dz] = OFFSETS[index];
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (!inBounds(nx, ny, nz, size)) continue;

      const neighbour = nodeIndex(nx, ny, nz, size);
      if (closed[neighbour]) continue;

      const neighbourCost = cost[neighbour];
      if (!Number.isFinite(neighbourCost)) continue; // nothing resident there

      const tentative =
        currentScore + stepCost(stepLengths[index], currentCost, neighbourCost);
      if (tentative >= gScore[neighbour]) continue;

      gScore[neighbour] = tentative;
      cameFrom[neighbour] = current;
      open.push(tentative + heuristic(nx, ny, nz), neighbour);
    }
  }

  return { ok: false, reason: "unreachable", expanded };
}

function reconstruct(
  cameFrom: Int32Array,
  goalIndex: number,
  size: readonly [number, number, number],
): TraceNode[] {
  const path: TraceNode[] = [];
  let current = goalIndex;
  while (current !== -1) {
    const x = current % size[0];
    const y = Math.floor(current / size[0]) % size[1];
    const z = Math.floor(current / (size[0] * size[1]));
    path.push([x, y, z]);
    current = cameFrom[current];
  }
  return path.reverse();
}

/**
 * The live-wire half: Dijkstra from ONE seed over the whole grid, keeping the
 * back-pointer field — the alternative the header sets aside for a cursor
 * that asks for a new path every frame. That is exactly the 2D drawer once an
 * anchor is placed: the rubber band follows the structure as the pointer
 * moves, and each move is a walk back through `cameFrom`, never a search.
 *
 * Same lattice, same step cost as `findTracePath`, so a path read off the
 * tree is the one A* would have found for the same cost field. The field has
 * no goal to be straight towards, so it is built without the straightness
 * term (`traceCost` skips it when the chord is missing).
 *
 * `cameFrom` is the whole answer: -1 where the seed cannot reach (or the node
 * is impassable), the seed pointing at itself. An `Int32Array`, so it can
 * cross from the worker that grows it as a transfer.
 */
export function growTraceTree(
  grid: TraceGrid,
  seed: TraceNode,
  options: TraceSearchOptions = {},
): Int32Array {
  const { size, spacing, cost } = grid;
  const total = size[0] * size[1] * size[2];
  const budget = options.budget ?? DEFAULT_TRACE_BUDGET;
  const cameFrom = new Int32Array(total).fill(-1);

  if (!inBounds(...seed, size)) return cameFrom;
  const seedIndex = nodeIndex(seed[0], seed[1], seed[2], size);
  if (!Number.isFinite(cost[seedIndex])) return cameFrom;

  const stepLengths = OFFSETS.map(([dx, dy, dz]) =>
    Math.hypot(dx * spacing[0], dy * spacing[1], dz * spacing[2]),
  );
  const gScore = new Float64Array(total).fill(Infinity);
  const closed = new Uint8Array(total);
  const open = new NodeHeap(Math.min(total, 1 << 16));

  gScore[seedIndex] = 0;
  cameFrom[seedIndex] = seedIndex;
  open.push(0, seedIndex);

  let expanded = 0;
  while (open.size > 0 && expanded < budget) {
    const current = open.pop();
    if (closed[current]) continue;
    closed[current] = 1;
    expanded += 1;

    const x = current % size[0];
    const y = Math.floor(current / size[0]) % size[1];
    const z = Math.floor(current / (size[0] * size[1]));
    const currentCost = cost[current];
    const currentScore = gScore[current];

    for (let index = 0; index < OFFSETS.length; index += 1) {
      const [dx, dy, dz] = OFFSETS[index];
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (!inBounds(nx, ny, nz, size)) continue;
      const neighbour = nodeIndex(nx, ny, nz, size);
      if (closed[neighbour]) continue;
      const neighbourCost = cost[neighbour];
      if (!Number.isFinite(neighbourCost)) continue;

      const tentative =
        currentScore + stepCost(stepLengths[index], currentCost, neighbourCost);
      if (tentative >= gScore[neighbour]) continue;
      gScore[neighbour] = tentative;
      cameFrom[neighbour] = current;
      open.push(tentative, neighbour);
    }
  }

  // A budget stop leaves frontier nodes with a provisional parent; only
  // settled nodes carry a path that is actually the cheapest one.
  if (open.size > 0) {
    for (let index = 0; index < total; index += 1) {
      if (!closed[index]) cameFrom[index] = -1;
    }
  }

  return cameFrom;
}

/**
 * The tree's path from its seed to `node`, seed first, or null when the seed
 * never reached it.
 */
export function traceTreePath(
  cameFrom: Int32Array,
  size: readonly [number, number, number],
  node: TraceNode,
): TraceNode[] | null {
  if (!inBounds(...node, size)) return null;
  let current = nodeIndex(node[0], node[1], node[2], size);
  if (cameFrom[current] === -1) return null;

  const path: TraceNode[] = [];
  // Bounded by the node count: a corrupt field must not hang the pointer.
  for (let guard = 0; guard <= cameFrom.length; guard += 1) {
    const x = current % size[0];
    const y = Math.floor(current / size[0]) % size[1];
    const z = Math.floor(current / (size[0] * size[1]));
    path.push([x, y, z]);
    const parent = cameFrom[current];
    if (parent === current) return path.reverse();
    if (parent === -1) return null;
    current = parent;
  }
  return null;
}
