/**
 * Douglas–Peucker in 3D.
 *
 * A traced path has one vertex per node step — a few hundred for a modest hop,
 * and they are mostly collinear runs. Committing them verbatim would make the
 * annotation's `vectors` enormous and hand the renderer thousands of segments to
 * stroke, all to say what a handful of vertices already says.
 *
 * Tolerance is in WORLD units, so it means the same thing whatever the voxel
 * size or the level the hop searched at: "never move the path further than this
 * from where it actually ran".
 */

export type PathPoint = readonly [number, number, number];

/**
 * Point cap before the split pass, enforced by uniform decimation.
 *
 * Douglas–Peucker is O(n log n) on a path that simplifies, but O(n²) on one
 * where every vertex deviates — and a voxel-stepped path is exactly that shape:
 * a diagonal run alternates between axes, so every point sits off the chord its
 * neighbours describe. Real hops are a few hundred points and never reach this;
 * the cap is what stops a pathological one from stalling the click that made it.
 */
export const MAX_SIMPLIFY_POINTS = 4000;

/** Every k-th point, endpoints always included. */
function decimate(path: readonly PathPoint[], limit: number): PathPoint[] {
  const stride = Math.ceil(path.length / limit);
  if (stride <= 1) return [...path];

  const kept: PathPoint[] = [];
  for (let index = 0; index < path.length; index += stride) kept.push(path[index]);
  const last = path[path.length - 1];
  if (kept[kept.length - 1] !== last) kept.push(last);
  return kept;
}

/** Perpendicular distance from `point` to the segment `a`–`b`. */
function distanceToSegment(point: PathPoint, a: PathPoint, b: PathPoint): number {
  const ab: PathPoint = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: PathPoint = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
  const lengthSquared = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];

  // A degenerate segment is a point; fall back to the distance to it.
  if (lengthSquared === 0) return Math.hypot(ap[0], ap[1], ap[2]);

  // Clamped projection: a vertex beyond either end measures to that end, so a
  // hairpin is never mistaken for a point sitting on the line through it.
  const t = Math.max(
    0,
    Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / lengthSquared),
  );
  return Math.hypot(
    ap[0] - t * ab[0],
    ap[1] - t * ab[1],
    ap[2] - t * ab[2],
  );
}

/**
 * The path with every vertex that sits within `tolerance` of the line its
 * neighbours already describe removed. Endpoints are always kept — they are the
 * user's waypoints, not artefacts of the search.
 *
 * Iterative rather than recursive: a path can be thousands of points long, and
 * a degenerate one would recurse as deep.
 */
export function simplifyPath(
  input: readonly PathPoint[],
  tolerance: number,
): PathPoint[] {
  if (input.length <= 2 || tolerance <= 0) return [...input];

  const path =
    input.length > MAX_SIMPLIFY_POINTS ? decimate(input, MAX_SIMPLIFY_POINTS) : input;

  const keep = new Uint8Array(path.length);
  keep[0] = 1;
  keep[path.length - 1] = 1;

  const stack: [number, number][] = [[0, path.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last - first < 2) continue;

    let furthest = -1;
    let furthestDistance = tolerance;

    for (let index = first + 1; index < last; index += 1) {
      const distance = distanceToSegment(path[index], path[first], path[last]);
      if (distance > furthestDistance) {
        furthest = index;
        furthestDistance = distance;
      }
    }

    if (furthest === -1) continue; // the whole span is within tolerance

    keep[furthest] = 1;
    stack.push([first, furthest], [furthest, last]);
  }

  return path.filter((_, index) => keep[index] === 1);
}
