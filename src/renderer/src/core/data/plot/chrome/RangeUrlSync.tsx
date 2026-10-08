import { useLayoutEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useRangeStoreApi, type TimeWindow } from "../stores/rangeStore";

/**
 * Writes the committed window to a search param, one direction only.
 *
 * Reading happens once, at scope build, via the scope provider's
 * `initialRange`. After that the store is the source of truth and the URL follows
 * it — never the other way round, or a `setSearchParams` would feed back into the
 * store and loop.
 *
 * Keyed on the COMMITTED window, never the live one. `setSearchParams` is a router
 * commit; driving it from `liveRange` would put a navigation in the pointer loop.
 *
 * Subscribed in a LAYOUT effect on purpose: on unmount, layout cleanups run
 * before every passive one in the tree, so this is gone before the scope's
 * system teardown writes anything. `setSearchParams` resolves against THIS
 * route — a write that slipped through while the page was leaving would
 * `replace` the user straight back onto the experiment.
 *
 * What the param is called and how a window is written into it are the
 * caller's (`encode` returning null clears it).
 */
export const RangeUrlSync = ({
  param,
  encode,
}: {
  param: string;
  encode: (window: TimeWindow) => string | null;
}) => {
  const rangeApi = useRangeStoreApi();
  const [, setSearchParams] = useSearchParams();
  // Read at write time: a new closure must not resubscribe.
  const encodeRef = useRef(encode);
  encodeRef.current = encode;
  const paramRef = useRef(param);
  paramRef.current = param;

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
        const encoded = isWhole ? null : encodeRef.current(committedRange);
        setSearchParams(
          (params) => {
            const next = new URLSearchParams(params);
            if (encoded) next.set(paramRef.current, encoded);
            else next.delete(paramRef.current);
            return next;
          },
          { replace: true },
        );
      }),
    [rangeApi, setSearchParams],
  );

  return null;
};
