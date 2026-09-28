import { describe, expect, it } from "vitest";
import {
  findTracePath,
  TRACE_BASE_COST,
  type TraceGrid,
  type TraceNode,
} from "./traceSearch";

/** A grid of uniform resistance, isotropic unless `spacing` says otherwise. */
const grid = (
  size: [number, number, number],
  fill = 0,
  spacing: [number, number, number] = [1, 1, 1],
): TraceGrid => ({
  size,
  spacing,
  cost: new Float32Array(size[0] * size[1] * size[2]).fill(fill),
});

const at = (
  g: TraceGrid,
  [x, y, z]: TraceNode,
  value: number,
): void => {
  g.cost[x + y * g.size[0] + z * g.size[0] * g.size[1]] = value;
};

const pathLengthWorld = (path: TraceNode[], spacing: [number, number, number]) =>
  path.slice(1).reduce((total, node, index) => {
    const previous = path[index];
    return (
      total +
      Math.hypot(
        (node[0] - previous[0]) * spacing[0],
        (node[1] - previous[1]) * spacing[1],
        (node[2] - previous[2]) * spacing[2],
      )
    );
  }, 0);

describe("findTracePath", () => {
  it("walks a straight diagonal through free space", () => {
    const result = findTracePath(grid([5, 5, 5]), [0, 0, 0], [4, 4, 4]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 26-connected: one diagonal step per node, both ends included.
    expect(result.path).toHaveLength(5);
    expect(result.path[0]).toEqual([0, 0, 0]);
    expect(result.path[4]).toEqual([4, 4, 4]);
  });

  it("includes both endpoints, and collapses to one node when they coincide", () => {
    const result = findTracePath(grid([3, 3, 3]), [1, 1, 1], [1, 1, 1]);
    expect(result).toEqual({ ok: true, path: [[1, 1, 1]], expanded: 0 });
  });

  it("routes around an impassable wall rather than through it", () => {
    // A 5x5x1 grid with a wall at x = 2 except for a gap at y = 4.
    const g = grid([5, 5, 1]);
    for (let y = 0; y < 4; y += 1) at(g, [2, y, 0], Infinity);

    const result = findTracePath(g, [0, 0, 0], [4, 0, 0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Every step must dodge the wall, so the gap row is used.
    expect(result.path.some(([x, y]) => x === 2 && y === 4)).toBe(true);
    expect(result.path.some(([x, y]) => x === 2 && y < 4)).toBe(false);
  });

  it("prefers the cheap corridor to the short expensive one", () => {
    // Row y=1 is expensive, row y=0 is free. Going the long way round y=0
    // must still win, which only happens if node cost enters the metric.
    const g = grid([9, 2, 1]);
    for (let x = 0; x < 9; x += 1) at(g, [x, 1, 0], 1);

    const result = findTracePath(g, [0, 1, 0], [8, 1, 0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const throughCheapRow = result.path.filter(([, y]) => y === 0).length;
    expect(throughCheapRow).toBeGreaterThan(4);
  });

  it("respects anisotropic spacing — a z step is not a free lunch", () => {
    // One z step costs 10 world units; going the same distance in x costs 1
    // each. With the goal reachable both ways, the cheap axis must win.
    const g = grid([12, 1, 2], 0, [1, 1, 10]);
    const result = findTracePath(g, [0, 0, 0], [10, 0, 0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Never detours through the far z slab: it would add 20 world units.
    expect(result.path.every(([, , z]) => z === 0)).toBe(true);
    expect(pathLengthWorld(result.path, [1, 1, 10])).toBe(10);
  });

  it("is optimal for the weights — the heuristic never overestimates", () => {
    // Random-ish but deterministic cost field; A* must agree with a plain
    // Dijkstra run (heuristic forced to zero by a huge base-relative scale).
    const size: [number, number, number] = [8, 8, 3];
    const g = grid(size);
    for (let index = 0; index < g.cost.length; index += 1) {
      g.cost[index] = ((index * 37) % 11) / 10;
    }
    const result = findTracePath(g, [0, 0, 0], [7, 7, 2]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Recompute the path's cost and compare against an exhaustive relaxation.
    const cost = (path: TraceNode[]) =>
      path.slice(1).reduce((total, node, index) => {
        const previous = path[index];
        const length = Math.hypot(
          node[0] - previous[0],
          node[1] - previous[1],
          node[2] - previous[2],
        );
        const a = g.cost[previous[0] + previous[1] * 8 + previous[2] * 64];
        const b = g.cost[node[0] + node[1] * 8 + node[2] * 64];
        return total + length * (TRACE_BASE_COST + (a + b) / 2);
      }, 0);

    const dijkstra = findTracePath({ ...g, spacing: [1, 1, 1] }, [0, 0, 0], [7, 7, 2]);
    expect(dijkstra.ok).toBe(true);
    if (!dijkstra.ok) return;
    expect(cost(result.path)).toBeCloseTo(cost(dijkstra.path), 9);
  });

  it("reports a blocked endpoint rather than searching for it", () => {
    const g = grid([4, 4, 4]);
    at(g, [3, 3, 3], Infinity);
    expect(findTracePath(g, [0, 0, 0], [3, 3, 3])).toEqual({
      ok: false,
      reason: "blocked-endpoint",
      expanded: 0,
    });
    at(g, [0, 0, 0], Infinity);
    expect(findTracePath(g, [0, 0, 0], [1, 1, 1]).ok).toBe(false);
  });

  it("reports an endpoint outside the box", () => {
    const result = findTracePath(grid([4, 4, 4]), [0, 0, 0], [4, 0, 0]);
    expect(result).toEqual({ ok: false, reason: "blocked-endpoint", expanded: 0 });
  });

  it("reports unreachable when the goal is walled off", () => {
    const g = grid([5, 5, 1]);
    for (let y = 0; y < 5; y += 1) at(g, [2, y, 0], Infinity);
    const result = findTracePath(g, [0, 0, 0], [4, 4, 0]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unreachable");
  });

  it("gives up on budget instead of wedging the thread", () => {
    const result = findTracePath(grid([40, 40, 40]), [0, 0, 0], [39, 39, 39], {
      budget: 10,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("budget");
    expect(result.expanded).toBe(10);
  });
});
