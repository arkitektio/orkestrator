import { AnnotationKind } from "@/mikro/api/graphql";
import type { AxisCoords } from "@/mikro/lib/coords/axisPath";

/**
 * Attribute lookups for a selected ROI annotation. Lookups start in the
 * annotation COLLECTION's own coordinate system — the attribute-plan server
 * resolves the path from there to every reachable table, and
 * `applyPathToCoords` walks it on named coords (unreachable → the plan is
 * dropped, never looked up with wrong coordinates). So no world→voxel
 * inversion happens here: the raw collection-space `annotation.vectors` go in
 * as-is (`resolveSampleIndex` rounds to integers after the path).
 *
 * The sampling is deliberately sparse ("don't run it for every coord"): a
 * kind-aware set of representative points, deduped per rounded coordinate.
 */

/** One `annotation.vectors` entry ([x, y, z], components may be missing). */
export type RoiVector = readonly number[];

export type RoiLookupPoint = {
  label: string;
  point: [number, number, number];
};

export type RoiLookupTarget = {
  /** Stable render key (label + system + rounded coords). */
  key: string;
  label: string;
  systemId: string;
  coords: AxisCoords;
};

/** Paths sample at most this many vertices (evenly spaced, endpoints kept). */
const MAX_PATH_POINTS = 5;

const toPoint = (vec: RoiVector | undefined): [number, number, number] => [
  vec?.[0] ?? 0,
  vec?.[1] ?? 0,
  vec?.[2] ?? 0,
];

const centroidOf = (vectors: readonly RoiVector[]): [number, number, number] => {
  const sum: [number, number, number] = [0, 0, 0];
  vectors.forEach((vec) => {
    const p = toPoint(vec);
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  });
  const n = Math.max(1, vectors.length);
  return [sum[0] / n, sum[1] / n, sum[2] / n];
};

const midpointOf = (a: RoiVector | undefined, b: RoiVector | undefined): [number, number, number] => {
  const pa = toPoint(a);
  const pb = toPoint(b);
  return [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
};

/**
 * The compromise sampling: POINT → its vertex; LINE → both endpoints;
 * RECTANGLE/ELLIPSE → midpoint of the two stored corners; POLYGON → vertex
 * centroid (an honest "background" for concave shapes); PATH → all vertices
 * when ≤5, else 5 evenly spaced including both endpoints. Anything else falls
 * back to the centroid.
 */
export function roiLookupPoints(
  kind: AnnotationKind,
  vectors: readonly RoiVector[],
): RoiLookupPoint[] {
  if (vectors.length === 0) return [];

  switch (kind) {
    case AnnotationKind.Point:
      return [{ label: "point", point: toPoint(vectors[0]) }];
    case AnnotationKind.Line: {
      if (vectors.length === 1) {
        return [{ label: "point", point: toPoint(vectors[0]) }];
      }
      return [
        { label: "start", point: toPoint(vectors[0]) },
        { label: "end", point: toPoint(vectors[vectors.length - 1]) },
      ];
    }
    case AnnotationKind.Rectangle:
    case AnnotationKind.Ellipse:
      return [{ label: "center", point: midpointOf(vectors[0], vectors[vectors.length - 1]) }];
    case AnnotationKind.Polygon:
      return [{ label: "center", point: centroidOf(vectors) }];
    case AnnotationKind.Path: {
      if (vectors.length <= MAX_PATH_POINTS) {
        return vectors.map((vec, i) => ({ label: `p${i + 1}`, point: toPoint(vec) }));
      }
      const indices: number[] = [];
      for (let k = 0; k < MAX_PATH_POINTS; k++) {
        const index = Math.round((k * (vectors.length - 1)) / (MAX_PATH_POINTS - 1));
        if (!indices.includes(index)) indices.push(index);
      }
      return indices.map((index, i) => ({ label: `p${i + 1}`, point: toPoint(vectors[index]) }));
    }
    default:
      return [{ label: "center", point: centroidOf(vectors) }];
  }
}

/**
 * Named coords for one point in the collection's system: every axis starts
 * from the annotation's pinned `coordinates` (0 when unpinned), then the
 * spatial axes overwrite following the collection convention
 * (`resolveCollectionMatrix`): x = last axis, y = second-to-last,
 * z = third-to-last (only when the system has ≥3 axes). Null when the system
 * has fewer than 2 axes — there is no plane to place the point on.
 */
export function roiAxisCoords(args: {
  axisNames: readonly string[];
  coordinates: readonly { name: string; value: number }[];
  point: [number, number, number];
}): AxisCoords | null {
  const { axisNames, coordinates, point } = args;
  const n = axisNames.length;
  if (n < 2) return null;

  const coords: AxisCoords = {};
  for (const axis of axisNames) {
    coords[axis] = coordinates.find((pinned) => pinned.name === axis)?.value ?? 0;
  }
  coords[axisNames[n - 1]] = point[0];
  coords[axisNames[n - 2]] = point[1];
  if (n >= 3) coords[axisNames[n - 3]] = point[2];
  return coords;
}

/**
 * The bounded lookup set for one ROI: coords per representative point,
 * deduped by rounded coordinates (two points in the same voxel would return
 * the same rows — `resolveSampleIndex` rounds the same way).
 */
export function buildRoiLookupTargets(args: {
  systemId: string;
  axisNames: readonly string[];
  coordinates: readonly { name: string; value: number }[];
  points: readonly RoiLookupPoint[];
}): RoiLookupTarget[] {
  const seen = new Set<string>();
  const targets: RoiLookupTarget[] = [];

  for (const { label, point } of args.points) {
    const coords = roiAxisCoords({
      axisNames: args.axisNames,
      coordinates: args.coordinates,
      point,
    });
    if (!coords) continue;

    const roundedKey = Object.keys(coords)
      .sort()
      .map((axis) => `${axis}=${Math.round(coords[axis])}`)
      .join(",");
    const pointKey = `${args.systemId}|${roundedKey}`;
    if (seen.has(pointKey)) continue;
    seen.add(pointKey);

    targets.push({ key: `${label}|${pointKey}`, label, systemId: args.systemId, coords });
  }

  return targets;
}
