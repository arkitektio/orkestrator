import * as THREE from "three";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { MIN_DEPTH, ellipseRing, getVectorPoint } from "./annotationBounds";
import {
  ELLIPSE_SEGMENTS,
  ellipseRingOf,
  isSectionedEllipse,
  type OutlineRange,
} from "./annotationBatch";
import { resolveStyle } from "./annotationStyle";

/**
 * Merged annotation INTERIORS: one mesh per fill opacity (plus one invisible
 * pick-only mesh for unfilled shapes) instead of one mesh + one
 * `meshBasicMaterial` per rectangle/ellipse/polygon. The interior is what
 * makes a flat shape clickable anywhere rather than only on its edge, so a
 * batch maps a picked triangle (`faceIndex`) back to its ROI through sorted
 * ranges — the outline batch's idiom (`roiForSegment`).
 *
 * The PURE half, unit tested; `layer/AnnotationInteriorBatch.tsx` uploads.
 * GEOMETRY is selection-independent (filled-ness and opacity never change
 * with selection); only the fill COLOR does, a color-only pass
 * (`interiorColors`).
 */

type Vec3 = [number, number, number];

const pushTriangle = (out: number[], a: Vec3, b: Vec3, c: Vec3) => {
  out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
};

/**
 * The triangles of a shape's flat interior, 9 floats each, in the
 * collection's space — or null when the shape has no batched interior
 * (points, lines, paths, the 3D wireframe meshes, degenerate polygons).
 * `planeZ` only matters for a sectioned ellipsoid (the ring it cuts).
 */
export function interiorTriangles(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
  planeZ: number | null,
): number[] | null {
  const vectors = annotation.vectors;
  if (!vectors || vectors.length < 2) return null;

  // CUBE shares the rectangle branch: same corner-pair vectors.
  if (annotation.kind === AnnotationKind.Rectangle || annotation.kind === AnnotationKind.Cube) {
    const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
      getVectorPoint(vector, flattenToPlane),
    );
    // Extruded 3D box: its own mesh (`AnnotationShape`).
    if (!flattenToPlane && Math.abs(z1 - z0) >= MIN_DEPTH) return null;
    const out: number[] = [];
    pushTriangle(out, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0]);
    pushTriangle(out, [x0, y0, z0], [x1, y1, z0], [x0, y1, z0]);
    return out;
  }

  // SPHERE shares the ellipse branch; the ring is the SECTIONED one, so what
  // can be clicked is what is drawn.
  if (annotation.kind === AnnotationKind.Ellipse || annotation.kind === AnnotationKind.Sphere) {
    const ring = ellipseRingOf(annotation, flattenToPlane, planeZ);
    if (!ring) return null;
    const rim = ellipseRing(ring.cx, ring.cy, ring.z, ring.rx, ring.ry, ELLIPSE_SEGMENTS);
    const center: Vec3 = [ring.cx, ring.cy, ring.z];
    const out: number[] = [];
    for (let i = 0; i < rim.length; i++) {
      pushTriangle(out, center, rim[i], rim[(i + 1) % rim.length]);
    }
    return out;
  }

  if (annotation.kind === AnnotationKind.Polygon) {
    // Triangulation needs three distinct vertices; below that there is no inside.
    if (vectors.length < 3) return null;
    const points = vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
    // Flat at the first vertex's z, as the per-shape ShapeGeometry was.
    const z = points[0][2];
    const contour = points.map((point) => new THREE.Vector2(point[0], point[1]));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    if (faces.length === 0) return null;
    const out: number[] = [];
    const at = (index: number): Vec3 => [contour[index].x, contour[index].y, z];
    for (const [a, b, c] of faces) pushTriangle(out, at(a), at(b), at(c));
    return out;
  }

  return null;
}

/** The plane-INDEPENDENT interiors (everything but sectioned ellipsoids). */
export const staticInteriorTriangles = (
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
): number[] | null =>
  isSectionedEllipse(annotation, flattenToPlane)
    ? null
    : interiorTriangles(annotation, flattenToPlane, null);

/** A sectioned ellipsoid's cross-section interior at `planeZ`; null for any other shape. */
export const sectionedInteriorTriangles = (
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
  planeZ: number | null,
): number[] | null =>
  isSectionedEllipse(annotation, flattenToPlane)
    ? interiorTriangles(annotation, flattenToPlane, planeZ)
    : null;

export type InteriorBatch<R> = {
  /** Stable per (filled, opacity): the React key, so a mesh never flips kind. */
  key: string;
  /** False: the pick-only batch — drawn invisible, raycast like any mesh. */
  filled: boolean;
  /** Fill alpha shared by every shape in this batch (1 for the pick batch). */
  opacity: number;
  /** Non-indexed triangle soup, 9 floats per triangle. */
  positions: Float32Array;
  /** Triangle ranges, sorted by `start`; one entry per contributing shape. */
  ranges: OutlineRange<R>[];
  triangleCount: number;
  /** Per range, the fill under each selection state — `interiorColors` reads these. */
  fills: { annotationId: string; fill: string; selectedFill: string }[];
};

const PICK_KEY = "pick";

/**
 * Fold the entries' interiors into one batch per fill opacity (filled
 * shapes) plus one pick-only batch (unfilled). Triangle order is entry order,
 * so `ranges` is sorted by construction.
 */
export function buildInteriorBatches<R>(
  entries: readonly { annotation: SceneAnnotationFragment; roi: R }[],
  trianglesOf: (annotation: SceneAnnotationFragment) => number[] | null,
): InteriorBatch<R>[] {
  type Accumulator = {
    key: string;
    filled: boolean;
    opacity: number;
    positions: number[];
    ranges: OutlineRange<R>[];
    fills: InteriorBatch<R>["fills"];
    triangles: number;
  };
  const byKey = new Map<string, Accumulator>();

  for (const { annotation, roi } of entries) {
    const triangles = trianglesOf(annotation);
    if (!triangles || triangles.length === 0) continue;
    const base = resolveStyle(annotation, false);
    const active = resolveStyle(annotation, true);
    const filled = base.fill !== null;
    const key = filled ? `fill:${base.fillOpacity}` : PICK_KEY;

    let batch = byKey.get(key);
    if (!batch) {
      batch = {
        key,
        filled,
        opacity: filled ? base.fillOpacity : 1,
        positions: [],
        ranges: [],
        fills: [],
        triangles: 0,
      };
      byKey.set(key, batch);
    }

    const start = batch.triangles;
    for (let i = 0; i < triangles.length; i++) batch.positions.push(triangles[i]);
    batch.triangles += triangles.length / 9;
    batch.ranges.push({ start, end: batch.triangles, roi });
    batch.fills.push({
      annotationId: annotation.id,
      fill: base.fill ?? base.stroke,
      selectedFill: active.fill ?? active.stroke,
    });
  }

  return [...byKey.values()].map((batch) => ({
    key: batch.key,
    filled: batch.filled,
    opacity: batch.opacity,
    positions: new Float32Array(batch.positions),
    ranges: batch.ranges,
    triangleCount: batch.triangles,
    fills: batch.fills,
  }));
}

const SCRATCH_COLOR = new THREE.Color();

/**
 * The per-vertex color buffer for one filled batch under one selection — the
 * ONLY thing a selection change recomputes (an unnamed fill follows the
 * stroke, which the selection overrides).
 */
export function interiorColors<R>(
  batch: InteriorBatch<R>,
  isActive: (annotationId: string) => boolean,
): Float32Array {
  const colors = new Float32Array(batch.triangleCount * 9);
  for (let k = 0; k < batch.ranges.length; k++) {
    const range = batch.ranges[k];
    const fill = batch.fills[k];
    SCRATCH_COLOR.set(isActive(fill.annotationId) ? fill.selectedFill : fill.fill);
    const r = SCRATCH_COLOR.r;
    const g = SCRATCH_COLOR.g;
    const b = SCRATCH_COLOR.b;
    for (let i = range.start * 9; i < range.end * 9; i += 3) {
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
  }
  return colors;
}
