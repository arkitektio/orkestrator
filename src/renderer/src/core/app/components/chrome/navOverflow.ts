import { useLayoutEffect, useRef, useState } from "react";

/**
 * The nav row's overflow: how many of its fixed-size buttons fit beside the
 * traffic lights (and, on Linux, the window buttons) at the rail's current
 * width, with the rest folded behind one "…" button.
 *
 * Every button is the same size, so this is arithmetic, not measurement of
 * each child: `fits` whole slots in the width, and when not all buttons fit,
 * one of those slots is the "…" itself.
 */

/** `h-6 w-6` in px. */
export const NAV_BUTTON_SIZE = 24;
/** `gap-0.5` in px. */
export const NAV_BUTTON_GAP = 2;

/**
 * How many of `count` buttons to show inline. `width` of 0 means "not
 * measured yet" (or no layout at all, as in jsdom) and shows them all rather
 * than hiding everything behind a menu nobody asked for.
 */
export const visibleNavCount = (
  width: number,
  count: number,
  size: number = NAV_BUTTON_SIZE,
  gap: number = NAV_BUTTON_GAP,
): number => {
  if (width <= 0 || count === 0) return count;
  const fits = Math.floor((width + gap) / (size + gap));
  if (fits >= count) return count;
  // One slot goes to the "…" button that holds the rest.
  return Math.max(0, fits - 1);
};

/**
 * The content width of the element the ref lands on, kept current through a
 * `ResizeObserver`. Reports 0 until the first measurement and wherever the
 * observer does not exist, which `visibleNavCount` reads as "show all".
 */
export const useMeasuredWidth = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
