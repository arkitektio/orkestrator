import { useCallback } from "react";
import { ZarrStoreFragment } from "../api/graphql";
import {
  AxisSelection,
  selectionForAxes,
} from "../components/experiment/platform/sources/axisSelection";
import {
  ArrayWindow,
  useElektroZarrStoreApi,
} from "../components/store/zarrStore";

export type { ArrayWindow } from "../components/store/zarrStore";
export type {
  AxisRange,
  AxisSelection,
} from "../components/experiment/platform/sources/axisSelection";
export { selectionForAxes } from "../components/experiment/platform/sources/axisSelection";

/**
 * Reading sample data out of an array dataset.
 *
 * Two things changed from the version this replaces, and they are independent:
 *
 *  - **Selection is by axis NAME.** The old reader took a `DetailTraceFragment`
 *    and built a single positional slice, which was safe only because a `Trace`
 *    was always 1-D. Samples now live in an `ArrayDataset` with named axes, and a
 *    multi-channel signal is one 2-D dataset. `(channel, time)` and
 *    `(time, channel)` are both legal orders, so a positional read of the wrong
 *    one returns plausible numbers rather than an error.
 *  - **Reads go through the shared zarr v3 worker runner**, not zarrita's
 *    main-thread `get()`. That matters for sharded arrays — the chunk you fetch is
 *    a shard, and the runner is what unwraps the shard index, caches it and
 *    coalesces the ranged reads — and it keeps fetch and decode off the thread
 *    that is servicing the zoom gesture.
 */
export const useTraceArray = () => {
  const api = useElektroZarrStoreApi();

  /**
   * Read a window out of one data array.
   *
   * `axisNames` comes from the array's dataset — or from its lens, which never
   * drops or reorders an axis — so it is always the order the store has.
   */
  const readArray = useCallback(
    (
      store: ZarrStoreFragment,
      axisNames: readonly string[],
      selection: AxisSelection = {},
      signal?: AbortSignal,
    ): Promise<ArrayWindow> =>
      api
        .getState()
        .readWindow(store, selectionForAxes(axisNames, selection), { signal }),
    [api],
  );

  /**
   * The samples of a ONE-axis window, as a plain array.
   *
   * Deliberately refuses a multi-axis window: flattening a `(channel, time)` read
   * into "the samples" is how a channel boundary turns into a segment leaping
   * across the plot. Multi-channel callers use `readArray` and stride `shape`
   * themselves.
   */
  const readSamples = useCallback(
    async (
      store: ZarrStoreFragment,
      axisNames: readonly string[],
      selection: AxisSelection = {},
      signal?: AbortSignal,
    ): Promise<ArrayLike<number>> => {
      const window = await readArray(store, axisNames, selection, signal);
      if (window.shape.length > 1) {
        throw new Error(
          `readSamples expects a single-axis window, got shape [${window.shape.join(", ")}] — ` +
            `use readArray and walk the runs per axis`,
        );
      }
      return window.data;
    },
    [readArray],
  );

  return { readArray, readSamples };
};
