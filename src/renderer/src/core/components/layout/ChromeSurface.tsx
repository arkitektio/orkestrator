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
 *
 * The same class carries `app-no-drag`, for a second and unrelated reason. The
 * rail is a window-drag region, and Electron hit-tests drag regions in the OS,
 * BENEATH z-index (see `PageDialogHost`): a menu opened from the rail lands
 * geometrically on top of the rail, so without its own `no-drag` every click
 * in it is swallowed silently and the menu looks dead. Being portaled to
 * `body` is exactly what makes this necessary — the `app-no-drag` the rail
 * puts around its own footer does not reach an overlay that left the DOM.
 */
const ChromeSurfaceContext = createContext(false);

export const CHROME_ZOOM_CLASS = "chrome-zoom";

/**
 * What a portaled overlay from the chrome carries: the counter-zoom, and the
 * opt-out from the window-drag region it is painted over.
 */
export const CHROME_OVERLAY_CLASS = `${CHROME_ZOOM_CLASS} app-no-drag`;

export const ChromeSurfaceProvider = ({ children }: { children: React.ReactNode }) => (
  <ChromeSurfaceContext.Provider value={true}>{children}</ChromeSurfaceContext.Provider>
);

export const useIsChromeSurface = () => useContext(ChromeSurfaceContext);

/**
 * The classes a portaled overlay needs to render at chrome size and stay
 * clickable over the rail, or nothing when it was opened from the page.
 */
export const useChromeZoomClass = (): string | undefined =>
  useContext(ChromeSurfaceContext) ? CHROME_OVERLAY_CLASS : undefined;
