import type { SculptField } from "./sculptField";
import { createField, ensureContains } from "./sculptField";

/**
 * Analytic SDF stamps — the primitives every non-extraction tool is built
 * from. A stamp is a signed distance function plus the world bounds it can
 * affect; `applyStamp` evaluates it over the (grown) field's cells within
 * those bounds and combines:
 *
 *   add      field = min(field, sdf)        (union)
 *   subtract field = max(field, -sdf)       (carve; the cut CLOSES)
 *
 * `smoothInSphere` is the third verb: a local box-blur of the field inside a
 * sphere — geometry-space smoothing for the sculpt brush, not a stamp.
 *
 * All operations are immutable (a new field comes back; the same field means
 * "nothing changed"), which is what keeps the session's undo a snapshot.
 */

export type Vec3 = readonly [number, number, number];

export type Stamp = {
  /** World-space signed distance, negative inside. */
  sdf: (x: number, y: number, z: number) => number;
  min: Vec3;
  max: Vec3;
};

export const sphereStamp = (center: Vec3, radius: number): Stamp => ({
  sdf: (x, y, z) => Math.hypot(x - center[0], y - center[1], z - center[2]) - radius,
  min: [center[0] - radius, center[1] - radius, center[2] - radius],
  max: [center[0] + radius, center[1] + radius, center[2] + radius],
});

export const ellipsoidStamp = (center: Vec3, radii: Vec3): Stamp => ({
  // The scaled-space distance is only approximate for an ellipsoid; scaling
  // by min(radii) keeps it a conservative (never over-reaching) bound.
  sdf: (x, y, z) => {
    const k = Math.hypot((x - center[0]) / radii[0], (y - center[1]) / radii[1], (z - center[2]) / radii[2]);
    return (k - 1) * Math.min(radii[0], radii[1], radii[2]);
  },
  min: [center[0] - radii[0], center[1] - radii[1], center[2] - radii[2]],
  max: [center[0] + radii[0], center[1] + radii[1], center[2] + radii[2]],
});

export const boxStamp = (center: Vec3, halfExtents: Vec3): Stamp => ({
  sdf: (x, y, z) => {
    const qx = Math.abs(x - center[0]) - halfExtents[0];
    const qy = Math.abs(y - center[1]) - halfExtents[1];
    const qz = Math.abs(z - center[2]) - halfExtents[2];
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0);
  },
  min: [center[0] - halfExtents[0], center[1] - halfExtents[1], center[2] - halfExtents[2]],
  max: [center[0] + halfExtents[0], center[1] + halfExtents[1], center[2] + halfExtents[2]],
});

const segmentDistance = (x: number, y: number, z: number, a: Vec3, b: Vec3): number => {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const len = abx * abx + aby * aby + abz * abz;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((x - a[0]) * abx + (y - a[1]) * aby + (z - a[2]) * abz) / len));
  return Math.hypot(x - a[0] - abx * t, y - a[1] - aby * t, z - a[2] - abz * t);
};

/** A polyline swept by a sphere — the bridge's and the tube-from-path's body. */
export const capsuleChainStamp = (points: readonly Vec3[], radius: number): Stamp => {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], p[a] - radius);
      max[a] = Math.max(max[a], p[a] + radius);
    }
  }
  return {
    sdf: (x, y, z) => {
      let d = Infinity;
      if (points.length === 1) d = segmentDistance(x, y, z, points[0], points[0]);
      for (let s = 0; s + 1 < points.length; s++) d = Math.min(d, segmentDistance(x, y, z, points[s], points[s + 1]));
      return d - radius;
    },
    min,
    max,
  };
};

/**
 * The half-space BEHIND a plane (`dot(n, p) < d` is inside/kept-removed side)
 * — the trim tool subtracts it. Bounds are the whole field: `applyStamp`
 * clamps to the grid anyway, and a cut has no natural box.
 */
export const halfspaceStamp = (normal: Vec3, distance: number): Stamp => ({
  sdf: (x, y, z) => normal[0] * x + normal[1] * y + normal[2] * z - distance,
  min: [-Infinity, -Infinity, -Infinity],
  max: [Infinity, Infinity, Infinity],
});

/**
 * Evaluate `stamp` over the field's cells within its bounds and combine.
 * `add` grows the field to contain the stamp first; `subtract` never grows
 * (removing outside the grid is a no-op). Returns the SAME field when no
 * cell changed.
 */
export function applyStamp(field: SculptField, stamp: Stamp, mode: "add" | "subtract"): SculptField {
  let target = field;
  if (mode === "add" && Number.isFinite(stamp.min[0])) {
    target = ensureContains(field, stamp.min, stamp.max);
  }
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const reach = target.band;
    lo[a] = Number.isFinite(stamp.min[a])
      ? Math.max(0, Math.floor((stamp.min[a] - reach - target.min[a]) / target.spacing - 0.5))
      : 0;
    hi[a] = Number.isFinite(stamp.max[a])
      ? Math.min(target.size[a] - 1, Math.ceil((stamp.max[a] + reach - target.min[a]) / target.spacing - 0.5))
      : target.size[a] - 1;
  }
  let data: Float32Array | null = mode === "add" && target !== field ? Float32Array.from(target.data) : null;
  const write = (i: number, value: number) => {
    if (!data) data = Float32Array.from(target.data);
    data[i] = value;
  };
  for (let z = lo[2]; z <= hi[2]; z++) {
    const wz = target.min[2] + (z + 0.5) * target.spacing;
    for (let y = lo[1]; y <= hi[1]; y++) {
      const wy = target.min[1] + (y + 0.5) * target.spacing;
      for (let x = lo[0]; x <= hi[0]; x++) {
        const wx = target.min[0] + (x + 0.5) * target.spacing;
        const i = x + y * target.size[0] + z * target.size[0] * target.size[1];
        const d = stamp.sdf(wx, wy, wz);
        const clamped = Math.max(-target.band, Math.min(target.band, mode === "add" ? d : -d));
        const current = (data ?? target.data)[i];
        const next = mode === "add" ? Math.min(current, clamped) : Math.max(current, clamped);
        if (next !== current) write(i, next);
      }
    }
  }
  if (!data) return field;
  return { ...target, data };
}

/** A stamp as a fresh field of its own (the first act of an empty mesh). */
export function stampToField(stamp: Stamp, spacing: number): SculptField {
  const empty = createField(stamp.min, stamp.max, spacing);
  return applyStamp(empty, stamp, "add");
}

/**
 * The sculpt brush's third verb: box-blur the field inside a sphere, which
 * relaxes bumps and pits without adding or removing volume on average.
 */
export function smoothInSphere(field: SculptField, center: Vec3, radius: number): SculptField {
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    lo[a] = Math.max(1, Math.floor((center[a] - radius - field.min[a]) / field.spacing - 0.5));
    hi[a] = Math.min(field.size[a] - 2, Math.ceil((center[a] + radius - field.min[a]) / field.spacing - 0.5));
  }
  if (lo[0] > hi[0] || lo[1] > hi[1] || lo[2] > hi[2]) return field;
  const r2 = radius * radius;
  let data: Float32Array | null = null;
  const [nx, ny] = [field.size[0], field.size[1]];
  for (let z = lo[2]; z <= hi[2]; z++) {
    const wz = field.min[2] + (z + 0.5) * field.spacing;
    for (let y = lo[1]; y <= hi[1]; y++) {
      const wy = field.min[1] + (y + 0.5) * field.spacing;
      for (let x = lo[0]; x <= hi[0]; x++) {
        const wx = field.min[0] + (x + 0.5) * field.spacing;
        const dx = wx - center[0], dy = wy - center[1], dz = wz - center[2];
        if (dx * dx + dy * dy + dz * dz > r2) continue;
        // 6-neighbour average of the ORIGINAL data (a one-pass umbrella).
        const i = x + y * nx + z * nx * ny;
        const mean =
          (field.data[i - 1] + field.data[i + 1] + field.data[i - nx] + field.data[i + nx] + field.data[i - nx * ny] + field.data[i + nx * ny]) / 6;
        const next = field.data[i] + 0.5 * (mean - field.data[i]);
        if (next !== field.data[i]) {
          if (!data) data = Float32Array.from(field.data);
          data[i] = next;
        }
      }
    }
  }
  return data ? { ...field, data } : field;
}
