import type { Vec3 } from "../../field/stamps";

/**
 * Polyline helpers for the fitted reconstructors. A backtracked centerline is
 * a voxel staircase simplified to a few vertices (`centerlineToWorld`); a
 * fit wants the opposite — many evenly spaced stations — so the radius is
 * measured at a known cadence and the swept tube bends smoothly.
 */

const distance = (a: Vec3, b: Vec3): number => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

export const polylineLength = (points: readonly Vec3[]): number => {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
  return length;
};

/** Evenly spaced stations along `points` (ends kept), at most `maxPoints`. */
export function resamplePolyline(points: readonly Vec3[], spacing: number, maxPoints = 256): Vec3[] {
  if (points.length < 2) return points.slice();
  const total = polylineLength(points);
  if (!(total > 0)) return [points[0]];
  const segments = Math.max(1, Math.min(maxPoints - 1, Math.round(total / Math.max(spacing, 1e-12))));
  const step = total / segments;
  const out: Vec3[] = [points[0]];
  let walked = 0;
  let next = step;
  for (let i = 1; i < points.length && out.length < segments; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = distance(a, b);
    while (length > 0 && next <= walked + length + 1e-9 && out.length < segments) {
      const t = (next - walked) / length;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      next += step;
    }
    walked += length;
  }
  out.push(points[points.length - 1]);
  return out;
}

/** `passes` rounds of a 1-2-1 kernel; the two ends stay where they are. */
export function smoothPolyline(points: readonly Vec3[], passes: number): Vec3[] {
  let current = points.slice();
  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice();
    for (let i = 1; i + 1 < current.length; i++) {
      next[i] = [
        (current[i - 1][0] + 2 * current[i][0] + current[i + 1][0]) / 4,
        (current[i - 1][1] + 2 * current[i][1] + current[i + 1][1]) / 4,
        (current[i - 1][2] + 2 * current[i][2] + current[i + 1][2]) / 4,
      ];
    }
    current = next;
  }
  return current;
}

/** `passes` rounds of a 1-2-1 kernel over scalars; ends averaged with their one neighbour. */
export function smoothScalars(values: readonly number[], passes: number): number[] {
  let current = values.slice();
  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice();
    for (let i = 0; i < current.length; i++) {
      const before = current[Math.max(0, i - 1)];
      const after = current[Math.min(current.length - 1, i + 1)];
      next[i] = (before + 2 * current[i] + after) / 4;
    }
    current = next;
  }
  return current;
}

export const median = (values: readonly number[]): number => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
