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
 * A placement may also give some axes by a FIELD — an array's values rather
 * than a matrix row (`asAffine.fields`). A field read along one axis the layer
 * does not render (a lookup: time, for an event-triggered movie) is fully
 * drawable: the world slider picks the frame (`selectionsFor`). Any other field
 * is placed but not drawable yet: along a RENDERED axis (uneven z planes) a 4×4
 * cannot space voxels unevenly, and a warp moves every voxel by its own offset,
 * which needs a shader that samples the field. Drawing either with the matrix
 * alone would put the data in the wrong place with nothing to say so.
 *
 * A COLLECTION layer (mesh, network) is also unplaceable when its store names
 * no vertex slots (`axes` in the manifest). Its components are positional, so
 * without that statement nothing says which one is x; guessing an order is how
 * a collection draws transposed with nothing to say so, so it is not drawn.
 *
 * A LEAF module on purpose: it is imported by pure-core code (`sceneFit`)
 * whose tests run without a DOM, and `layerModel` reaches the generated
 * GraphQL barrel, which touches `window` on load. Works on the raw fragment
 * and on a normalized `LayerState` alike, since the latter spreads the former.
 */
import { isLookup, type PlacementFieldLike } from "@/core/data/scene/coords/axisTime";

type PlaceableLike = {
  // `unknown`, as every host passes it: only `fields` is read, structurally.
  asAffine?: unknown | null;
  renderAxes?: { x?: string | null; y?: string | null; z?: string | null } | null;
  xAxis?: string | null;
  yAxis?: string | null;
  zAxis?: string | null;
  /** The view looks at this layer from the side (`deriveRenderAxes`). */
  edgeOn?: boolean;
  /** A mesh or network layer's collection; only its store's slot names are read. */
  collection?: { store?: { axes?: readonly string[] | null } | null } | null;
};

/** The layer's own axes it draws across the screen. */
const renderedAxes = (layer: PlaceableLike): Set<string> => {
  const names = [
    layer.renderAxes?.x,
    layer.renderAxes?.y,
    layer.renderAxes?.z,
    layer.xAxis,
    layer.yAxis,
    layer.zAxis,
  ];
  return new Set(names.filter((name): name is string => !!name));
};

/**
 * Whether the placement gives an axis by a field the scene cannot draw yet: one
 * that is not a lookup (a warp, a multi-axis field), or a lookup along an axis
 * this layer renders.
 */
export const hasUndrawableField = (layer: PlaceableLike): boolean => {
  const fields =
    (layer.asAffine as { fields?: readonly PlacementFieldLike[] | null } | null | undefined)?.fields ?? [];
  if (fields.length === 0) return false;
  const rendered = renderedAxes(layer);
  return fields.some((field) => !isLookup(field) || rendered.has(field.inputAxis));
};

/**
 * Whether the layer draws a collection whose store does not say which vertex
 * slot is which axis. Only a layer with a STORE can: an annotation collection
 * has none, and its vectors are in axis order by definition.
 */
export const hasUnnamedSlots = (layer: PlaceableLike): boolean => {
  const store = layer.collection?.store;
  return store != null && !(store.axes && store.axes.length > 0);
};

export const isPlaceable = (layer: PlaceableLike): boolean =>
  layer.asAffine != null && !hasUndrawableField(layer) && !hasUnnamedSlots(layer) && !layer.edgeOn;

/**
 * `unnamed-slots`: a collection whose store's manifest names no vertex slots.
 *
 * `edge-on`: placed, but the scene's view looks at it from the side — a 2D
 * layer in an XZ or YZ view is a line, and is not drawn until the view turns
 * back.
 */
export type UnplaceableReason = "unregistered" | "uncomposable" | "field" | "unnamed-slots" | "edge-on";

/** Why a layer is not placeable, or null when it is. */
export const unplaceableReason = (
  layer: PlaceableLike & { pathToWorld?: unknown | null },
): UnplaceableReason | null => {
  if (isPlaceable(layer)) return null;
  if (hasUnnamedSlots(layer)) return "unnamed-slots";
  if (layer.asAffine != null) return layer.edgeOn ? "edge-on" : "field";
  return layer.pathToWorld == null ? "unregistered" : "uncomposable";
};
