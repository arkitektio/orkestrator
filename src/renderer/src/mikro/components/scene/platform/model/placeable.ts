/**
 * Can this layer be placed in the scene's world at all?
 *
 * The server's `asAffine` is the ONLY placement authority — the client never
 * composes `pathToWorld` into a matrix (COORDINATE_SYSTEMS.md §1 R1). It is
 * null for an unregistered layer (no path) and for a path the server cannot
 * condense to one affine (a FIELD step without a closed form, a singular
 * inverse — the scene query's `errorPolicy: "all"` nulls that one field
 * instead of dropping the scene). Either way the layer has no world position:
 * `LayerRenderer` does not dispatch it, `sceneFit` skips it, and the layer
 * panel says why (`unplaceableReason`).
 *
 * A LEAF module on purpose: it is imported by pure-core code (`sceneFit`)
 * whose tests run without a DOM, and `layerModel` reaches the generated
 * GraphQL barrel, which touches `window` on load. Works on the raw fragment
 * and on a normalized `LayerState` alike, since the latter spreads the former.
 */
export const isPlaceable = (layer: { asAffine?: unknown | null }): boolean =>
  layer.asAffine != null;

export type UnplaceableReason = "unregistered" | "uncomposable";

/** Why a layer is not placeable, or null when it is. */
export const unplaceableReason = (layer: {
  asAffine?: unknown | null;
  pathToWorld?: unknown | null;
}): UnplaceableReason | null => {
  if (isPlaceable(layer)) return null;
  return layer.pathToWorld == null ? "unregistered" : "uncomposable";
};
