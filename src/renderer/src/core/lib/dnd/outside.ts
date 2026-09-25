import type { DragEndInfo } from "./engine";

/**
 * Whether a drag that ended (`DragSourceConfig.onEnd`) was let go outside
 * every window of this app — on the desktop, or over another app that took
 * none of it.
 *
 * The browser only says that the drag left this window and nothing took it.
 * Main then rules out our other windows, where a drop that missed every
 * target is just a miss; it reads the cursor itself, since the renderer's
 * `dragend` coordinates are unreliable. In a browser there is no outside to
 * drop on, so the answer is always no.
 *
 * Escape pressed while outside the window also counts.
 */
export const endedOutsideApp = async (info: DragEndInfo): Promise<boolean> => {
  if (!info.leftWindow || info.dropEffect !== "none") return false;
  const pointerInApp = window.api?.windowControls?.pointerInApp;
  if (!pointerInApp) return false;
  return !(await pointerInApp());
};
