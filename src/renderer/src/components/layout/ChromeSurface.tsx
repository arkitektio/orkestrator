import { createContext, useContext } from "react";

/**
 * "This is window chrome, not page": the rail, and anything opened from it.
 *
 * The window's zoom (the "Page zoom" setting) is a Chromium `setZoomFactor`
 * on the whole webContents, so the page's viewers, canvases and drag maths
 * keep one consistent coordinate space. The chrome counters it with CSS
 * `zoom: calc(1 / var(--page-zoom))` (`.chrome-zoom` in `index.css`) so the
 * rail renders at a fixed native size whatever the page is set to.
 *
 * A popover, menu or tooltip opened from the rail portals to `body`, outside
 * the rail's DOM, so it would come up at page size. React context crosses
 * portals where CSS inheritance does not: the shadcn primitives ask
 * `useChromeZoomClass()` and carry the counter-zoom themselves when they were
 * opened from inside a `ChromeSurfaceProvider`.
 *
 * The class goes on the portaled CONTENT, never on Radix's popper wrapper,
 * and never on an element that is already inside the rail (zoom multiplies
 * through ancestors, so that would double it).
 */
const ChromeSurfaceContext = createContext(false);

export const CHROME_ZOOM_CLASS = "chrome-zoom";

export const ChromeSurfaceProvider = ({ children }: { children: React.ReactNode }) => (
  <ChromeSurfaceContext.Provider value={true}>{children}</ChromeSurfaceContext.Provider>
);

export const useIsChromeSurface = () => useContext(ChromeSurfaceContext);

/** The class a portaled overlay needs to render at chrome size, or nothing. */
export const useChromeZoomClass = (): string | undefined =>
  useContext(ChromeSurfaceContext) ? CHROME_ZOOM_CLASS : undefined;
