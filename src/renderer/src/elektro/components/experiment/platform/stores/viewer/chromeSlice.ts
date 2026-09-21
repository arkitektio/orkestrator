import { TARGET_TICK_SPACING_PX } from "../../camera/timeTicks";
import type { ViewerSet } from "./sliceTypes";

/**
 * Reading aids drawn OVER the timeline: the value-axis gutter and the grid.
 *
 * Both are off by default — a timeline that showed them unasked would be busier
 * for every viewer to help a few — and both are session state, per scope, not
 * persisted, exactly as mikro's scene chrome toggles are.
 *
 * ONE spacing knob drives both axes. The vertical grid lines are the TIME AXIS'
 * own ticks (`TimeAxis` reads `gridSpacingPx` too), so a line always sits under a
 * label and the plot never carries a second set of numbers. The value axis derives
 * its own, denser target from it: a value label is one short line, so it tolerates
 * closer packing than a time label does.
 */

export const MIN_GRID_SPACING_PX = 60;
export const MAX_GRID_SPACING_PX = 240;

/** The value axis' target, derived from the one knob. */
export const valueSpacingFor = (gridSpacingPx: number): number =>
  Math.max(28, gridSpacingPx / 2);

export type ChromeSlice = {
  /** The per-row value-axis gutter down the left edge. */
  showValueAxis: boolean;
  /** Grid lines at the value ticks and the time ticks. */
  showGrid: boolean;
  /** Roughly how many pixels apart ticks and grid lines should fall. */
  gridSpacingPx: number;
  setShowValueAxis: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridSpacingPx: (px: number) => void;
};

export const createChromeSlice = (set: ViewerSet): ChromeSlice => ({
  showValueAxis: false,
  showGrid: false,
  gridSpacingPx: TARGET_TICK_SPACING_PX,
  setShowValueAxis: (showValueAxis) => set({ showValueAxis }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setGridSpacingPx: (px) =>
    set({
      gridSpacingPx: Math.min(
        MAX_GRID_SPACING_PX,
        Math.max(MIN_GRID_SPACING_PX, Math.round(px)),
      ),
    }),
});
