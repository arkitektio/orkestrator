import { useCallback, useEffect, useRef } from "react";
import { useLatestRef } from "./useLatestRef";

/**
 * A stable, trailing-edge debounced wrapper around `fn`. The latest `fn` is
 * always the one invoked (kept in a ref), the pending call is cancelled on
 * unmount, and the returned function keeps its identity across renders so it
 * can be handed to inputs without re-registering handlers.
 */
export const useDebouncedCallback = <A extends unknown[]>(
  fn: (...args: A) => void,
  wait = 200,
): ((...args: A) => void) => {
  const fnRef = useLatestRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, wait);
    },
    [fnRef, wait],
  );
};
