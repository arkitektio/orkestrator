import * as THREE from "three";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { MIN_DEPTH, ellipseRing, getVectorPoint } from "./annotationBounds";
import { resolveStyle } from "./annotationStyle";

/**
 * Merged annotation outlines: one `LineSegments2` per (collection, stroke
 * width) instead of one `Line2` + `Line2NodeMaterial` per shape. For a
 * thousand-ROI collection that collapses ~a thousand fat-line draw calls and
 * materials into a handful; selection highlights are a color-range rewrite.
 *
 * This module is the PURE half — outline geometry and batch layout, unit
 * tested — so the component side only uploads buffers and maps picks.
 * `outlinePoints` MUST stay in lockstep with `AnnotationShape`'s Line-
 * producing branches (`AnnotationLayer.tsx`): it is the same drawing decision,
 * expressed as data.
 */

/** Smallest cross-section drawn for an ellipsoid the plane barely grazes. */
export const MIN_CROSS_SECTION_SCALE = 0.05;

export const ELLIPSE_SEGMENTS = 48;

/**
 * The polyline a shape's OUTLINE draws, in the collection's space — exactly
 * the points `AnnotationShape` hands its `<Line>`, or null when the shape
 * draws no fat line (points, and the 3D wireframe box/sphere branches).
 * `planeZ` is the flat view's slice in the collection's space (the ellipsoid
 * section input); null in 3D and in scenes without a z axis.
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

    // A SECTIONED ellipsoid's ring depends on the drawn plane, and the batch
    // deliberately does not: rebuilding every collection's Float32Arrays at
    // z-scrub cadence was the cost the batch exists to avoid. Those few
    // shapes keep their own per-shape `<Line>` (AnnotationShape's ellipse
    // branch), which re-renders alone on a scrub (`shapeReadsPlaneZ`).
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
 * Fold the shown shapes' outlines into one batch per stroke width. Point
 * order inside a batch is entry order, so `ranges` is sorted by construction
 * and `roiForSegment` can binary-search a picked `faceIndex`.
 */
export function buildOutlineBatches<R>(
  entries: readonly { annotation: SceneAnnotationFragment; roi: R }[],
  flattenToPlane: boolean,
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
    const points = outlinePoints(annotation, flattenToPlane);
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
 * positions (and their GPU buffer) stay untouched.
 */
export function batchColors<R>(
  batch: OutlineBatch<R>,
  isActive: (annotationId: string) => boolean,
): Float32Array {
  const colors = new Float32Array(batch.segmentCount * 6);
  for (let k = 0; k < batch.ranges.length; k++) {
    const range = batch.ranges[k];
    const stroke = batch.strokes[k];
    SCRATCH_COLOR.set(isActive(stroke.annotationId) ? stroke.selectedStroke : stroke.stroke);
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

/** The ROI owning a picked segment (`faceIndex` from the fat-line raycast). */
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
