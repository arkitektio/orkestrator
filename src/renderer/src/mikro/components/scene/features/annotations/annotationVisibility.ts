import {
  evaluatePin,
  layerCoverage,
  type AnchorLayer,
  type LayerCoverage,
} from "./anchorVisibility";
import { affineToMatrix4, physicalToVoxelZStrict } from "../../platform/coords/worldTransform";

/**
 * Which of a collection's shapes the scene is showing RIGHT NOW.
 *
 * An annotation makes two claims about where it lives, and a viewer that draws
 * every shape of a collection at once honours neither:
 *
 * - **Its pins** (`coordinates`, e.g. `t=5`, `c=0`) — the discrete coordinates
 *   it is pinned to. A coordinate it does not pin, it spans. Same model as a
 *   `CoordinateAnchor`, so the same evaluator (`evaluatePin`) decides them.
 * - **Its vectors** — where it is in space, z included. In the flat view only
 *   one z slab is drawn, so a shape one slice away is not on screen even though
 *   its x/y footprint is.
 *
 * Both are answered against the scene's IMAGE layers, because they are what
 * "showing" means here: the dim sliders pick their slice, the channel toggles
 * pick their intensity indices, and the z slider picks their plane. A pin no
 * image layer can evaluate — an axis none of them has, or a scene with no image
 * layers at all — is left MET rather than hidden: the alternative is a shape the
 * viewer can never bring back, and an unevaluable claim is not a failed one.
 * (This is the one place the annotation rule and the anchor rule differ. An
 * anchor belongs to the very dataset its layer renders, so an axis that dataset
 * lacks is incoherent; a collection is its own container and may be pinned in
 * the coordinates of data this scene does not compose.)
 */

/** A `Coordinate` off the wire: one axis this shape is pinned to. */
export type PinnedCoordinate = { name: string; value: number };

/**
 * The layer facts this module needs. Structural, so `LayerState` satisfies it
 * without a cast and a test needs an object rather than a whole scene.
 */
export type CoverageLayer = AnchorLayer & {
  visible?: boolean;
  zAxis: string | null;
  /** Voxel→world (x, y, z rows). Null = identity. */
  affineMatrix: number[][] | null;
  lens: AnchorLayer["lens"] & {
    /** The lens' own axes and extent — the grid `affineMatrix` places. */
    axisNames: readonly string[];
    shape: readonly number[];
  };
};

/** World-µm z extent of a shape's vectors — a plane's worth when degenerate. */
export type ZSpan = { min: number; max: number };

/**
 * A layer's coverage with its z axis pinned to the plane the flat view draws.
 *
 * `layerCoverage` calls z WHOLE, which is right in 3D (the volume shows every
 * slice) and deliberately generous in 2D. The flat view draws exactly one slab,
 * so here z is a fixed dim like any other, at the voxel index the plane lands
 * on in this layer's grid.
 */
function pinCoverageToPlane(
  coverage: LayerCoverage,
  layer: CoverageLayer,
  planeZ: number,
): LayerCoverage {
  const axis = layer.zAxis;
  if (!axis) return coverage;

  const position = layer.lens.axisNames.indexOf(axis);
  const extent = position === -1 ? null : (layer.lens.shape[position] ?? null);
  // A layer with one z slice pins nothing: every z is its z.
  if (extent === null || extent <= 1) return coverage;

  const whole = new Set(coverage.whole);
  whole.delete(axis);

  // Strict: a plane OUTSIDE this layer's stack pins the axis to NaN — never
  // equal to any pin value, so the pin reads UNMET for this layer instead of
  // "met at the clamped end slice" (a plane a millimetre past a stack must
  // not keep its top slice's annotations visible forever).
  const voxelZ = physicalToVoxelZStrict(affineToMatrix4(layer.affineMatrix), planeZ, extent - 1);
  return {
    ...coverage,
    whole,
    fixed: {
      ...coverage.fixed,
      [axis]: voxelZ ?? Number.NaN,
    },
  };
}

/**
 * What every visible image layer is showing, one coverage each.
 *
 * `planeZ` is `viewerStore.currentZ` in the flat view and null in 3D — pass it
 * and z pins are resolved against the drawn plane, omit it and z spans.
 */
export function sceneCoverages(
  layers: readonly CoverageLayer[],
  dimSelections: Readonly<Record<string, number>>,
  planeZ: number | null,
): LayerCoverage[] {
  return layers
    .filter((layer) => layer.visible !== false)
    .map((layer) => {
      const coverage = layerCoverage(layer, dimSelections);
      return planeZ === null ? coverage : pinCoverageToPlane(coverage, layer, planeZ);
    });
}

/**
 * Is every pin met by something on screen?
 *
 * Per pin: the layers that HAVE the axis decide it, and any one of them showing
 * that index is enough — with two layers stacked, a shape pinned to what either
 * is showing is a shape you can see. An axis no layer has is not evaluable, so
 * it does not hide (see the module note).
 */
export function pinsSatisfied(
  coordinates: readonly PinnedCoordinate[] | null | undefined,
  coverages: readonly LayerCoverage[],
): boolean {
  if (!coordinates || coordinates.length === 0) return true;

  return coordinates.every((pin) => {
    const evaluable = coverages.filter((coverage) => coverage.axisNames.includes(pin.name));
    if (evaluable.length === 0) return true;
    return evaluable.some((coverage) => evaluatePin(pin.name, pin.value, coverage).met);
  });
}

/** World-µm z extent of a point cloud (the shape's vectors, already in world). */
export function zSpanOf(points: readonly (readonly number[])[]): ZSpan | null {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const z = point[2];
    if (typeof z !== "number" || !Number.isFinite(z)) continue;
    min = Math.min(min, z);
    max = Math.max(max, z);
  }
  return min === Infinity ? null : { min, max };
}

/**
 * Does a shape's z extent reach the slab the flat view is drawing?
 *
 * Half a slice of slack on each side, the tolerance `isLayerOutOfPlane` uses:
 * the plane is one slab thick, and a shape drawn ON a slice sits exactly at its
 * centre, so anything within half a step is on the slice being drawn. A shape
 * that spans z (a cube, a line through the stack) shows on every slice it
 * crosses.
 */
export function intersectsPlane(
  span: ZSpan | null,
  planeZ: number,
  slabThickness: number,
): boolean {
  if (!span) return true;
  const tolerance = Math.abs(slabThickness) / 2;
  return span.min - tolerance <= planeZ && planeZ <= span.max + tolerance;
}

/** The flat view's plane: where it is and how thick one slice is. */
export type ScenePlane = { z: number; slabThickness: number };

/**
 * The whole rule for one shape. `plane` is null in 3D (every slice is drawn) and
 * in a scene whose layers have no z axis (there is only one plane to be on).
 */
export function isAnnotationInView(
  annotation: {
    coordinates?: readonly PinnedCoordinate[] | null;
    /** The shape's vectors in WORLD µm — collection space through the layer's affine. */
    zSpan: ZSpan | null;
  },
  view: { coverages: readonly LayerCoverage[]; plane: ScenePlane | null },
): boolean {
  if (!pinsSatisfied(annotation.coordinates, view.coverages)) return false;
  if (!view.plane) return true;
  return intersectsPlane(annotation.zSpan, view.plane.z, view.plane.slabThickness);
}
