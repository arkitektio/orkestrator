import * as THREE from "three";
import { SceneLayerFragment } from "@/mikro-next/api/graphql";
import {
  placementToSpatialAffine,
  spatialAxisTriple,
} from "@/mikro-next/lib/coords/transformGraph";
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
 * The collection's spatial axis names in VERTEX-COMPONENT (x, y, z slot)
 * order — the one place the slot↔axis convention lives (used by placement
 * AND by the attribute tracker turning a mesh probe's voxelIndex into named
 * coordinates).
 */
export const collectionSpatialAxes = (
  collection: PlaceableCollection,
): [string | undefined, string | undefined, string | undefined] => {
  const names = (collection.coordinateSystem.axes ?? []).map((axis) => axis.name);
  const declared = collectionAxisOrder(collection.store);
  return declared
    ? [declared[0], declared[1], declared[2]]
    : [names[names.length - 1], names[names.length - 2], names[names.length - 3]];
};

/** Placement warnings fire once per collection, not once per recompute — the
 * caller's matrix memo re-runs on unrelated store identity churn. */
const warnedCollections = new Set<string>();

export function resolveCollectionMatrix(
  layer: PlaceableLayer,
  collection: PlaceableCollection,
  transformContext: SceneTransformContext,
): THREE.Matrix4 {
  const names = (collection.coordinateSystem.axes ?? []).map((axis) => axis.name);
  // Components are slots: slot 0 is the vertex's first component, which is the
  // matrix's x. The store names them in that order when it can; fabriks itself
  // addresses components by position and says nothing about physical axes, so
  // the store's declaration is the only trustworthy source for the mapping.
  const declared = collectionAxisOrder(collection.store);
  const spatial = declared
    ? [declared[0], declared[1], declared[2]]
    : [names[names.length - 1], names[names.length - 2], names[names.length - 3]];

  const firstResolve = !warnedCollections.has(collection.id);
  if (firstResolve) warnedCollections.add(collection.id);
  if (!declared && firstResolve) {
    console.warn(
      `[collection] store ${collection.store.id} declares no axis order; assuming the coordinate ` +
        `system's last three axes map to vertex components 0, 1, 2. A collection written in a ` +
        `different component order will render transposed.`,
    );
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
    spatialAxisTriple(transformContext.worldCoordinateSystem),
  );
  return composed ? affineToMatrix4(composed) : new THREE.Matrix4().identity();
}
