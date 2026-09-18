import { open, type Array as ZarrArray, type DataType } from "zarrita";
import { ZarrStore } from "@/lib/zarr/store/types";
import { readArrayMetadataCached } from "@/lib/zarr/runner/get-worker";

export type OpenedZarrArray = ZarrArray<DataType, ZarrStore>;

/**
 * Open one configured store into a zarr Array. The single open site, so the
 * cold path and the reconcile path (`openMissingSceneArrays`) cannot drift.
 *
 * Also resolves the array's fetch metadata (zarr.json is already in the store's
 * byte cache — no extra request) so `effectiveChunkShapeOf(arr)` is answerable
 * synchronously by the time the array is registered: for a `sharding_indexed`
 * array zarrita's `arr.chunks` is the SHARD shape, and the planner must see the
 * inner chunk shape or it would fetch whole shards.
 */
export const openZarrArray = async (store: ZarrStore): Promise<OpenedZarrArray> => {
  const arr = (await open.v3(store, { kind: "array" })) as OpenedZarrArray;
  await readArrayMetadataCached(arr);
  return arr;
};

/**
 * Open every configured scene store into a zarr Array, keyed by store id.
 * Extracted from `platform/stores/viewerStore.ts` so the store just receives the opened
 * arrays.
 */
export async function openSceneArrays(
  storesById: Map<string, ZarrStore>,
): Promise<Map<string, OpenedZarrArray>> {
  // One metadata round trip per store — in parallel. A sequential `for …
  // await` here put (stores − 1) × RTT on the cold-open critical path, before
  // the `arraysOpen` stamp; `openMissingSceneArrays` already fans out.
  const opened = await Promise.all(
    [...storesById].map(async ([storeId, store]) => [storeId, await openZarrArray(store)] as const),
  );
  return new Map(opened);
}
