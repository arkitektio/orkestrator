import { useEffect, useRef, useState } from "react";

/**
 * An element's content-box size, tracked with a `ResizeObserver`.
 *
 * Promoted out of elektro's uPlot chart helpers, where it was the one piece with
 * no chart library in it. Both the experiment scene and the segment scene need a
 * viewport's pixel size (a time axis cannot pick tick spacing without it), and
 * so does anything else sizing a canvas to its container.
 *
 * Sizes are floored to whole pixels and the state write is skipped when neither
 * dimension changed. That guard is load-bearing, not tidiness: a `ResizeObserver`
 * fires on sub-pixel layout jitter, and returning a fresh `{width, height}`
 * object each time would re-render every consumer on frames where nothing moved.
 */
export const useElementSize = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);
      setSize((previous) =>
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : { width: nextWidth, height: nextHeight },
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};
