import type { ScreenPoint } from "./projectScreenRect";

/** Margin the button keeps to the frame edge when the corner is off-screen. */
export const BUTTON_MARGIN = 8;

/**
 * Where the button's top-left goes so that its BOTTOM-LEFT sits exactly on
 * the anchor corner, slid inward only when that would leave the frame.
 */
export function buttonOriginFor(
  anchor: ScreenPoint,
  button: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  let left = anchor.x;
  let top = anchor.y - button.height;
  const maxLeft = Math.max(BUTTON_MARGIN, viewport.width - button.width - BUTTON_MARGIN);
  const maxTop = Math.max(BUTTON_MARGIN, viewport.height - button.height - BUTTON_MARGIN);
  left = Math.min(Math.max(left, BUTTON_MARGIN), maxLeft);
  top = Math.min(Math.max(top, BUTTON_MARGIN), maxTop);
  return { left, top };
}

/**
 * Where the button's node goes once it has grown into its card: the top-left
 * the bare button had (`buttonOriginFor`), so the avatar stays under the
 * pointer and the card unfolds right and down from it — slid inward only as
 * far as the grown size needs to stay in the frame. At the button's own size
 * this IS `buttonOriginFor`.
 */
export function cardOriginFor(
  anchor: ScreenPoint,
  button: { width: number; height: number },
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  const origin = buttonOriginFor(anchor, button, viewport);
  const maxLeft = Math.max(BUTTON_MARGIN, viewport.width - card.width - BUTTON_MARGIN);
  const maxTop = Math.max(BUTTON_MARGIN, viewport.height - card.height - BUTTON_MARGIN);
  return { left: Math.min(origin.left, maxLeft), top: Math.min(origin.top, maxTop) };
}
