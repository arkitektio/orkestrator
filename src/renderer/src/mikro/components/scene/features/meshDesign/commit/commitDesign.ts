import {
  AxisType,
  CreatableTransformKind,
  MeshShading,
  CreateMeshCollectionDocument,
  CreateMeshLayerDocument,
  DerivationSourceKind,
  ValueRelation,
  type CreateMeshCollectionMutation,
  type CreateMeshLayerMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/lib/zarr/store/types";
import { buildFabriksPrefix } from "../../meshes/fabriks/writer/fabriksPrefix";
import type { BakeMesh } from "../../meshes/fabriks/writer/fabriksBake";
import { uploadFabriksPrefix, type FabriksUploadProgress } from "../../meshes/fabriks/writer/fabriksUpload";
import type { DesignMesh, DesignOrigin, DesignStatus } from "../store/meshDesignStore";

/**
 * Commit a design session: bake → upload → register → add a layer.
 *
 * ## Where the collection lands
 *
 * Designed meshes are in scene WORLD coordinates with THREE's (x, y, z) as
 * their components. The bake translates them into a non-negative voxel
 * frame; this module records that translation as the collection's placement
 * so it renders exactly where it was designed:
 *
 *  - The collection's coordinate system copies the world's SPACE axes in the
 *    world's own order. `collectionSpatialAxes` reads slots back to front —
 *    the LAST axis is vertex component 0 — which is the same convention the
 *    annotation collection (registered into the world by identity, vectors
 *    read as THREE xyz) already relies on. So slot 0 ↔ last world axis ↔
 *    THREE x, consistently with everything else in the scene.
 *  - `derivedFrom` carries ONE mappable edge, a TRANSLATION from the
 *    collection's space into the world (`world = voxel + offset`), with the
 *    per-axis offsets in the axes' declared order.
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

export type CommitResult = { collectionId: string; layerId: string; version: string };

/** Above this quantization step (voxels) a single cell is too coarse to be worth the seamless normals. */
export const SINGLE_CELL_MAX_QUANTIZATION = 0.05;

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

export const toBakeMeshes = (meshes: readonly DesignMesh[]): BakeMesh[] =>
  meshes.map((mesh) => ({ objectId: mesh.objectId, positions: mesh.current.positions, indices: mesh.current.indices }));

export async function commitMeshDesign(opts: {
  client: MikroClient;
  datalayer: string;
  sceneId: string;
  world: WorldSystemLike;
  meshes: readonly DesignMesh[];
  origin: DesignOrigin | null;
  version?: string;
  onProgress?: (progress: CommitProgress) => void;
  signal?: AbortSignal;
}): Promise<CommitResult> {
  const { client, datalayer, sceneId, world, meshes, origin, onProgress } = opts;
  if (meshes.length === 0) throw new Error("Nothing to commit — the design holds no meshes.");
  const axisNames = worldSpaceAxes(world);
  if (axisNames.length !== 3) {
    throw new Error(`The scene's world declares ${axisNames.length} spatial axes; a mesh collection needs three.`);
  }
  const version = opts.version ?? new Date().toISOString();

  onProgress?.({ status: "baking", message: "Baking the collection…" });
  // One cell when the uint16 quantization stays below 0.05 voxel (extents up
  // to ~3,000 voxels): objects then never straddle a cell border, so the
  // reader's per-cell smooth normals are seamless. Larger designs fall back
  // to the culling-friendly auto grid.
  const bakeMeshes = toBakeMeshes(meshes);
  let prefix = buildFabriksPrefix(bakeMeshes, { cells: "single" });
  const cellMode = prefix.baked.quantizationVoxels <= SINGLE_CELL_MAX_QUANTIZATION ? "single" : "auto";
  if (cellMode === "auto") prefix = buildFabriksPrefix(bakeMeshes);

  onProgress?.({ status: "uploading", message: "Uploading…", upload: { done: 0, total: prefix.files.size, bytesDone: 0, bytesTotal: prefix.totalBytes } });
  const storeId = await uploadFabriksPrefix(client, datalayer, prefix.files, {
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
        version,
        derivedFrom: [
          {
            kind: DerivationSourceKind.CoordinateSystem,
            coordinateSystem: world.id,
            transform: {
              kind: CreatableTransformKind.Translation,
              translation: translationForAxes(axisNames, prefix.baked.offset),
              inputAxes: axisNames,
              outputAxes: axisNames,
            },
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
          cellSize: prefix.baked.grid.cellSize,
          cells: cellMode,
          quantizationVoxels: prefix.baked.quantizationVoxels,
          objects: meshes.map((mesh) => ({ objectId: mesh.objectId, name: mesh.name, source: mesh.source, simplifyRatio: mesh.simplifyRatio })),
          ...(origin ? { editedFrom: origin } : {}),
        },
      },
    },
  })) as { data?: CreateMeshCollectionMutation };
  const collection = created.data?.createMeshCollection;
  if (!collection) throw new Error("The server did not register the mesh collection.");

  onProgress?.({ status: "committing", message: "Adding the layer to the scene…" });
  const layer = (await client.mutate({
    mutation: CreateMeshLayerDocument,
    // SMOOTH: designed surfaces are polished, welded meshes — and single-cell
    // collections shade smooth without seams. The card can still flip to flat.
    variables: { input: { scene: sceneId, meshCollection: collection.id, shading: MeshShading.Smooth } },
    // The same refetch `AddLayerForm` uses: the scene store reconciles the
    // new MeshLayer and `FabriksCollectionLayer` streams it in. (`MikroClient`
    // narrows Apollo's options type; the refetch is Apollo's own.)
    refetchQueries: ["GetScene"],
  } as unknown as Parameters<MikroClient["mutate"]>[0])) as { data?: CreateMeshLayerMutation };
  const layerId = layer.data?.createMeshLayer?.id;
  if (!layerId) throw new Error("The collection was registered but the scene refused a layer for it.");

  return { collectionId: collection.id, layerId, version };
}
