import * as THREE from "three";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { MIN_DEPTH, ellipseRing, getVectorPoint } from "./annotationBounds";
import { HOVER_STROKE, resolveStyle } from "./annotationStyle";
import { ellipsoidCrossSectionScale } from "./primitiveDraw";

/**
 * Merged annotation outlines: one `LineSegments2` per (collection, stroke
 * width) instead of one `Line2` + `Line2NodeMaterial` per shape. For a
 * thousand-ROI collection that collapses ~a thousand fat-line draw calls and
 * materials into a handful; selection highlights are a color-range rewrite.
 *
 * This module is the PURE half — outline geometry and batch layout, unit
 * tested — so the component side only uploads buffers and maps picks.
 * Every flat shape's outline is drawn here: plane-independent ones by
 * `buildOutlineBatches`, the plane-following SECTIONED ellipsoid rings by
 * `buildSectionedOutlineBatches`. `AnnotationShape` keeps only the 3D
 * wireframe meshes (`drawsOwnMesh`); interiors are `interiorBatch.ts`.
 */

/** Smallest cross-section drawn for an ellipsoid the plane barely grazes. */
export const MIN_CROSS_SECTION_SCALE = 0.05;

export const ELLIPSE_SEGMENTS = 48;

/**
 * Whether a shape is an extruded 3D box/ellipsoid, drawn as its own
 * wireframe (+ fill) mesh by `AnnotationShape` rather than by any batch.
 */
export function drawsOwnMesh(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
): boolean {
  const vectors = annotation.vectors;
  if (flattenToPlane || !vectors || vectors.length < 2) return false;
  const isBox =
    annotation.kind === AnnotationKind.Rectangle || annotation.kind === AnnotationKind.Cube;
  const isRound =
    annotation.kind === AnnotationKind.Ellipse || annotation.kind === AnnotationKind.Sphere;
  if (!isBox && !isRound) return false;
  const depth = Math.abs((vectors[1][2] ?? 0) - (vectors[0][2] ?? 0));
  // Box compares the full depth, the ellipsoid its z RADIUS (as the branches do).
  return (isBox ? depth : depth / 2) >= MIN_DEPTH;
}

/**
 * A depth-bearing ellipse/sphere in the flat view: its ring is the cross-
 * section the plane cuts, so it moves with the plane and lives in the
 * SECTIONED batches (rebuilt per scrub, over these few shapes only).
 */
export function isSectionedEllipse(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
): boolean {
  const vectors = annotation.vectors;
  if (!flattenToPlane || !vectors || vectors.length < 2) return false;
  if (annotation.kind !== AnnotationKind.Ellipse && annotation.kind !== AnnotationKind.Sphere) {
    return false;
  }
  return Math.abs((vectors[1][2] ?? 0) - (vectors[0][2] ?? 0)) / 2 >= MIN_DEPTH;
}

export type EllipseRing = { cx: number; cy: number; z: number; rx: number; ry: number };

/**
 * The drawn ring of a flat ellipse/sphere — for a sectioned one, scaled to the
 * cross-section at `planeZ` (the flat view's slice in the collection's space;
 * null in 3D and in scenes without a z axis → unscaled). Null for kinds that
 * draw no ring (and for the 3D ellipsoid, which is a mesh).
 */
export function ellipseRingOf(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
  planeZ: number | null,
): EllipseRing | null {
  const vectors = annotation.vectors;
  if (!vectors || vectors.length < 2) return null;
  if (annotation.kind !== AnnotationKind.Ellipse && annotation.kind !== AnnotationKind.Sphere) {
    return null;
  }
  const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
    getVectorPoint(vector, flattenToPlane),
  );
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  // True 3D sphere/ellipsoid: wireframe mesh, not a ring.
  if (!flattenToPlane && Math.abs(z1 - z0) / 2 >= MIN_DEPTH) return null;

  // Depth comes from the raw vectors (`getVectorPoint` discarded z for drawing).
  const depthCenter = ((vectors[0][2] ?? 0) + (vectors[1][2] ?? 0)) / 2;
  const depthRadius = Math.abs((vectors[1][2] ?? 0) - (vectors[0][2] ?? 0)) / 2;
  const sectioned = flattenToPlane && depthRadius >= MIN_DEPTH;
  const section =
    planeZ === null || !sectioned
      ? 1
      : Math.max(
          ellipsoidCrossSectionScale(planeZ, depthCenter, depthRadius) ?? 0,
          // The plane is past the pole — it only reached this shape through
          // the visibility slab's half-slice of slack. Mark where the
          // ellipsoid ends rather than collapsing to nothing.
          MIN_CROSS_SECTION_SCALE,
        );
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    z: z0,
    rx: rx * section,
    ry: ry * section,
  };
}

/**
 * The closed polyline of a SECTIONED ellipsoid's ring at `planeZ`, or null
 * for every other shape (those are `outlinePoints`' job).
 */
export function sectionedOutlinePoints(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
  planeZ: number | null,
): [number, number, number][] | null {
  if (!isSectionedEllipse(annotation, flattenToPlane)) return null;
  const ring = ellipseRingOf(annotation, flattenToPlane, planeZ);
  if (!ring) return null;
  const points = ellipseRing(ring.cx, ring.cy, ring.z, ring.rx, ring.ry, ELLIPSE_SEGMENTS);
  points.push(points[0]);
  return points;
}

/**
 * The polyline a shape's plane-independent OUTLINE draws, in the collection's
 * space, or null when the shape draws no fat line here (points, the 3D
 * wireframe box/sphere, and sectioned ellipsoids — `sectionedOutlinePoints`).
 */
export function outlinePoints(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
): [number, number, number][] | null {
  const vectors = annotation.vectors;
  if (!vectors || vectors.length === 0) return null;

  if (annotation.kind === AnnotationKind.Point) return null;

  if (annotation.kind === AnnotationKind.Line && vectors.length >= 2) {
    return vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
  }

  if (
    (annotation.kind === AnnotationKind.Rectangle || annotation.kind === AnnotationKind.Cube) &&
    vectors.length >= 2
  ) {
    const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
      getVectorPoint(vector, flattenToPlane),
    );
    // Extruded 3D box: drawn as a wireframe mesh, not a fat line.
    if (!flattenToPlane && Math.abs(z1 - z0) >= MIN_DEPTH) return null;
    return [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y0, z0],
    ];
  }

  if (
    (annotation.kind === AnnotationKind.Ellipse || annotation.kind === AnnotationKind.Sphere) &&
    vectors.length >= 2
  ) {
    const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
      getVectorPoint(vector, flattenToPlane),
    );
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    const rz = Math.abs(z1 - z0) / 2;
    // True 3D sphere/ellipsoid: wireframe mesh, not a fat line.
    if (!flattenToPlane && rz >= MIN_DEPTH) return null;

    // A SECTIONED ellipsoid's ring depends on the drawn plane, and this batch
    // deliberately does not: rebuilding every collection's Float32Arrays at
    // z-scrub cadence was the cost the batch exists to avoid. Those shapes go
    // to `buildSectionedOutlineBatches`, rebuilt per scrub over them alone.
    const depthRadius = Math.abs((vectors[1][2] ?? 0) - (vectors[0][2] ?? 0)) / 2;
    if (flattenToPlane && depthRadius >= MIN_DEPTH) return null;

    const points = ellipseRing(cx, cy, z0, rx, ry, ELLIPSE_SEGMENTS);
    points.push(points[0]);
    return points;
  }

  if (
    (annotation.kind === AnnotationKind.Polygon || annotation.kind === AnnotationKind.Path) &&
    vectors.length >= 2
  ) {
    const pts = vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
    if (annotation.kind === AnnotationKind.Polygon) pts.push(pts[0]); // close polygon
    return pts;
  }

  // Fallback: any shape renders as a polyline.
  if (vectors.length >= 2) {
    return vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
  }

  return null;
}

/** Contiguous segment range one ROI owns inside a batch (`[start, end)`). */
export type OutlineRange<R> = { start: number; end: number; roi: R };

export type OutlineBatch<R> = {
  /** Screen-space stroke width shared by every segment in this batch. */
  lineWidth: number;
  /** Interleaved segment endpoints, 6 floats per segment (xyz, xyz). */
  positions: Float32Array;
  /** Sorted by `start`; one entry per contributing shape. */
  ranges: OutlineRange<R>[];
  segmentCount: number;
  /** Per range, the annotation id and base stroke — `batchColors` reads these. */
  strokes: { annotationId: string; stroke: string; selectedStroke: string }[];
};

const SCRATCH_COLOR = new THREE.Color();

/**
 * Fold the shown shapes' plane-independent outlines into one batch per stroke
 * width. Point order inside a batch is entry order, so `ranges` is sorted by
 * construction and `roiForSegment` can binary-search a picked `faceIndex`.
 */
export function buildOutlineBatches<R>(
  entries: readonly { annotation: SceneAnnotationFragment; roi: R }[],
  flattenToPlane: boolean,
): OutlineBatch<R>[] {
  return foldOutlineBatches(entries, (annotation) => outlinePoints(annotation, flattenToPlane));
}

/**
 * The sectioned ellipsoid rings at `planeZ`, batched the same way. Callers
 * pass ONLY the sectioned entries (`isSectionedEllipse`), so a scrub rebuilds
 * these few rings and never the collection's static batches.
 */
export function buildSectionedOutlineBatches<R>(
  entries: readonly { annotation: SceneAnnotationFragment; roi: R }[],
  flattenToPlane: boolean,
  planeZ: number | null,
): OutlineBatch<R>[] {
  return foldOutlineBatches(entries, (annotation) =>
    sectionedOutlinePoints(annotation, flattenToPlane, planeZ),
  );
}

function foldOutlineBatches<R>(
  entries: readonly { annotation: SceneAnnotationFragment; roi: R }[],
  pointsOf: (annotation: SceneAnnotationFragment) => [number, number, number][] | null,
): OutlineBatch<R>[] {
  type Accumulator = {
    lineWidth: number;
    positions: number[];
    ranges: OutlineRange<R>[];
    strokes: OutlineBatch<R>["strokes"];
    segments: number;
  };
  const byWidth = new Map<number, Accumulator>();

  for (const { annotation, roi } of entries) {
    const points = pointsOf(annotation);
    if (!points || points.length < 2) continue;
    // GEOMETRY is selection-independent (selection changes color, never
    // width — asserted below in `batchColors`): a click re-tints, it never
    // re-uploads positions.
    const base = resolveStyle(annotation, false);
    const active = resolveStyle(annotation, true);

    let batch = byWidth.get(base.strokeWidth);
    if (!batch) {
      batch = { lineWidth: base.strokeWidth, positions: [], ranges: [], strokes: [], segments: 0 };
      byWidth.set(base.strokeWidth, batch);
    }

    const start = batch.segments;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay, az] = points[i];
      const [bx, by, bz] = points[i + 1];
      batch.positions.push(ax, ay, az, bx, by, bz);
    }
    batch.segments += points.length - 1;
    batch.ranges.push({ start, end: batch.segments, roi });
    batch.strokes.push({ annotationId: annotation.id, stroke: base.stroke, selectedStroke: active.stroke });
  }

  return [...byWidth.values()]
    .filter((batch) => batch.segments > 0)
    .map((batch) => ({
      lineWidth: batch.lineWidth,
      positions: new Float32Array(batch.positions),
      ranges: batch.ranges,
      segmentCount: batch.segments,
      strokes: batch.strokes,
    }));
}

/**
 * The color buffer for one batch under one selection — the ONLY thing a
 * selection change recomputes: `setColors` re-tints in place while the
 * positions (and their GPU buffer) stay untouched. The hovered shape, when
 * there is one, wears `HOVER_STROKE` — unless it is selected, which wins.
 */
export function batchColors<R>(
  batch: OutlineBatch<R>,
  isActive: (annotationId: string) => boolean,
  hoveredId: string | null = null,
): Float32Array {
  const colors = new Float32Array(batch.segmentCount * 6);
  for (let k = 0; k < batch.ranges.length; k++) {
    const range = batch.ranges[k];
    const stroke = batch.strokes[k];
    SCRATCH_COLOR.set(
      isActive(stroke.annotationId)
        ? stroke.selectedStroke
        : stroke.annotationId === hoveredId
          ? HOVER_STROKE
          : stroke.stroke,
    );
    const r = SCRATCH_COLOR.r;
    const g = SCRATCH_COLOR.g;
    const b = SCRATCH_COLOR.b;
    for (let i = range.start * 6; i < range.end * 6; i += 3) {
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
  }
  return colors;
}

/**
 * The ROI owning a picked segment (`faceIndex` from the fat-line raycast) —
 * or, over an interior batch's triangle ranges, a picked triangle.
 */
export function roiForSegment<R>(
  ranges: readonly OutlineRange<R>[],
  segmentIndex: number | null | undefined,
): R | null {
  if (segmentIndex === undefined || segmentIndex === null || segmentIndex < 0) return null;
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = ranges[mid];
    if (segmentIndex < range.start) hi = mid - 1;
    else if (segmentIndex >= range.end) lo = mid + 1;
    else return range.roi;
  }
  return null;
}
