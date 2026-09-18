import type { ViewerGet, ViewerSet } from "./sliceTypes";

/** The canvas' pixel size. */

export type ViewportSlice = {
  viewportPx: { width: number; height: number };
  setViewportPx: (size: { width: number; height: number }) => void;
};

export const createViewportSlice = (set: ViewerSet, get: ViewerGet): ViewportSlice => ({
  viewportPx: { width: 0, height: 0 },
  setViewportPx: (size) => {
    const current = get().viewportPx;
    if (current.width === size.width && current.height === size.height) return;
    set({ viewportPx: size });
  },
});
