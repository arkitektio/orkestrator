import { useCallback, useEffect } from "react";

import { useViewerStore } from "../../platform/stores/viewerStore";

/** How long "why nothing happened" stays up. */
const NOTICE_MS = 1800;

/**
 * "Still loading here", at the pointer, when a click landed on data that is
 * not loaded yet.
 *
 * The probe answers from resident bricks only, so in 3D a click on a region
 * still streaming in has nothing to place a vertex on, start a stroke from or
 * read a value at. It used to do nothing and say nothing, which reads as a
 * click that was not registered. A chip rather than a toast: it is routine
 * state, and it belongs where the click was.
 */
export const LoadingClickChip = () => {
  const click = useViewerStore((s) => s.loadingClick);
  const clear = useViewerStore((s) => s.clearLoadingClick);
  useEffect(() => {
    if (!click) return;
    const timer = setTimeout(clear, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [click, clear]);

  // The click is in client px; the chip is placed in its own positioned
  // parent (the viewport), so it follows the canvas wherever the page put it.
  // Placed as the element attaches (a ref callback, re-run per click) rather
  // than in a layout effect: this is DOM chrome outside the canvas, so there
  // is no frame to ask for (`useDrawEffect` is for drawn objects).
  const place = useCallback(
    (el: HTMLDivElement | null) => {
      const parent = el?.offsetParent;
      if (!el || !click || !parent) return;
      const rect = parent.getBoundingClientRect();
      el.style.left = `${click.x - rect.left + 12}px`;
      el.style.top = `${click.y - rect.top + 12}px`;
      el.style.visibility = "visible";
    },
    [click],
  );

  if (!click) return null;
  return (
    <div
      ref={place}
      className="pointer-events-none invisible absolute z-30 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm"
    >
      Still loading here
    </div>
  );
};
