import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * The palette growing out of the rail's search pill — and shrinking back.
 *
 * Not a clip reveal. The panel's BOX animates: from the pill's width and
 * height (published as `--palette-origin-*` by `TitleSearchBar`) to its own,
 * so the input row visibly widens and the results drop down under it. CSS
 * keyframes cannot do that against an `auto` height, so this measures the
 * mounted panel and runs the Web Animations API on it; while it plays the
 * inline size is pinned, and on finish the element is handed back to layout.
 *
 * The way out is the same motion reversed, and it has to finish BEFORE the
 * dialog unmounts — so a dismiss is intercepted, the shrink plays, and only
 * then is `close` called. The pill reappears on that same spot as this leaves.
 */

const GROW_MS = 260;
const GROW_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SHRINK_MS = 180;
const SHRINK_EASE = "cubic-bezier(0.32, 0, 0.67, 0)";

/**
 * A `--palette-origin-*` value in px. `TitleSearchBar` writes px; the
 * first-paint fallbacks in `index.css` are rem, which need the root font size.
 */
export const originPx = (raw: string, rootFontSize = 16): number => {
  const value = raw.trim();
  const number = parseFloat(value);
  if (Number.isNaN(number)) return 0;
  return value.endsWith("rem") ? number * rootFontSize : number;
};

const readOrigin = () => {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const rootFontSize = parseFloat(style.fontSize) || 16;
  return {
    width: originPx(style.getPropertyValue("--palette-origin-width"), rootFontSize),
    height: originPx(style.getPropertyValue("--palette-origin-height"), rootFontSize),
  };
};

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canAnimate = (element: HTMLElement | null): element is HTMLElement =>
  !!element && typeof element.animate === "function" && !reducedMotion();

export const usePaletteGrow = (open: boolean, close: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const closing = useRef(false);

  // Grow on mount. A layout effect, so the start frame is applied before the
  // panel is ever painted at full size.
  useLayoutEffect(() => {
    if (!open) return;
    closing.current = false;
    const element = ref.current;
    if (!canAnimate(element)) return;
    const origin = readOrigin();
    if (origin.width <= 0 || origin.height <= 0) return;
    const target = element.getBoundingClientRect();
    const animation = element.animate(
      [
        { width: `${origin.width}px`, height: `${origin.height}px` },
        { width: `${target.width}px`, height: `${target.height}px` },
      ],
      { duration: GROW_MS, easing: GROW_EASE, fill: "backwards" },
    );
    return () => animation.cancel();
  }, [open]);

  /** What the dialog's dismiss calls: shrink, then really close. */
  const requestClose = useCallback(() => {
    if (closing.current) return;
    const element = ref.current;
    if (!canAnimate(element)) {
      close();
      return;
    }
    closing.current = true;
    const origin = readOrigin();
    const current = element.getBoundingClientRect();
    const animation = element.animate(
      [
        { width: `${current.width}px`, height: `${current.height}px` },
        { width: `${origin.width}px`, height: `${origin.height}px` },
      ],
      { duration: SHRINK_MS, easing: SHRINK_EASE, fill: "forwards" },
    );
    const done = () => {
      closing.current = false;
      close();
    };
    animation.finished.then(done, done);
  }, [close]);

  return { ref, requestClose };
};
