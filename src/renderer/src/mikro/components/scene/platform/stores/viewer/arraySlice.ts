import type { OpenedZarrArray } from "@/core/data/zarr/openArray";
/**
 * The opened-zarr-array registry. Deliberately not reactive state — see
 * `registerArrays`.
 */
export interface ArraySlice {
  getArrayForStoreId: (storeId: string) => OpenedZarrArray;
  /** Whether this store's array is already open — the reconcile's diff input. */
  hasArrayForStoreId: (storeId: string) => boolean;
  /**
   * Register arrays opened AFTER the scope was built, for layers that arrived
   * into a running scene.
   *
   * Deliberately not a `set`: the registry is not reactive state, and nothing
   * subscribes to it. The LAYER fold that follows is what wakes the trackers —
   * so callers MUST register arrays BEFORE folding the layers. Folding first
   * produces one replan that skips the new layer (`buildLevelSources` throws
   * on the missing array and the planner continues past it) with nothing left
   * to retry it.
   */
  registerArrays: (arrays: ReadonlyMap<string, OpenedZarrArray>) => void;
}

// Takes no `set`: the registry is not reactive state — see `registerArrays`.
export const createArraySlice = (
  arraysByStoreId: Map<string, OpenedZarrArray>,
): ArraySlice => ({
  getArrayForStoreId: (storeId) => {
    const array = arraysByStoreId.get(storeId);
    if (!array) {
      throw new Error(`Zarr array for store ${storeId} is not initialized`);
    }
    return array;
  },
  hasArrayForStoreId: (storeId) => arraysByStoreId.has(storeId),
  registerArrays: (arrays) => {
    for (const [storeId, array] of arrays) arraysByStoreId.set(storeId, array);
  },
});
