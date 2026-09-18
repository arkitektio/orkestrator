import type { InteractionMode } from "../stores/viewerStore";

/**
 * What a pointer drag on the timeline means — decided once, at pointer-down.
 *
 *  - EXPLORE, plain left drag → a zoom BOX: release zooms into the boxed stretch.
 *  - EXPLORE, shift-drag or middle-drag → PAN, the old drag behaviour, kept one
 *    modifier away rather than lost to the box.
 *  - ANNOTATE → nothing here: the annotation drawer owns the pointer.
 *
 * Decided at DOWN, not per move, so a drag cannot flip from panning to boxing
 * halfway because a key was pressed mid-gesture.
 *
 * Pure — runs in node.
 */
export type DragIntent = "zoom-box" | "pan" | "none";

export const dragIntentFor = (
  mode: InteractionMode,
  event: { button: number; shiftKey: boolean },
): DragIntent => {
  if (mode !== "EXPLORE") return "none";
  if (event.button === 1) return "pan";
  if (event.button !== 0) return "none";
  return event.shiftKey ? "pan" : "zoom-box";
};

/**
 * Below this many pixels a drag is a click. A click must not zoom: a stray
 * sub-pixel wobble would otherwise zoom to a sliver of nothing.
 */
export const MIN_BOX_PX = 5;

/** The window a finished zoom box asks for, or null when it was really a click. */
export const boxToWindow = (
  box: { from: number; to: number },
  boxWidthPx: number,
): { start: number; end: number } | null => {
  if (Math.abs(boxWidthPx) < MIN_BOX_PX) return null;
  const start = Math.min(box.from, box.to);
  const end = Math.max(box.from, box.to);
  return end > start ? { start, end } : null;
};
