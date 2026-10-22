import {
  AxisType,
  CreatableTransformKind,
  PartKind,
  MeshShading,
  CreateMeshCollectionDocument,
  CreateMeshLayerDocument,
  DerivationSourceKind,
  ValueRelation,
  type CreateMeshCollectionMutation,
  type CreateMeshLayerMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { lensRegistry } from "@/mikro/lib/lenses/lensRegistry";
import { uploadFabriksPrefix, type FabriksUploadProgress } from "../../meshes/fabriks/writer/fabriksUpload";
import type { DesignMesh, DesignOrigin, DesignStatus } from "../store/meshDesignStore";
import { designDispatcher } from "../worker/designDispatcher";
import type { DesignBakeMesh } from "./bakeDesign";

/**
 * Commit a design session: bake → upload → register → add a layer.
 *
 * ## Where the collection lands
 *
 * Designed meshes are in scene WORLD coordinates with THREE's (x, y, z) as
 * their components. The bake (`bakeDesign.ts`, in the design worker — it is
 * seconds of clipping and encoding) translates them into a non-negative
 * voxel frame; this module records that translation as the collection's
 * placement so it renders exactly where it was designed:
 *
 *  - The collection's coordinate system copies the world's SPACE axes in the
 *    world's own order. `collectionSpatialAxes` reads slots back to front —
 *    the LAST axis is vertex component 0 — which is the same convention the
 *    annotation collection (registered into the world by identity, vectors
 *    read as THREE xyz) already relies on. So slot 0 ↔ last world axis ↔
 *    THREE x, consistently with everything else in the scene.
 *  - `derivedFrom` carries ONE mappable edge from the collection's space
 *    into the world (`world = voxel + offset`): a BY_DIMENSION naming the
 *    space axes on both sides, with the per-axis offsets in the axes'
 *    declared order (`placementTransform`).
 *  - An edit-and-commit adds a second, lineage-only edge to the collection
 *    it was loaded from.
 *
 * `provenanceMetadata` flags the collection for the server-side job that
 * builds a real LOD pyramid later (`lod: "none"`, `needsConsolidation`).
 */

/** The scene fragment's world system — `axes` may be missing on a bare id. */
export type WorldSystemLike = {
  id: string;
  axes?: readonly { name: string; type?: string | null; order?: number | null }[] | null;
};

export type CommitProgress =
  | { status: DesignStatus; message: string | null }
  | { status: "uploading"; message: string | null; upload: FabriksUploadProgress };

export type CommitResult = { collectionId: string; layerId: string; label: string };

const worldSpaceAxes = (world: WorldSystemLike): string[] => {
  const axes = world.axes ?? [];
  const ordered = axes.some((axis) => axis.order != null)
    ? [...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [...axes];
  return ordered.filter((axis) => axis.type === AxisType.Space).map((axis) => axis.name);
};

/** The per-axis translation in the axes' declared order (last axis = slot 0). */
export const translationForAxes = (axisNames: readonly string[], offset: readonly [number, number, number]): number[] =>
  axisNames.map((_, i) => offset[axisNames.length - 1 - i] ?? 0);

/**
 * The edge that places the collection in the world: the bake's translation,
 * over the world's SPACE axes.
 *
 * BY_DIMENSION, not TRANSLATION. A TRANSLATION carries one number per input
 * axis and nothing else — the server refuses it with axis names attached
 * ("does not read `inputAxes`"), and without them it is square, so it cannot
 * reach a world that also has a time or a channel axis. A BY_DIMENSION names
 * the axes it acts on and leaves the rest of the world untouched, which is
 * exactly what placing a three-axis collection means.
 */
export const placementTransform = (axisNames: readonly string[], offset: readonly [number, number, number]) => ({
  kind: CreatableTransformKind.ByDimension,
  parts: [
    {
      kind: PartKind.Translation,
      translation: translationForAxes(axisNames, offset),
      inputAxes: [...axisNames],
      outputAxes: [...axisNames],
    },
  ],
});

export const toBakeMeshes = (meshes: readonly DesignMesh[]): DesignBakeMesh[] =>
  meshes.map((mesh) => ({ objectId: mesh.objectId, positions: mesh.current.positions, indices: mesh.current.indices }));

export async function commitMeshDesign(opts: {
  client: MikroClient;
  datalayer: string;
  sceneId: string;
  world: WorldSystemLike;
  meshes: readonly DesignMesh[];
  origin: DesignOrigin | null;
  /** What to call the collection. Optional: unnamed, it is labelled by its store's key. */
  name?: string;
  onProgress?: (progress: CommitProgress) => void;
  signal?: AbortSignal;
}): Promise<CommitResult> {
  const { client, datalayer, sceneId, world, meshes, origin, onProgress } = opts;
  if (meshes.length === 0) throw new Error("Nothing to commit — the design holds no meshes.");
  const axisNames = worldSpaceAxes(world);
  if (axisNames.length !== 3) {
    throw new Error(`The scene's world declares ${axisNames.length} spatial axes; a mesh collection needs three.`);
  }

  onProgress?.({ status: "baking", message: "Baking the collection…" });
  const bake = await designDispatcher().bake(toBakeMeshes(meshes));
  if (opts.signal?.aborted) throw new Error("Commit cancelled");

  onProgress?.({ status: "uploading", message: "Uploading…", upload: { done: 0, total: bake.files.size, bytesDone: 0, bytesTotal: bake.totalBytes } });
  const storeId = await uploadFabriksPrefix(client, datalayer, bake.files, {
    signal: opts.signal,
    onProgress: (upload) => onProgress?.({ status: "uploading", message: "Uploading…", upload }),
  });

  onProgress?.({ status: "committing", message: "Registering the collection…" });
  const created = (await client.mutate({
    mutation: CreateMeshCollectionDocument,
    variables: {
      input: {
        axes: axisNames.map((name) => ({ name, type: AxisType.Space })),
        store: storeId,
        name: opts.name?.trim() || undefined,
        derivedFrom: [
          {
            kind: DerivationSourceKind.CoordinateSystem,
            coordinateSystem: world.id,
            transform: placementTransform(axisNames, bake.offset),
            valueRelation: ValueRelation.Identical,
          },
          ...(origin
            ? [
                {
                  kind: DerivationSourceKind.MeshCollection,
                  meshCollection: origin.collectionId,
                  valueRelation: ValueRelation.Identical,
                },
              ]
            : []),
        ],
        provenanceMetadata: {
          producer: "orkestrator-design",
          lod: "none",
          needsConsolidation: true,
          levels: 1,
          cellSize: bake.cellSize,
          cells: bake.cells,
          quantizationVoxels: bake.quantizationVoxels,
          objects: meshes.map((mesh) => ({ objectId: mesh.objectId, name: mesh.name, source: mesh.source, simplifyRatio: mesh.simplifyRatio })),
          ...(origin ? { editedFrom: origin } : {}),
        },
      },
    },
  })) as { data?: CreateMeshCollectionMutation };
  const collection = created.data?.createMeshCollection;
  if (!collection) throw new Error("The server did not register the mesh collection.");

  onProgress?.({ status: "committing", message: "Adding the layer to the scene…" });
  // A layer draws a LENS: the new collection's whole one, which the create
  // answers with and the registry finds if it did not.
  const lens =
    collection.fullLens?.id ??
    (await lensRegistry(client).ensureWholeLens({ meshCollection: collection.id }));
  const layer = (await client.mutate({
    mutation: CreateMeshLayerDocument,
    // SMOOTH: designed surfaces are polished, welded meshes — and single-cell
    // collections shade smooth without seams. The card can still flip to flat.
    variables: { input: { scene: sceneId, lens, shading: MeshShading.Smooth } },
    // The same refetch `AddLayerForm` uses: the scene store reconciles the
    // new MeshLayer and `FabriksCollectionLayer` streams it in. (`MikroClient`
    // narrows Apollo's options type; the refetch is Apollo's own.)
    refetchQueries: ["GetScene"],
  } as unknown as Parameters<MikroClient["mutate"]>[0])) as { data?: CreateMeshLayerMutation };
  const layerId = layer.data?.createMeshLayer?.id;
  if (!layerId) throw new Error("The collection was registered but the scene refused a layer for it.");

  return { collectionId: collection.id, layerId, label: collection.label };
}
