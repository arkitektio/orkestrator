import * as THREE from "three";

import {
  AnnotationKind,
  type SceneAnnotationFragment,
  type SceneLayerFragment,
} from "@/mikro-next/api/graphql";
import {
  placementToSpatialAffine,
  spatialAxisTriple,
} from "@/mikro-next/lib/coords/transformGraph";

import { affineToMatrix4 } from "../../platform/coords/worldTransform";
import { padDegenerateAxes } from "../../platform/camera/cameraFit";
import { type ZSpan } from "./annotationVisibility";
import type { SceneTransformContext } from "../../platform/model/layerModel";
import type { RoiBounds } from "./roiSelectionStore";

/**
 * Annotation geometry, kind-aware and pure: collection-space vectors → sample
 * points → world extent. Lifted out of `AnnotationLayer` so panels (the
 * annotations sidebar's "move to") can compute the same bounds the renderer
 * draws and the rubber band selects against, without touching the canvas.
 */

export type AnnotationLayerVariant = Extract<
  SceneLayerFragment,
  { __typename: "AnnotationLayer" }
>;
export type AnnotationCollectionRef = AnnotationLayerVariant["annotationCollection"];

export const ANNOTATION_RENDER_Z = 0.15;
export const MIN_DEPTH = 0.001;

export function getVectorPoint(
  vector: number[],
  flattenToPlane: boolean,
): [number, number, number] {
  return [vector[0] ?? 0, vector[1] ?? 0, flattenToPlane ? ANNOTATION_RENDER_Z : (vector[2] ?? 0)];
}

export function getRectangleCorners(
  start: number[],
  end: number[],
  flattenToPlane: boolean,
): [number, number, number][] {
  const [x0, y0, z0] = getVectorPoint(start, flattenToPlane);
  const [x1, y1, z1] = getVectorPoint(end, flattenToPlane);

  if (flattenToPlane || Math.abs(z1 - z0) < MIN_DEPTH) {
    return [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
    ];
  }

  return [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
}

/** One closed-able ring of an axis-aligned ellipse at a fixed z. */
export function ellipseRing(
  cx: number,
  cy: number,
  z: number,
  rx: number,
  ry: number,
  segments: number,
): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let index = 0; index < segments; index += 1) {
    const theta = (index / segments) * Math.PI * 2;
    points.push([cx + rx * Math.cos(theta), cy + ry * Math.sin(theta), z]);
  }
  return points;
}

export function getEllipsisPoints(
  start: number[],
  end: number[],
  flattenToPlane: boolean,
  segments = 24,
): [number, number, number][] {
  const [x0, y0, z0] = getVectorPoint(start, flattenToPlane);
  const [x1, y1, z1] = getVectorPoint(end, flattenToPlane);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  const points = ellipseRing(cx, cy, z0, rx, ry, segments);

  if (!flattenToPlane && Math.abs(z1 - z0) >= MIN_DEPTH) {
    points.push(...ellipseRing(cx, cy, z1, rx, ry, segments));
  }

  return points;
}

export function getAnnotationSelectionPoints(
  annotation: SceneAnnotationFragment,
  flattenToPlane: boolean,
): [number, number, number][] {
  const vectors = annotation.vectors;
  if (!vectors || vectors.length === 0) return [];

  if (annotation.kind === AnnotationKind.Point && vectors.length >= 1) {
    return [getVectorPoint(vectors[0], flattenToPlane)];
  }

  if (annotation.kind === AnnotationKind.Line && vectors.length >= 2) {
    return vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
  }

  if (annotation.kind === AnnotationKind.Rectangle && vectors.length >= 2) {
    return getRectangleCorners(vectors[0], vectors[1], flattenToPlane);
  }

  if (annotation.kind === AnnotationKind.Ellipse && vectors.length >= 2) {
    return getEllipsisPoints(vectors[0], vectors[1], flattenToPlane);
  }

  // Every remaining kind's vectors ARE its points: a path's and a polygon's
  // vertices, a multi-point's marks.
  return vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
}

/**
 * The shape in WORLD µm: the x/y box the rubber band selects against, and the
 * z extent the flat view's plane test reads. Both come from the same pass over
 * the (unflattened) geometry — the whole point of the z span is the depth
 * `flattenToPlane` would throw away.
 */
export function getWorldExtent(
  annotation: SceneAnnotationFragment,
  affineMatrix: THREE.Matrix4,
): { bounds: RoiBounds; zSpan: ZSpan } | null {
  const points = getAnnotationSelectionPoints(annotation, false);
  if (points.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  // One scratch vector for the whole pass: this runs for EVERY annotation on
  // every placement recompute, and an ellipse alone samples 24 points.
  for (const [x, y, z] of points) {
    EXTENT_SCRATCH.set(x, y, z).applyMatrix4(affineMatrix);
    minX = Math.min(minX, EXTENT_SCRATCH.x);
    maxX = Math.max(maxX, EXTENT_SCRATCH.x);
    minY = Math.min(minY, EXTENT_SCRATCH.y);
    maxY = Math.max(maxY, EXTENT_SCRATCH.y);
    if (Number.isFinite(EXTENT_SCRATCH.z)) {
      minZ = Math.min(minZ, EXTENT_SCRATCH.z);
      maxZ = Math.max(maxZ, EXTENT_SCRATCH.z);
    }
  }

  return {
    bounds: { minX, maxX, minY, maxY },
    zSpan: minZ === Infinity ? { min: 0, max: 0 } : { min: minZ, max: maxZ },
  };
}

const EXTENT_SCRATCH = new THREE.Vector3();

/**
 * The collection's drawing space → scene world. The collection owns its
 * coordinate system, so its axes name the columns of every edge on the path;
 * `spatial` is the (x, y, z) triple the composer reads them out in.
 */
/** Placement warnings fire once per collection, not once per recompute. */
const warnedCollections = new Set<string>();

export function resolveCollectionMatrix(
  layer: AnnotationLayerVariant,
  collection: AnnotationCollectionRef,
  transformContext: SceneTransformContext,
): THREE.Matrix4 {
  const names = (collection.coordinateSystem.axes ?? []).map((axis) => axis.name);
  // Fewer than three axes cannot name an (x, y, z) triple — composing with
  // undefined axis names would silently misplace; identity is the honest
  // degradation (same rule as the null path below).
  if (names.length < 3) {
    if (!warnedCollections.has(collection.id)) {
      warnedCollections.add(collection.id);
      console.warn(
        `[annotation] collection ${collection.id} declares ${names.length} axes; ` +
          `three spatial axes are needed for placement — drawing in the collection's own space`,
      );
    }
    return new THREE.Matrix4().identity();
  }
  const spatial = [names[names.length - 1], names[names.length - 2], names[names.length - 3]];
  if (!layer.asAffine) {
    // UNREGISTERED, or a path the server could not condense. The renderer
    // does not dispatch such a layer (`isPlaceable`); panels that still ask
    // for a matrix (move-to, mesh design) get the collection's own space,
    // never a guess.
    if (!warnedCollections.has(collection.id)) {
      warnedCollections.add(collection.id);
      console.warn(
        `[annotation] collection ${collection.id}: no placement (asAffine is null); ` +
          `not drawn — using the collection's own space where a matrix is required`,
      );
    }
    return new THREE.Matrix4().identity();
  }
  // The server's `asAffine` is the only placement authority; input side named
  // by the collection's axes, output side by the world's.
  const composed = placementToSpatialAffine(
    layer.asAffine,
    spatial,
    spatialAxisTriple(transformContext.worldCoordinateSystem),
  );
  return composed ? affineToMatrix4(composed) : new THREE.Matrix4().identity();
}

/**
 * A world Box3 a camera fit can consume. Each DEGENERATE axis is padded out to
 * at least `minHalfExtent` per side — a POINT (all axes) or a flat rectangle
 * (z only) would otherwise fit to a zero-size box, which the ortho branch of
 * `applyFitToCamera` answers with an absurd zoom. Padded per axis, not
 * `expandByScalar`, so a thin-but-long shape keeps its real long side.
 */
export function worldExtentToBox3(
  extent: { bounds: RoiBounds; zSpan: ZSpan },
  minHalfExtent: number,
): THREE.Box3 {
  return padDegenerateAxes(
    new THREE.Box3(
      new THREE.Vector3(extent.bounds.minX, extent.bounds.minY, extent.zSpan.min),
      new THREE.Vector3(extent.bounds.maxX, extent.bounds.maxY, extent.zSpan.max),
    ),
    minHalfExtent,
  );
}
