import type { SliceGet, SliceSet } from "./sliceTypes";
import type { BrandTarget } from "@/core/settings/store/brandTheme";
/**
 * Viewport furniture the user can toggle, plus the sampled brand hue.
 */
export interface ChromeSlice {
  debug: boolean;

  setDebug: (debug: boolean) => void;
  showScaleBar: boolean;
  setShowScaleBar: (show: boolean) => void;
  showScaleGrid: boolean;
  setShowScaleGrid: (show: boolean) => void;
  /** The red-X/green-Y origin crosshair (`shell/chrome/SceneAxis.tsx`). */
  showSceneAxis: boolean;
  setShowSceneAxis: (show: boolean) => void;
  /** The pyramid level under the viewport's center
   * (`features/bricks/CenterLodReadout.tsx`). */
  showLodReadout: boolean;
  setShowLodReadout: (show: boolean) => void;
  /**
   * The majority hue actually ON SCREEN, sampled from rendered canvas pixels
   * by `CanvasHueProbe`. Null until a frame with content has been sampled
   * (and again when the canvas unmounts) — `SceneBrandTheme` then falls back
   * to the colormap-derived estimate.
   */
  sampledBrandTarget: BrandTarget | null;
  setSampledBrandTarget: (target: BrandTarget | null) => void;
}

export const createChromeSlice = (
  set: SliceSet<ChromeSlice>,
  get: SliceGet<ChromeSlice>,
): ChromeSlice => ({
  debug: false,
  setDebug: (debug) => set({ debug }),
  showScaleBar: true,
  setShowScaleBar: (show) => set({ showScaleBar: show }),
  showScaleGrid: false,
  setShowScaleGrid: (show) => set({ showScaleGrid: show }),
  // Off by default: the crosshair reads as data in a screenshot and most scenes
  // are looked at, not aligned. Flip it on from the view-settings popover.
  showSceneAxis: false,
  setShowSceneAxis: (show) => set({ showSceneAxis: show }),
  showLodReadout: true,
  setShowLodReadout: (show) => set({ showLodReadout: show }),
  sampledBrandTarget: null,
  setSampledBrandTarget: (target) => {
    if (get().sampledBrandTarget === target) return; // skip no-op writes
    set({ sampledBrandTarget: target });
  },
});
