import type { SceneTransformContext } from "@/core/data/scene/coords/transformGraph";
import { deriveRenderAxes, worldViewTriple, type ViewAxes } from "@/core/data/scene/coords/viewAxes";
import type { SceneLayerFragment as RawSceneLayerFragment } from "@/mikro/api/graphql";
import type { SceneLayerFragment } from "./layerGuards";

const isArrayLensLayer = (
  layer: RawSceneLayerFragment,
): layer is Extract<RawSceneLayerFragment, { lens: { __typename?: "ArrayLens" } }> =>
  "lens" in layer && layer.lens?.__typename === "ArrayLens";

const isTableLayer = (
  layer: RawSceneLayerFragment,
): layer is Extract<RawSceneLayerFragment, { __typename?: "PointLayer" | "TrackLayer" }> =>
  layer.__typename === "PointLayer" || layer.__typename === "TrackLayer";

/**
 * A layer as the scene store holds it: an array-lens layer gains the axes the
 * renderer draws it by (`deriveRenderAxes`), read off its placement under the
 * scene's view, and a point or track layer the columns that face the screen.
 * Every other kind passes through untouched. The one ingest
 * step for those axes — the store runs it on load, on every layer-set fold
 * and when the view changes.
 */
export const viewLayer = <L extends RawSceneLayerFragment>(
  layer: L,
  scene: SceneTransformContext,
): L & SceneLayerFragment => {
  if (isTableLayer(layer)) {
    // A table's coordinate system has one axis per coordinate column, named
    // for it and typed; the placement is stated over those axes. So the
    // columns facing the screen are found exactly as an array's axes are.
    const space = layer.tableDataset?.coordinateSystem?.axes ?? [];
    const { axes, edgeOn } = deriveRenderAxes({
      lensAxes: space,
      axisNames: space.map((axis) => axis.name),
      placement: layer.asAffine,
      screen: worldViewTriple(scene),
      view: scene.viewAxes as ViewAxes | null | undefined,
    });
    // An INDEX-only measurement table has no spatial column: nothing to draw,
    // whatever the convention would guess.
    const spatial = space.some((axis) => axis.type === "SPACE");
    return {
      ...layer,
      xColumn: spatial ? axes.x || null : null,
      yColumn: spatial ? axes.y || null : null,
      zColumn: spatial ? axes.z : null,
      tColumn: axes.t,
      edgeOn,
    } as L & SceneLayerFragment;
  }
  if (!isArrayLensLayer(layer)) return layer as L & SceneLayerFragment;
  const { axes, edgeOn } = deriveRenderAxes({
    lensAxes: layer.lens.coordinateSystem?.axes,
    axisNames: layer.lens.axisNames,
    placement: layer.asAffine,
    screen: worldViewTriple(scene),
    view: scene.viewAxes as ViewAxes | null | undefined,
  });
  return { ...layer, renderAxes: axes, edgeOn } as L & SceneLayerFragment;
};
