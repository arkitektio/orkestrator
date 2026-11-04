import type { ScreenRect, Viewport } from "./projectScreenRect";

/** How far the float keeps from the item it describes (CSS px). */
export const FLOAT_GAP_PX = 16;
/** How far the float keeps from the frame's edge (CSS px). */
export const FLOAT_MARGIN_PX = 8;

export type FloatSide = "right" | "left" | "docked";

/**
 * Where a float's top-left goes BESIDE an item, so it never covers it.
 *
 * - Right of the item first, a gap past its right edge AS SEEN: the edge is
 *   clamped to the frame, so for an item reaching past the right border the
 *   float does not chase it off-screen, and that side counts as full.
 * - Else left of the item, a gap before its left edge (clamped the same way).
 * - Else (the item fills the view) it docks at the right margin and may
 *   overlap the item: a float off-screen is worse than one over the item.
 *
 * Vertically its top aligns with the item's top, then slides only as far as
 * the card needs to stay inside the frame.
 */
export function floatOriginBeside(
  rect: ScreenRect,
  card: { width: number; height: number },
  viewport: Viewport,
  { gap = FLOAT_GAP_PX, margin = FLOAT_MARGIN_PX }: { gap?: number; margin?: number } = {},
): { left: number; top: number; side: FloatSide } {
  const visibleRight = Math.min(rect.maxX, viewport.width);
  const visibleLeft = Math.max(rect.minX, 0);
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const maxTop = Math.max(margin, viewport.height - card.height - margin);
  const top = Math.min(Math.max(rect.minY, margin), maxTop);

  const right = visibleRight + gap;
  if (right + card.width + margin <= viewport.width) {
    return { left: Math.max(right, margin), top, side: "right" };
  }
  const left = visibleLeft - gap - card.width;
  if (left >= margin) {
    return { left, top, side: "left" };
  }
  return { left: maxLeft, top, side: "docked" };
}
