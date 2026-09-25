import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest `value`, updated in a layout effect
 * (never during render, which the React Compiler rules forbid).
 *
 * Use it to read a frequently changing prop or state from a stable callback
 * (a ref callback, a debounced handler, an async continuation) without
 * putting that value in the callback's dependency list.
 */
export const useLatestRef = <T,>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};
