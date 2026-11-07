import { useEffect, useState } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { LruMap } from "@/core/util/lruMap";
import { useMikro } from "@/mikro/api/funcs";
import { loadObjectsFromCollection } from "@/mikro/components/scene/features/meshDesign/commit/loadCollection";
import type { FabriksObjectEntry } from "@/mikro/components/scene/features/meshes/fabriks/fabriksCatalogs";
import type { FabriksCollection } from "@/mikro/components/scene/features/meshes/fabriks/fabriksCollection";
import {
  openFabriksCollection,
  type FabriksCollectionRef,
} from "@/mikro/components/scene/features/meshes/fabriks/fabriksSource";

/**
 * One mesh object's triangles, read off its collection's fabriks store with no
 * scene around it: what its viewer draws (a chart's Probe tab, a blok).
 *
 * The collection is opened once (`openFabriksCollection`: the manifest, then
 * the catalogs and footers on first use) and the object is extracted at its
 * finest level (`loadObjectsFromCollection`, welded). Both are kept, per
 * client: going back to a pinned point costs nothing.
 *
 * In the collection's own frame (voxels): a mesh has no voxel size in the
 * schema to scale it by, so an anisotropic z-step draws flattened.
 */

/** Above this many indices the viewer says so rather than downloading the object. */
export const PREVIEW_MAX_INDICES = 3_000_000;

export type MeshObjectGeometry = {
  positions: Float32Array;
  indices: Uint32Array;
  normals?: Float32Array;
  entry: FabriksObjectEntry;
};

export type MeshObjectRead =
  | { kind: "mesh"; geometry: MeshObjectGeometry }
  /** Too many triangles for a preview: `indexCount` of them. */
  | { kind: "too-large"; indexCount: number }
  /** The catalog has no such object. */
  | { kind: "absent" };

/** What the source needs of an opened collection (a FabriksCollection; a fake in tests). */
export type MeshCollectionLike = Pick<FabriksCollection, "loadObjectCatalog">;

export type MeshGeometrySourceDeps<C extends MeshCollectionLike> = {
  open: (ref: FabriksCollectionRef, client: MikroClient, datalayer: string) => Promise<C>;
  extract: (collection: C, objectId: number) => Promise<Omit<MeshObjectGeometry, "entry">>;
  maxIndices?: number;
};

export type MeshGeometrySource = {
  load(client: MikroClient, datalayer: string, ref: FabriksCollectionRef, objectId: number): Promise<MeshObjectRead>;
};

const OPEN_COLLECTIONS = 4;
const KEPT_OBJECTS = 16;

/** A cache that forgets a failed promise, so a transient error does not stick for the session. */
const remember = <V>(cache: LruMap<Promise<V>>, key: string, make: () => Promise<V>): Promise<V> => {
  const cached = cache.get(key);
  if (cached) return cached;
  const made = make();
  cache.set(key, made);
  made.catch(() => {
    if (cache.get(key) === made) cache.take(key);
  });
  return made;
};

export function createMeshGeometrySource<C extends MeshCollectionLike>(
  deps: MeshGeometrySourceDeps<C>,
): MeshGeometrySource {
  const perClient = new WeakMap<
    object,
    { collections: LruMap<Promise<C>>; objects: LruMap<Promise<MeshObjectRead>> }
  >();
  const cachesFor = (client: MikroClient) => {
    let caches = perClient.get(client);
    if (!caches) {
      caches = { collections: new LruMap(OPEN_COLLECTIONS), objects: new LruMap(KEPT_OBJECTS) };
      perClient.set(client, caches);
    }
    return caches;
  };
  const maxIndices = deps.maxIndices ?? PREVIEW_MAX_INDICES;

  return {
    load(client, datalayer, ref, objectId) {
      const caches = cachesFor(client);
      return remember(caches.objects, `${ref.id}:${objectId}`, async () => {
        const collection = await remember(caches.collections, `${ref.id}|${datalayer}`, () =>
          deps.open(ref, client, datalayer),
        );
        const entry = (await collection.loadObjectCatalog()).get(objectId);
        if (!entry) return { kind: "absent" };
        if (entry.indexCount > maxIndices) return { kind: "too-large", indexCount: entry.indexCount };
        const geometry = await deps.extract(collection, objectId);
        return { kind: "mesh", geometry: { ...geometry, entry } };
      });
    },
  };
}

/** The app's source: fabriks opened for real, decoded with meshoptimizer. */
export const meshGeometrySource = createMeshGeometrySource<FabriksCollection>({
  open: openFabriksCollection,
  extract: async (collection, objectId) => {
    await MeshoptDecoder.ready;
    const [loaded] = await loadObjectsFromCollection(collection, new THREE.Matrix4(), {
      objectIds: [objectId],
      decoder: MeshoptDecoder,
    });
    if (!loaded) throw new Error(`Object ${objectId} came back without geometry.`);
    return loaded.geometry;
  },
});

export type MeshObjectGeometryState =
  | { phase: "loading" }
  | { phase: "ready"; read: MeshObjectRead }
  | { phase: "error"; error: unknown }
  /** No datalayer endpoint is configured: nothing to read from. */
  | { phase: "unavailable" };

/**
 * One object's geometry, for the collection `ref` names (null while its query
 * runs). Latest wins: a new object supersedes a read still in flight.
 */
export const useMeshObjectGeometry = (
  ref: FabriksCollectionRef | null,
  objectId: number | null,
  source: MeshGeometrySource = meshGeometrySource,
): MeshObjectGeometryState => {
  const client = useMikro() as unknown as MikroClient;
  const datalayer = useDatalayerEndpoint();
  const [state, setState] = useState<MeshObjectGeometryState>({ phase: "loading" });

  useEffect(() => {
    if (!datalayer) {
      setState({ phase: "unavailable" });
      return;
    }
    if (!ref || objectId === null) {
      setState({ phase: "loading" });
      return;
    }
    let stale = false;
    setState({ phase: "loading" });
    source.load(client, datalayer, ref, objectId).then(
      (read) => {
        if (!stale) setState({ phase: "ready", read });
      },
      (error: unknown) => {
        if (!stale) setState({ phase: "error", error });
      },
    );
    return () => {
      stale = true;
    };
  }, [client, datalayer, ref, objectId, source]);

  return state;
};
