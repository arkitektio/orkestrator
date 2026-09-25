import { MARCHERS, type MarcherId } from "../../annotations/enhancers/meshes/marcher";
import type { CorridorBox } from "../../annotations/enhancers/shared/corridorPlan";
import type { DesignGeometry } from "../store/meshDesignStore";
import { weldSoup } from "../ops/weld";

/**
 * The sculpting FIELD: a clamped signed-distance grid each design mesh
 * accumulates its strokes into, so add and remove are true booleans.
 *
 * Concatenating stroke surfaces leaves interior faces where they overlap,
 * and deleting triangles leaves an open rim where they are erased. The field
 * fixes both at the root: every piece is converted to a signed distance
 * (negative inside) on a world-aligned grid, ADD is `min(field, piece)`,
 * REMOVE is `max(field, -capsule)` (the brush stroke as an analytic capsule,
 * so a carve is a smooth cut that CLOSES the surface), and the mesh is
 * re-marched from the field — one watertight surface, no interior faces,
 * whatever the stroke history was.
 *
 * Values are clamped to ±`band` (2 cells): only the narrow band matters to
 * the march, and the clamp is what keeps a union of far-apart pieces exact.
 * Signs come from x-ray parity against the piece's closed surface (pieces
 * ARE closed: the marchers close against corridor walls, `LockBorder` keeps
 * them closed through simplification).
 *
 * Fields are IMMUTABLE from the outside — every operation returns a new
 * field (sharing nothing) — which is what makes the design session's undo a
 * plain snapshot stack.
 */

export type SculptField = {
  /** World position of the grid's min corner (cell centers sit at +0.5·spacing). */
  min: [number, number, number];
  /** Isotropic cell size, world units. */
  spacing: number;
  size: [number, number, number];
  /** Clamped signed distance at cell centers; negative inside, ±band. */
  data: Float32Array;
  /** = 2 · spacing. */
  band: number;
};

/** Grid ceiling per mesh (~32 MB as f32); beyond it the spacing coarsens. */
export const FIELD_MAX_VOXELS = 8_000_000;

/** Empty margin kept around content so growth and the march never clip. */
const MARGIN_CELLS = 3;

type Vec3 = readonly [number, number, number];

const geometryBounds = (geometry: DesignGeometry): { min: [number, number, number]; max: [number, number, number] } => {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const p = geometry.positions;
  for (let v = 0; v < p.length; v += 3) {
    for (let a = 0; a < 3; a++) {
      if (p[v + a] < min[a]) min[a] = p[v + a];
      if (p[v + a] > max[a]) max[a] = p[v + a];
    }
  }
  return { min, max };
};

const sizeFor = (min: Vec3, max: Vec3, spacing: number): [number, number, number] => [
  Math.max(1, Math.ceil((max[0] - min[0]) / spacing) + 2 * MARGIN_CELLS),
  Math.max(1, Math.ceil((max[1] - min[1]) / spacing) + 2 * MARGIN_CELLS),
  Math.max(1, Math.ceil((max[2] - min[2]) / spacing) + 2 * MARGIN_CELLS),
];

/** An empty (all-outside) field covering `[min, max]` with margin. */
export function createField(min: Vec3, max: Vec3, spacing: number): SculptField {
  let s = spacing;
  let size = sizeFor(min, max, s);
  while (size[0] * size[1] * size[2] > FIELD_MAX_VOXELS) {
    s *= 2;
    size = sizeFor(min, max, s);
  }
  const band = 2 * s;
  return {
    min: [min[0] - MARGIN_CELLS * s, min[1] - MARGIN_CELLS * s, min[2] - MARGIN_CELLS * s],
    spacing: s,
    size,
    data: new Float32Array(size[0] * size[1] * size[2]).fill(band),
    band,
  };
}

const cellIndex = (field: SculptField, x: number, y: number, z: number): number =>
  x + y * field.size[0] + z * field.size[0] * field.size[1];

/** Trilinear sample of the field at a WORLD point (outside = +band). */
const sampleField = (field: SculptField, wx: number, wy: number, wz: number): number => {
  const fx = (wx - field.min[0]) / field.spacing - 0.5;
  const fy = (wy - field.min[1]) / field.spacing - 0.5;
  const fz = (wz - field.min[2]) / field.spacing - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const z0 = Math.floor(fz);
  let value = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        const z = z0 + dz;
        const w =
          Math.abs(1 - dx - (fx - x0)) * Math.abs(1 - dy - (fy - y0)) * Math.abs(1 - dz - (fz - z0));
        const inRange =
          x >= 0 && y >= 0 && z >= 0 && x < field.size[0] && y < field.size[1] && z < field.size[2];
        value += w * (inRange ? field.data[cellIndex(field, x, y, z)] : field.band);
      }
    }
  }
  return value;
};

/**
 * A field covering the union of the current content and `[min, max]` —
 * the same field when it already does. Content is resampled trilinearly;
 * hitting `FIELD_MAX_VOXELS` coarsens the spacing.
 */
export function ensureContains(field: SculptField, min: Vec3, max: Vec3): SculptField {
  const needsGrow = [0, 1, 2].some(
    (a) =>
      min[a] < field.min[a] + field.spacing * (MARGIN_CELLS - 1) ||
      max[a] > field.min[a] + field.spacing * (field.size[a] - MARGIN_CELLS + 1),
  );
  if (!needsGrow) return field;
  const jointMin: Vec3 = [
    Math.min(min[0], field.min[0] + MARGIN_CELLS * field.spacing),
    Math.min(min[1], field.min[1] + MARGIN_CELLS * field.spacing),
    Math.min(min[2], field.min[2] + MARGIN_CELLS * field.spacing),
  ];
  const jointMax: Vec3 = [
    Math.max(max[0], field.min[0] + (field.size[0] - MARGIN_CELLS) * field.spacing),
    Math.max(max[1], field.min[1] + (field.size[1] - MARGIN_CELLS) * field.spacing),
    Math.max(max[2], field.min[2] + (field.size[2] - MARGIN_CELLS) * field.spacing),
  ];
  const grown = createField(jointMin, jointMax, field.spacing);
  for (let z = 0; z < grown.size[2]; z++) {
    for (let y = 0; y < grown.size[1]; y++) {
      for (let x = 0; x < grown.size[0]; x++) {
        const wx = grown.min[0] + (x + 0.5) * grown.spacing;
        const wy = grown.min[1] + (y + 0.5) * grown.spacing;
        const wz = grown.min[2] + (z + 0.5) * grown.spacing;
        const value = sampleField(field, wx, wy, wz);
        grown.data[cellIndex(grown, x, y, z)] = Math.max(-grown.band, Math.min(grown.band, value));
      }
    }
  }
  return grown;
}

const dot = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
  ax * bx + ay * by + az * bz;

/** Squared distance from a point to a triangle (Ericson, Real-Time Collision Detection). */
const pointTriangleDistSq = (
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number => {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = dot(abx, aby, abz, apx, apy, apz);
  const d2 = dot(acx, acy, acz, apx, apy, apz);
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = dot(abx, aby, abz, bpx, bpy, bpz);
  const d4 = dot(acx, acy, acz, bpx, bpy, bpz);
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const dx = apx - v * abx, dy = apy - v * aby, dz = apz - v * abz;
    return dx * dx + dy * dy + dz * dz;
  }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = dot(abx, aby, abz, cpx, cpy, cpz);
  const d6 = dot(acx, acy, acz, cpx, cpy, cpz);
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const dx = apx - w * acx, dy = apy - w * acy, dz = apz - w * acz;
    return dx * dx + dy * dy + dz * dz;
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    const dx = bpx + w * (cx - bx) - px, dy = bpy + w * (cy - by) - py, dz = bpz + w * (cz - bz) - pz;
    return dx * dx + dy * dy + dz * dz;
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  const dx = ax + abx * v + acx * w - px;
  const dy = ay + aby * v + acy * w - py;
  const dz = az + abz * v + acz * w - pz;
  return dx * dx + dy * dy + dz * dz;
};

/**
 * The piece's clamped signed distance sampled on `field`'s grid, or null per
 * cell outside the band. Sign from x-ray parity per (y, z) row — the piece
 * must be CLOSED, which every marched (and LockBorder-simplified) piece is.
 */
function pieceSignedDistance(field: SculptField, piece: DesignGeometry): { band: Float32Array; touched: Uint8Array } {
  const { positions, indices } = piece;
  const [nx, ny, nz] = field.size;
  const spacing = field.spacing;
  const bandWidth = field.band;
  const dist = new Float32Array(nx * ny * nz).fill(Infinity);
  const touched = new Uint8Array(nx * ny * nz);

  // Narrow-band unsigned distance: each triangle visits the cells around it.
  const toCell = (w: number, axis: number) => (w - field.min[axis]) / spacing - 0.5;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const xs = [positions[a], positions[b], positions[c]];
    const ys = [positions[a + 1], positions[b + 1], positions[c + 1]];
    const zs = [positions[a + 2], positions[b + 2], positions[c + 2]];
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    const mins = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    const maxs = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.max(0, Math.floor(toCell(mins[axis], axis) - bandWidth / spacing));
      hi[axis] = Math.min(field.size[axis] - 1, Math.ceil(toCell(maxs[axis], axis) + bandWidth / spacing));
    }
    for (let z = lo[2]; z <= hi[2]; z++) {
      const wz = field.min[2] + (z + 0.5) * spacing;
      for (let y = lo[1]; y <= hi[1]; y++) {
        const wy = field.min[1] + (y + 0.5) * spacing;
        for (let x = lo[0]; x <= hi[0]; x++) {
          const wx = field.min[0] + (x + 0.5) * spacing;
          const dSq = pointTriangleDistSq(
            wx, wy, wz,
            xs[0], ys[0], zs[0],
            xs[1], ys[1], zs[1],
            xs[2], ys[2], zs[2],
          );
          const i = cellIndex(field, x, y, z);
          if (dSq < dist[i] * dist[i]) {
            dist[i] = Math.sqrt(dSq);
            touched[i] = 1;
          }
        }
      }
    }
  }

  // Sign by x-ray parity, triangles bucketed per (y, z) row.
  const rowBuckets = new Map<number, number[]>();
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const minY = Math.min(positions[a + 1], positions[b + 1], positions[c + 1]);
    const maxY = Math.max(positions[a + 1], positions[b + 1], positions[c + 1]);
    const minZ = Math.min(positions[a + 2], positions[b + 2], positions[c + 2]);
    const maxZ = Math.max(positions[a + 2], positions[b + 2], positions[c + 2]);
    const y0 = Math.max(0, Math.floor(toCell(minY, 1)));
    const y1 = Math.min(ny - 1, Math.ceil(toCell(maxY, 1)));
    const z0 = Math.max(0, Math.floor(toCell(minZ, 2)));
    const z1 = Math.min(nz - 1, Math.ceil(toCell(maxZ, 2)));
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        const key = y + z * ny;
        (rowBuckets.get(key) ?? rowBuckets.set(key, []).get(key)!).push(t);
      }
    }
  }

  const signed = new Float32Array(nx * ny * nz).fill(bandWidth);
  const crossings: number[] = [];
  for (let z = 0; z < nz; z++) {
    const wz = field.min[2] + (z + 0.5) * spacing;
    for (let y = 0; y < ny; y++) {
      const wy = field.min[1] + (y + 0.5) * spacing;
      crossings.length = 0;
      const bucket = rowBuckets.get(y + z * ny);
      if (bucket) {
        for (const t of bucket) {
          const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
          // Ray (x: -inf→+inf) at (wy, wz): 2D point-in-triangle in (y, z),
          // then solve x on the triangle's plane.
          const ay = positions[a + 1], az = positions[a + 2];
          const by = positions[b + 1], bz = positions[b + 2];
          const cy = positions[c + 1], cz = positions[c + 2];
          const d = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
          if (d === 0) continue; // edge-on to the ray
          const u = ((wy - ay) * (cz - az) - (wz - az) * (cy - ay)) / d;
          const v = ((by - ay) * (wz - az) - (bz - az) * (wy - ay)) / d;
          if (u < 0 || v < 0 || u + v > 1) continue;
          crossings.push(positions[a] + u * (positions[b] - positions[a]) + v * (positions[c] - positions[a]));
        }
      }
      crossings.sort((p, q) => p - q);
      let parity = 0;
      let next = 0;
      for (let x = 0; x < nx; x++) {
        const wx = field.min[0] + (x + 0.5) * spacing;
        while (next < crossings.length && crossings[next] < wx) {
          parity ^= 1;
          next += 1;
        }
        const i = cellIndex(field, x, y, z);
        const magnitude = Math.min(touched[i] ? dist[i] : bandWidth, bandWidth);
        signed[i] = parity === 1 ? -magnitude : magnitude;
        if (parity === 1) touched[i] = 1; // interior counts even outside the band
      }
    }
  }
  return { band: signed, touched };
}

/** ADD: union the (closed, world-space) piece into the field. */
export function unionMesh(field: SculptField, piece: DesignGeometry): SculptField {
  const bounds = geometryBounds(piece);
  if (!Number.isFinite(bounds.min[0])) return field;
  const target = ensureContains(field, bounds.min, bounds.max);
  const { band, touched } = pieceSignedDistance(target, piece);
  const data = Float32Array.from(target.data);
  for (let i = 0; i < data.length; i++) {
    if (touched[i]) data[i] = Math.min(data[i], band[i]);
  }
  return { ...target, data };
}

/** A whole mesh as a fresh field (the lazy start of sculpting an import). */
export function meshToField(geometry: DesignGeometry, spacing: number): SculptField {
  const bounds = geometryBounds(geometry);
  const field = createField(bounds.min, bounds.max, spacing);
  return unionMesh(field, geometry);
}

const segmentDistSq = (px: number, py: number, pz: number, a: Vec3, b: Vec3): number => {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const len = abx * abx + aby * aby + abz * abz;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((px - a[0]) * abx + (py - a[1]) * aby + (pz - a[2]) * abz) / len));
  const dx = px - a[0] - abx * t, dy = py - a[1] - aby * t, dz = pz - a[2] - abz * t;
  return dx * dx + dy * dy + dz * dz;
};

/**
 * REMOVE: carve the stroke's capsule (polyline + radius) out of the field.
 * Returns the SAME field when nothing was in reach, so callers can tell.
 */
export function subtractCapsule(field: SculptField, stroke: readonly Vec3[], radius: number): SculptField {
  if (stroke.length === 0 || radius <= 0) return field;
  const reach = radius + field.band;
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    let min = Infinity;
    let max = -Infinity;
    for (const p of stroke) {
      if (p[a] < min) min = p[a];
      if (p[a] > max) max = p[a];
    }
    lo[a] = Math.max(0, Math.floor((min - reach - field.min[a]) / field.spacing - 0.5));
    hi[a] = Math.min(field.size[a] - 1, Math.ceil((max + reach - field.min[a]) / field.spacing - 0.5));
  }
  let data: Float32Array | null = null;
  for (let z = lo[2]; z <= hi[2]; z++) {
    const wz = field.min[2] + (z + 0.5) * field.spacing;
    for (let y = lo[1]; y <= hi[1]; y++) {
      const wy = field.min[1] + (y + 0.5) * field.spacing;
      for (let x = lo[0]; x <= hi[0]; x++) {
        const wx = field.min[0] + (x + 0.5) * field.spacing;
        let dSq = Infinity;
        if (stroke.length === 1) dSq = segmentDistSq(wx, wy, wz, stroke[0], stroke[0]);
        else {
          for (let s = 0; s + 1 < stroke.length; s++) {
            const d = segmentDistSq(wx, wy, wz, stroke[s], stroke[s + 1]);
            if (d < dSq) dSq = d;
          }
        }
        const capsule = Math.sqrt(dSq) - radius; // negative inside the brush
        const carved = Math.min(field.band, Math.max(-field.band, -capsule));
        const i = cellIndex(field, x, y, z);
        const value = Math.max(field.data[i], carved);
        if (value !== field.data[i]) {
          if (!data) data = Float32Array.from(field.data);
          data[i] = value;
        }
      }
    }
  }
  return data ? { ...field, data } : field;
}

/** Re-march the field into a welded, indexed WORLD-space mesh. */
export function marchField(field: SculptField, marcherId: MarcherId): DesignGeometry {
  const box: CorridorBox = { origin: [0, 0, 0], size: field.size };
  // Marchers read "inside = value <= iso" and clamp at 2·iso, so shift the
  // signed distance up by `band`: values span [0, 2·band] and iso = band.
  const cost = new Float32Array(field.data.length);
  for (let i = 0; i < cost.length; i++) {
    cost[i] = Math.max(-field.band, Math.min(field.band, field.data[i])) + field.band;
  }
  const { positions } = MARCHERS[marcherId].march({ cost, box, iso: field.band });
  const world = new Float32Array(positions.length);
  for (let v = 0; v < positions.length; v += 3) {
    world[v] = field.min[0] + positions[v] * field.spacing;
    world[v + 1] = field.min[1] + positions[v + 1] * field.spacing;
    world[v + 2] = field.min[2] + positions[v + 2] * field.spacing;
  }
  return weldSoup(world, 1e-6);
}
