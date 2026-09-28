import { createField, type SculptField } from "./sculptField";

/**
 * Contour LOFTING: planar polygons traced on separate z-slices become one
 * closed surface by interpolating their signed 2D distance fields across z —
 * the classic serial-section reconstruction (TrakEM2/CATMAID style), done in
 * the sculpt field's own language so the result unions/carves like any other
 * mesh.
 *
 * Between two neighbouring contours the field at height z is the linear
 * blend of their 2D SDFs; beyond the first/last contour the surface closes
 * over half a slice gap. Contours must be simple polygons in world (x, y)
 * with a constant z each.
 */

export type Vec3 = readonly [number, number, number];

export type LoftContour = {
  /** The polygon's vertices, world (x, y); implicitly closed. */
  points: readonly (readonly [number, number])[];
  z: number;
};

/** Signed 2D distance to a polygon: negative inside (even-odd fill). */
export function polygonSdf2(points: readonly (readonly [number, number])[], x: number, y: number): number {
  let dist = Infinity;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    // Distance to the edge.
    const ex = xj - xi, ey = yj - yi;
    const len = ex * ex + ey * ey;
    const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((x - xi) * ex + (y - yi) * ey) / len));
    dist = Math.min(dist, Math.hypot(x - xi - ex * t, y - yi - ey * t));
    // Even-odd crossing.
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -dist : dist;
}

/**
 * Loft contours (≥ 2, any order) into a fresh field at `spacing`. The caps
 * close half a slice gap past the extreme contours.
 */
export function loftContours(contours: readonly LoftContour[], spacing: number): SculptField {
  if (contours.length < 2) throw new Error("Lofting needs at least two contours on different slices.");
  const sorted = [...contours].sort((a, b) => a.z - b.z);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const contour of sorted) {
    for (const [x, y] of contour.points) {
      min[0] = Math.min(min[0], x); max[0] = Math.max(max[0], x);
      min[1] = Math.min(min[1], y); max[1] = Math.max(max[1], y);
    }
  }
  const capGap = Math.max(spacing, (sorted[1].z - sorted[0].z) / 2, (sorted.at(-1)!.z - sorted.at(-2)!.z) / 2);
  min[2] = sorted[0].z - capGap;
  max[2] = sorted.at(-1)!.z + capGap;
  if (!Number.isFinite(min[0])) throw new Error("The contours carry no vertices.");

  const field = createField(min, max, spacing);
  const data = field.data;
  for (let zi = 0; zi < field.size[2]; zi++) {
    const wz = field.min[2] + (zi + 0.5) * field.spacing;
    // The bracketing contours (clamped at the ends so the caps taper closed).
    let below = 0;
    while (below + 1 < sorted.length && sorted[below + 1].z <= wz) below += 1;
    const a = sorted[Math.min(below, sorted.length - 1)];
    const b = sorted[Math.min(below + 1, sorted.length - 1)];
    for (let yi = 0; yi < field.size[1]; yi++) {
      const wy = field.min[1] + (yi + 0.5) * field.spacing;
      for (let xi = 0; xi < field.size[0]; xi++) {
        const wx = field.min[0] + (xi + 0.5) * field.spacing;
        let value: number;
        if (wz <= sorted[0].z) {
          // Below the first contour: its SDF pushed outward toward the cap.
          value = polygonSdf2(sorted[0].points, wx, wy) + (sorted[0].z - wz);
        } else if (wz >= sorted.at(-1)!.z) {
          value = polygonSdf2(sorted.at(-1)!.points, wx, wy) + (wz - sorted.at(-1)!.z);
        } else {
          const t = a.z === b.z ? 0 : (wz - a.z) / (b.z - a.z);
          value = (1 - t) * polygonSdf2(a.points, wx, wy) + t * polygonSdf2(b.points, wx, wy);
        }
        const i = xi + yi * field.size[0] + zi * field.size[0] * field.size[1];
        data[i] = Math.max(-field.band, Math.min(field.band, value));
      }
    }
  }
  return field;
}
