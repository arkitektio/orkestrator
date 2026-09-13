import type * as THREE from "three";

import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro-next/api/graphql";
import { getVectorPoint, getWorldExtent } from "../annotationBounds";
import { resolveStyle } from "../annotationStyle";
import type { ZSpan } from "../annotationVisibility";
import type { RoiBounds, SelectedRoi } from "../roiSelectionStore";

/**
 * The PURE half of the annotation layer's data flow: query rows → placed
 * entries → point/shape split. Extracted from the component so the memo
 * bodies are unit-testable — and so the one identity invariant everything
 * hangs on is enforced in exactly one place:
 *
 * **A row that did not change keeps its `PlacedEntry` (and `roi`) identity.**
 * Apollo preserves row object identity across polls for unchanged rows;
 * caching the placement per row (WeakMap) extends that stability through the
 * whole chain — `shapePropsEqual` compares `roi` by reference, so a poll
 * that changes one annotation re-renders ONE shape, not the collection
 * (previously every recompute minted fresh `roi` objects and re-rendered
 * everything).
 */

export type PlacedEntry = {
  annotation: SceneAnnotationFragment;
  bounds: RoiBounds;
  zSpan: ZSpan;
  roi: SelectedRoi;
};

/** The per-layer constants of a placement — memoize ONE object per layer. */
export type PlacementIdentity = {
  layerId: string;
  systemId: string | null;
  axisNames: string[];
};

type CacheSlot = {
  matrix: THREE.Matrix4;
  identity: PlacementIdentity;
  entry: PlacedEntry;
};

const PLACEMENT_CACHE = new WeakMap<SceneAnnotationFragment, CacheSlot>();

export function placeAnnotations(
  annotations: readonly SceneAnnotationFragment[],
  matrix: THREE.Matrix4,
  identity: PlacementIdentity,
): PlacedEntry[] {
  const out: PlacedEntry[] = [];
  for (const annotation of annotations) {
    const cached = PLACEMENT_CACHE.get(annotation);
    if (cached && cached.matrix === matrix && cached.identity === identity) {
      out.push(cached.entry);
      continue;
    }
    const extent = getWorldExtent(annotation, matrix);
    if (!extent) continue;
    const entry: PlacedEntry = {
      annotation,
      bounds: extent.bounds,
      zSpan: extent.zSpan,
      roi: {
        id: annotation.id,
        layerId: identity.layerId,
        name: annotation.name,
        kind: annotation.kind,
        systemId: identity.systemId,
        axisNames: identity.axisNames,
        vectors: annotation.vectors ?? [],
        coordinates: annotation.coordinates ?? [],
      },
    };
    PLACEMENT_CACHE.set(annotation, { matrix, identity, entry });
    out.push(entry);
  }
  return out;
}

export type PointEntry = {
  id: string;
  position: [number, number, number];
  color: string;
  opacity: number;
  roi: SelectedRoi;
};

const SHOWN_CACHE = new WeakMap<readonly PlacedEntry[], PlacedEntry[]>();

/**
 * `placed.filter(isShown)` with a VALUE-STABLE result: when the filter keeps
 * the same entries as last time for this `placed` array, the previous array
 * is returned. A z-scrub tick re-filters at pointer cadence and usually lands
 * on the same set; without this every tick minted a new `shown` identity and
 * everything memoized on it — the partition, the outline batches, their GPU
 * uploads — rebuilt for nothing.
 */
export function shownEntries(
  placed: readonly PlacedEntry[],
  isShown: (entry: PlacedEntry) => boolean,
): PlacedEntry[] {
  const next = placed.filter(isShown);
  const previous = SHOWN_CACHE.get(placed);
  if (previous && sameEntries(previous, next)) return previous;
  SHOWN_CACHE.set(placed, next);
  return next;
}

export type PartitionedEntries = {
  /** POINT annotations with a position — drawn as instanced meshes. */
  points: PlacedEntry[];
  /** Everything else — memoized shapes + the merged outline batches. */
  others: PlacedEntry[];
};

/**
 * Points draw as instanced meshes (one per distinct opacity); everything else
 * stays a memoized shape. Selection-INDEPENDENT on purpose: `others` feeds
 * `buildOutlineBatches`, whose Float32Arrays (and GPU upload) must survive a
 * click — selection only tints. Style the points afterwards with
 * `pointGroupsOf`, which is the half that reads the selection.
 */
export function partitionEntries(shown: readonly PlacedEntry[]): PartitionedEntries {
  const points: PlacedEntry[] = [];
  const others: PlacedEntry[] = [];
  for (const entry of shown) {
    const { annotation } = entry;
    if (annotation.kind === AnnotationKind.Point && (annotation.vectors?.length ?? 0) >= 1) {
      points.push(entry);
    } else {
      others.push(entry);
    }
  }
  return { points, others };
}

/** The styled, opacity-bucketed point instances (one bucket per instanced mesh). */
export function pointGroupsOf(
  points: readonly PlacedEntry[],
  isSelected: (id: string) => boolean,
  flattenToPlane: boolean,
): [number, PointEntry[]][] {
  const byOpacity = new Map<number, PointEntry[]>();
  for (const entry of points) {
    const { annotation } = entry;
    const style = resolveStyle(annotation, isSelected(annotation.id));
    const point: PointEntry = {
      id: annotation.id,
      position: getVectorPoint(annotation.vectors![0], flattenToPlane),
      color: style.stroke,
      opacity: style.strokeOpacity * 0.85,
      roi: entry.roi,
    };
    const bucket = byOpacity.get(point.opacity);
    if (bucket) bucket.push(point);
    else byOpacity.set(point.opacity, [point]);
  }
  return [...byOpacity.entries()];
}

/**
 * Both halves in one call — kept for callers (and tests) that want the old
 * shape. Component code should memoize the halves separately.
 */
export function splitPointEntries(
  shown: readonly PlacedEntry[],
  isSelected: (id: string) => boolean,
  flattenToPlane: boolean,
): { pointGroups: [number, PointEntry[]][]; otherShapes: PlacedEntry[] } {
  const { points, others } = partitionEntries(shown);
  return { pointGroups: pointGroupsOf(points, isSelected, flattenToPlane), otherShapes: others };
}

/** Element-wise identity: cached entries make this the cheap change test. */
export const sameEntries = (
  a: readonly PlacedEntry[] | null,
  b: readonly PlacedEntry[],
): boolean => a !== null && a.length === b.length && a.every((entry, i) => entry === b[i]);
