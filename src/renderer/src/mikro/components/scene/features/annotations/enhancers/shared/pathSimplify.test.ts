import { describe, expect, it } from "vitest";
import { MAX_SIMPLIFY_POINTS, simplifyPath, type PathPoint } from "./pathSimplify";

const straightRun = (count: number): PathPoint[] =>
  Array.from({ length: count }, (_, index) => [index, 0, 0] as PathPoint);

describe("simplifyPath", () => {
  it("collapses a collinear run to its endpoints", () => {
    expect(simplifyPath(straightRun(50), 0.1)).toEqual([
      [0, 0, 0],
      [49, 0, 0],
    ]);
  });

  it("keeps a corner that a straight line would cut", () => {
    const path: PathPoint[] = [
      [0, 0, 0],
      [5, 0, 0],
      [10, 0, 0],
      [10, 5, 0],
      [10, 10, 0],
    ];
    expect(simplifyPath(path, 0.5)).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [10, 10, 0],
    ]);
  });

  it("keeps deviations larger than the tolerance and drops smaller ones", () => {
    const path: PathPoint[] = [
      [0, 0, 0],
      [1, 0.4, 0],
      [2, 0, 0],
      [3, 3, 0],
      [4, 0, 0],
    ];
    const simplified = simplifyPath(path, 1);
    expect(simplified).toContainEqual([3, 3, 0]);
    expect(simplified).not.toContainEqual([1, 0.4, 0]);
  });

  it("measures in 3D, not in the xy plane", () => {
    const path: PathPoint[] = [
      [0, 0, 0],
      [1, 0, 5],
      [2, 0, 0],
    ];
    expect(simplifyPath(path, 1)).toHaveLength(3);
    expect(simplifyPath(path, 10)).toHaveLength(2);
  });

  it("always keeps the endpoints — they are the user's waypoints", () => {
    const simplified = simplifyPath(straightRun(20), 1000);
    expect(simplified).toEqual([
      [0, 0, 0],
      [19, 0, 0],
    ]);
  });

  it("keeps a hairpin: its tip is not on the segment, only on the line", () => {
    // Out and back along the same line. Projection onto the SEGMENT is what
    // catches this — projecting onto the infinite line would call the tip
    // collinear and flatten the path to nothing.
    const path: PathPoint[] = [
      [0, 0, 0],
      [10, 0, 0],
      [0, 0, 0],
    ];
    expect(simplifyPath(path, 1)).toHaveLength(3);
  });

  it("leaves short paths and non-positive tolerances alone", () => {
    const pair: PathPoint[] = [
      [0, 0, 0],
      [1, 1, 1],
    ];
    expect(simplifyPath(pair, 5)).toEqual(pair);
    expect(simplifyPath(straightRun(10), 0)).toHaveLength(10);
  });

  it("handles a long path without recursing on it", () => {
    // 20k points: a recursive implementation would blow the stack on this.
    const path: PathPoint[] = Array.from(
      { length: 20_000 },
      (_, index) => [index, index % 2, 0] as PathPoint,
    );
    expect(() => simplifyPath(path, 0.1)).not.toThrow();
    expect(simplifyPath(path, 5)).toHaveLength(2);
  });

  // A voxel-stepped zigzag is Douglas–Peucker's O(n²) worst case, and it is the
  // shape a trace actually produces. The cap is what keeps that bounded.
  it("decimates past the cap instead of stalling on a zigzag", () => {
    const path: PathPoint[] = Array.from(
      { length: 20_000 },
      (_, index) => [index, index % 2, 0] as PathPoint,
    );
    const started = performance.now();
    const simplified = simplifyPath(path, 0.1);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(simplified.length).toBeLessThanOrEqual(MAX_SIMPLIFY_POINTS + 1);
    // Decimation never moves the ends.
    expect(simplified[0]).toEqual(path[0]);
    expect(simplified[simplified.length - 1]).toEqual(path[path.length - 1]);
  });

  it("leaves a path at the cap untouched by decimation", () => {
    const path = straightRun(MAX_SIMPLIFY_POINTS);
    expect(simplifyPath(path, 0.1)).toEqual([
      [0, 0, 0],
      [MAX_SIMPLIFY_POINTS - 1, 0, 0],
    ]);
  });
});
