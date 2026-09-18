import { useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { encodeBrushRange } from "../platform/coords/brushRange";
import { useRangeStoreApi } from "../platform/stores/rangeStore";

/**
 * Writes the committed window to `?brush=start:end`, one direction only.
 *
 * Reading happens once, at scope build, via `ExperimentSceneProvider`'s
 * `initialRange`. After that the store is the source of truth and the URL follows
 * it — never the other way round, or a `setSearchParams` would feed back into the
 * store and loop.
 *
 * Keyed on the COMMITTED window, never the live one. `setSearchParams` is a router
 * commit; driving it from `liveRange` would put a navigation in the pointer loop.
 *
 * Subscribed in a LAYOUT effect on purpose: on unmount, layout cleanups run
 * before every passive one in the tree, so this is gone before the experiment
 * system's teardown writes anything. `setSearchParams` resolves against THIS
 * route — a write that slipped through while the page was leaving would
 * `replace` the user straight back onto the experiment.
 *
 * The numbers are integer milliseconds of world time (see `brushRange.ts` for why
 * the old sample-index meaning could not survive).
 */
export const TimeRangeUrlSync = () => {
  const rangeApi = useRangeStoreApi();
  const [, setSearchParams] = useSearchParams();

  useLayoutEffect(
    () =>
      rangeApi.subscribe((state, previous) => {
        if (state.committedRange === previous.committedRange) return;
        const { committedRange, worldSpan } = state;
        // The whole world is the default view: keep the URL clean for it.
        const isWhole =
          worldSpan != null &&
          committedRange.start <= worldSpan.start &&
          committedRange.end >= worldSpan.end;
        const encoded = isWhole
          ? null
          : encodeBrushRange({
              left: Math.floor(committedRange.start),
              right: Math.ceil(committedRange.end),
            });
        setSearchParams(
          (params) => {
            const next = new URLSearchParams(params);
            if (encoded) next.set("brush", encoded);
            else next.delete("brush");
            return next;
          },
          { replace: true },
        );
      }),
    [rangeApi, setSearchParams],
  );

  return null;
};
