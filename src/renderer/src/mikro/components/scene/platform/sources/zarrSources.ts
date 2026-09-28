import {
  MikroClient,
  SceneZarrStoreDescriptor,
  ZarrStore,
} from "@/core/data/zarr/store/types";
import { ConfiguredS3Store } from "@/core/data/zarr/store/s3Store";
import { SceneFragment } from "@/mikro/api/graphql";
import { isBrickLayer } from "../model/layerGuards";
import { buildS3FetchConfig, getGeneralAccess } from "@/mikro/lib/zarr/access";
import { openZarrArray, type OpenedZarrArray } from "@/core/data/zarr/openArray";
import { coldOpenTimeline } from "../perf/coldOpenTimeline";

export { requestGeneralAccess } from "@/mikro/lib/zarr/access";

/**
 * Zarr store construction for a scene: gather the unique data-array stores the
 * scene's brick-backed layers reference, request S3 credentials, and build a
 * ready `ConfiguredS3Store` per store. Extracted out of `platform/stores/viewerStore.ts`
 * so the store no longer owns data-loading — it just consumes these.
 *
 * `isBrickLayer`, not `isImageLayer`: a LABEL mask is a Lens over an array too,
 * and this is the gate that decides whether its arrays are ever opened. Nothing
 * downstream can plan, stream or probe a layer whose stores are not collected
 * here.
 */
export function collectSceneStoreDescriptors(scene: SceneFragment): Map<string, SceneZarrStoreDescriptor> {
  const descriptors = new Map<string, SceneZarrStoreDescriptor>();

  for (const layer of scene.layers) {
    if (!isBrickLayer(layer)) continue;
    for (const dataArray of layer.lens.dataset.dataArrays) {
      descriptors.set(dataArray.store.id, {
        bucket: dataArray.store.bucket,
        key: dataArray.store.key,
        path: dataArray.store.path,
        storeId: dataArray.store.id,
      });
    }
  }

  return descriptors;
}

/**
 * One credentialed, ready store. The single construction site, so the cold
 * path and the reconcile path cannot drift on credentials or refresh config.
 */
async function buildConfiguredStore(
  descriptor: SceneZarrStoreDescriptor,
  initial: Awaited<ReturnType<typeof getGeneralAccess>>,
  client: MikroClient,
  datalayer: string,
): Promise<ZarrStore> {
  const store = new ConfiguredS3Store(buildS3FetchConfig(initial, descriptor, datalayer), {
    preloadMetadata: true,
    // Scenes outlive their credentials — a viewer left open streams bricks
    // for hours. Re-credentialing goes through the shared provider, so all
    // of a scene's stores rotate on ONE mutation.
    refreshConfig: async (options) =>
      buildS3FetchConfig(await getGeneralAccess(client, options), descriptor, datalayer),
  });
  await store.ready();
  return store;
}

export async function createConfiguredSceneStores(
  scene: SceneFragment,
  client: MikroClient,
  datalayer: string,
): Promise<Map<string, ZarrStore>> {
  const descriptors = collectSceneStoreDescriptors(scene);
  const initial = await getGeneralAccess(client);
  coldOpenTimeline.stamp("credentials");

  const stores = await Promise.all(
    Array.from(descriptors.values()).map(
      async (descriptor) =>
        [
          descriptor.storeId,
          await buildConfiguredStore(descriptor, initial, client, datalayer),
        ] as const,
    ),
  );
  coldOpenTimeline.stamp("storeMetadata");

  return new Map(stores);
}

/**
 * Open zarr arrays for data-array stores the scene references but the viewer
 * has not opened yet — the reconcile path, when a layer arrives into a running
 * scene.
 *
 * PARTIAL-TOLERANT by contract. One failing store must never withhold the
 * others, and must never withhold the LAYER fold that follows: the
 * `AnnotationLayer` this whole path exists for needs no zarr at all, and an
 * unrelated image store's failure must not hide it. A layer whose store failed
 * is simply skipped by the planner's `buildLevelSources` (which catches and
 * continues) and produces no plan — the same state a merely slow store
 * already produces.
 *
 * The nothing-missing early return is load-bearing: it keeps the common
 * reconcile (an annotation layer, no new arrays) down to one Map build with
 * zero network calls.
 */
export async function openMissingSceneArrays(args: {
  scene: SceneFragment;
  client: MikroClient;
  datalayer: string;
  isOpen: (storeId: string) => boolean;
}): Promise<{ arrays: Map<string, OpenedZarrArray>; failedStoreIds: string[] }> {
  const { scene, client, datalayer, isOpen } = args;
  const missing = Array.from(collectSceneStoreDescriptors(scene).values()).filter(
    (descriptor) => !isOpen(descriptor.storeId),
  );

  const arrays = new Map<string, OpenedZarrArray>();
  if (missing.length === 0) return { arrays, failedStoreIds: [] };

  const initial = await getGeneralAccess(client);
  const results = await Promise.allSettled(
    missing.map(async (descriptor) =>
      openZarrArray(await buildConfiguredStore(descriptor, initial, client, datalayer)),
    ),
  );

  const failedStoreIds: string[] = [];
  results.forEach((result, index) => {
    const storeId = missing[index].storeId;
    if (result.status === "fulfilled") arrays.set(storeId, result.value);
    else failedStoreIds.push(storeId);
  });

  return { arrays, failedStoreIds };
}
