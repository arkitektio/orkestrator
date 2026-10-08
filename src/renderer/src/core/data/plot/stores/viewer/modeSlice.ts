import type { ViewerGet, ViewerSet } from "./sliceTypes";

/**
 * What a drag on the canvas does — the timeline's counterpart of mikro's scene
 * modes, with the same iconography (Hand / SquarePen) and the same hold-A key.
 *
 *  - EXPLORE: drag a box to zoom into that stretch of time (undoable, ⌘Z steps
 *    back out); shift- or middle-drag pans; the wheel zooms at the cursor.
 *  - ANNOTATE: click drops an event, drag spans an epoch. Offered only where there
 *    is an experiment to draw on.
 */
export type InteractionMode = "EXPLORE" | "ANNOTATE";

export type InteractionModeOption = {
  value: InteractionMode;
  label: string;
  description: string;
};

/** Labels and help text, in one place — the buttons and the shortcut sheet read these. */
export const interactionModeOptions: InteractionModeOption[] = [
  {
    value: "EXPLORE",
    label: "Explore",
    description: "Drag a box to zoom into it; shift-drag pans; scroll zooms at the cursor",
  },
  {
    value: "ANNOTATE",
    label: "Annotate",
    description: "Click to mark an event, drag to mark an epoch (hold A)",
  },
];

/**
 * The rubber band of an EXPLORE drag, in world time, while it is being drawn.
 * Written at pointer rate — read imperatively by its overlay, never by a render.
 */
export type ZoomBox = { from: number; to: number } | null;

export type ModeSlice = {
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  zoomBox: ZoomBox;
  setZoomBox: (box: ZoomBox) => void;
};

export const createModeSlice = (set: ViewerSet, get: ViewerGet): ModeSlice => ({
  interactionMode: "EXPLORE",
  setInteractionMode: (interactionMode) => {
    if (get().interactionMode === interactionMode) return;
    // A half-drawn zoom box belongs to the mode it was started in.
    set({ interactionMode, zoomBox: null });
  },
  zoomBox: null,
  setZoomBox: (zoomBox) => set({ zoomBox }),
});
