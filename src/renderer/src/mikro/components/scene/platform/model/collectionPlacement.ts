import * as THREE from "three";
import { SceneLayerFragment } from "@/mikro/api/graphql";
import {
  placementToSpatialAffine,
} from "@/core/data/scene/coords/transformGraph";
import { worldViewTriple } from "@/core/data/scene/coords/viewAxes";
import type { SceneTransformContext } from "./layerModel";
import { affineToMatrix4 } from "../coords/worldTransform";

/**
 * A COLLECTION's placement — a fabriks mesh collection or a konnektion network
 * collection: the server's `asAffine` (its `pathToWorld` composed) reduced to
 * the spatial 4×4, and NOTHING else (COORDINATE_SYSTEMS.md, "Coordinate
 * conventions"). The client never walks the path into a matrix.
 *
 * One module for both because there is one rule, not two. The formats differ in
 * what they store; they agree exactly on how a collection is placed, and on the
 * slot↔axis convention that makes the components mean anything.
 *
 * A mesh or a graph is continuous data IN its coordinate system, so the graph
 * is the complete CS→world story: coordinate c renders at exactly
 * `pathToWorld(c)`.
 * No anchoring to another layer's frame, no shape-derived recentering, no
 * client-injected flips — any origin or raster convention is the server's to
 * express as transform edges (or the writer's, in the vertices themselves).
 * This is the same rule `features/annotations/annotationBounds.ts` applies to annotations;
 * images differ only in owning an additional index→local map.
 *
 * Pure and React-free so placement is unit-testable without R3F or Apollo.
 */

export type MeshLayerVariant = Extract<SceneLayerFragment, { __typename: "MeshLayer" }>;
export type MeshCollectionRef = NonNullable<MeshLayerVariant["collection"]>;

export type NetworkLayerVariant = Extract<SceneLayerFragment, { __typename: "NetworkLayer" }>;
export type NetworkCollectionRef = NonNullable<NetworkLayerVariant["collection"]>;

/**
 * What placement needs of a layer and of a collection — no more.
 *
 * Structural rather than a union of the two variants, so this module never has
 * to grow an arm when a third collection format appears. All it reads is the
 * path to world, the collection's coordinate system, and the store's axis
 * declaration.
 */
type PlaceableLayer = {
  // Typed as what `placementToSpatialAffine` actually consumes rather than as
  // one variant's `asAffine`: the per-typename fragment types are structurally
  // identical here but nominally distinct, so naming one of them would reject
  // the other for no reason.
  asAffine?: {
    matrix: readonly (readonly number[])[];
    inputAxes: readonly string[];
    outputAxes: readonly string[];
  } | null;
};
type PlaceableCollection = {
  id: string;
  coordinateSystem: MeshCollectionRef["coordinateSystem"];
  store: { id: string; axes?: readonly string[] | null };
};

/**
 * Does this scene render any mesh at all?
 *
 * Reads the FRAGMENT, not the scene store, so a page can decide whether to
 * mount the Meshes sidebar tab from outside `SceneProvider` — where the tab
 * JSX is built and no scoped store hook can be called.
 */
export const sceneHasMeshLayer = (
  scene: { layers: readonly SceneLayerFragment[] } | null | undefined,
): boolean =>
  (scene?.layers ?? []).some(
    (layer) => layer.__typename === "MeshLayer" && !!layer.collection,
  );

/**
 * The collection's axis names in VERTEX COMPONENT order, or null if unstated.
 *
 * fabriks addresses components by position — `cellSize[0]`, `bbox_*_x` — and
 * says nothing about which physical axis a slot is, so a collection cut from
 * (z, y, x) data is entirely consistent and would render transposed if the
 * renderer assumed otherwise. This is the store telling us the mapping, and it
 * is the only trustworthy source for it.
 */
export const collectionAxisOrder = (node: {
  axes?: readonly string[] | null;
}): string[] | null => (node.axes && node.axes.length > 0 ? [...node.axes] : null);

/**
 * The collection's axis names in VERTEX-COMPONENT (slot 0, 1, 2) order, or
 * null when its store names none — the one place the slot↔axis convention
 * lives (used by placement AND by the attribute tracker turning a mesh probe's
 * voxelIndex into named coordinates).
 *
 * There is no fallback. The store's manifest is the only statement of which
 * slot is which axis; inferring one from the coordinate system is a guess, and
 * a wrong guess draws transposed with nothing to say so. A collection without
 * it is not drawn (`placeable.ts` `hasUnnamedSlots`), and the server refuses to
 * register a new one.
 */
export const collectionSpatialAxes = (
  collection: Pick<PlaceableCollection, "store">,
): readonly string[] | null => collectionAxisOrder(collection.store);

/** Placement warnings fire once per collection, not once per recompute — the
 * caller's matrix memo re-runs on unrelated store identity churn. */
const warnedCollections = new Set<string>();

export function resolveCollectionMatrix(
  layer: PlaceableLayer,
  collection: PlaceableCollection,
  transformContext: SceneTransformContext,
): THREE.Matrix4 {
  // Components are slots: slot 0 is the vertex's first component, which is the
  // matrix's x. Only the store's manifest says which axis each slot is; fabriks
  // itself addresses components by position.
  const spatial = collectionSpatialAxes(collection);

  const firstResolve = !warnedCollections.has(collection.id);
  if (firstResolve) warnedCollections.add(collection.id);
  if (!spatial) {
    // Never drawn (`hasUnnamedSlots`); panels that still ask for a matrix get
    // the collection's own space, never a guessed order.
    if (firstResolve) {
      console.warn(
        `[collection] store ${collection.store.id} names no vertex slots in its manifest; ` +
          `not drawn — rebuild it with build_collection(..., axes=[...]).`,
      );
    }
    return new THREE.Matrix4().identity();
  }

  if (!layer.asAffine) {
    // UNREGISTERED, or a path the server could not condense. The renderer
    // does not dispatch such a layer at all (`isPlaceable`); panels that
    // still ask for a matrix (navigation, mesh design) get the collection's
    // own space, never a guess.
    if (firstResolve) {
      console.warn(
        `[collection] ${collection.id}: no placement (asAffine is null); ` +
          `not drawn — using the collection's own space where a matrix is required`,
      );
    }
    return new THREE.Matrix4().identity();
  }
  // Input side: the collection's own axis names in vertex-component order.
  // Output side: the WORLD's names — a collection's axes need not be named
  // like the world's, and reducing with the same triple on both sides
  // indexOf's to -1 and silently drops the placement.
  const composed = placementToSpatialAffine(
    layer.asAffine,
    spatial,
    worldViewTriple(transformContext),
  );
  return composed ? affineToMatrix4(composed) : new THREE.Matrix4().identity();
}
