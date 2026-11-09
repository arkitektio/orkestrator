import { open, type Array as ZarrArray, type DataType, type Location } from "zarrita";
import { ZarrStore } from "./store/types";
import { prefetchShardIndex, readArrayMetadataCached } from "./runner/get-worker";

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
 *
 * Takes a store (the array at its root) or a location inside one (an array in
 * a group, e.g. a sparse layout's `indptr`). The runner keys caches and chunk
 * paths by the array's path, so sibling arrays in one store never collide.
 */
export const openZarrArray = async (
  at: ZarrStore | Location<ZarrStore>,
): Promise<OpenedZarrArray> => {
  const arr = (await open.v3(at, { kind: "array" })) as OpenedZarrArray;
  const meta = await readArrayMetadataCached(arr);
  warmSmallArrayShardIndexes(arr, meta);
  return arr;
};

/** An array of at most this many shards has all its shard indexes warmed at open. */
export const WARM_SHARD_INDEX_MAX_SHARDS = 8;

/**
 * The inner-chunk coordinates that name every shard of a SMALL sharded array
 * (one per shard), or none when the array is unsharded or larger than
 * `maxShards`.
 *
 * Small is the point: an array of a handful of shards is a pyramid's coarse
 * level, and the coarse level is what a scene draws FIRST. Its shard index
 * used to be requested only once the first plan reconciled, so the first
 * chunk read of a cold open waited a round trip behind it; asked for here,
 * that round trip overlaps the canvas, the device and the first plan. A fine
 * level has thousands of shards and is left to the plan, which knows which
 * ones the view needs.
 */
export function smallArrayShardProbes(
  shape: readonly number[],
  sharding: { shardShape: readonly number[]; indexShape: readonly number[] } | undefined,
  maxShards = WARM_SHARD_INDEX_MAX_SHARDS,
): number[][] {
  if (!sharding) return [];
  const counts = shape.map((extent, d) =>
    Math.max(1, Math.ceil(extent / Math.max(1, sharding.shardShape[d] ?? 1))),
  );
  const total = counts.reduce((product, count) => product * count, 1);
  if (total > maxShards) return [];
  const probes: number[][] = [];
  for (let linear = 0; linear < total; linear++) {
    const coords: number[] = new Array(counts.length);
    let rest = linear;
    for (let d = counts.length - 1; d >= 0; d--) {
      // The first inner chunk of shard `rest % counts[d]` along this axis.
      coords[d] = (rest % counts[d]) * (sharding.indexShape[d] ?? 1);
      rest = Math.floor(rest / counts[d]);
    }
    probes.push(coords);
  }
  return probes;
}

function warmSmallArrayShardIndexes(
  arr: OpenedZarrArray,
  meta: Awaited<ReturnType<typeof readArrayMetadataCached>>,
): void {
  // Fire-and-forget inside `prefetchShardIndex`: a failure only means the
  // real fetch pays the index round trip itself.
  for (const coords of smallArrayShardProbes(arr.shape, meta.sharding)) {
    prefetchShardIndex(arr, meta, coords);
  }
}

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
