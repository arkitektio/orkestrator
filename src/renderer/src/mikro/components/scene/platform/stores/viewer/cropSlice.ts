import type { SliceSet } from "./sliceTypes";
import { sameCropBox, type CropBox } from "../../coords/cropBox";

/**
 * Where the crop gesture stands: `rect` while the rectangle follows the cursor,
 * `depth` once it is fixed and the wheel sets its thickness.
 */
export type CropPhase = "idle" | "rect" | "depth";

/**
 * The crop box (`platform/coords/cropBox.ts`) and the gesture that draws it.
 * Session-only.
 */
export interface CropSlice {
  /**
   * The APPLIED box: what is loaded and drawn. It moves once per wheel step
   * during the depth phase — the z-scrub's cadence — so render-plane consumers
   * (uniforms, clip planes, the planner) bind to it with a vanilla `subscribe`;
   * the one React reader is the annotation layer, which already re-filters at
   * that cadence for `currentZ`.
   *
   * The rectangle phase never writes it. The moving rectangle belongs to the
   * gesture alone; publishing it here would crop the scene to a box of no
   * depth and replan on every pointer move.
   */
  cropBox: CropBox | null;
  /** Click cadence: what chrome subscribes to. */
  cropPhase: CropPhase;
  /** The box the gesture started from — what `cancelCrop` puts back. */
  cropBoxBefore: CropBox | null;
  /**
   * Why the last `s` did nothing, for the hint chip to say once. UI cadence.
   * `"edge-on"`: the view runs along the XY plane, so a rectangle on it cannot
   * be pointed at.
   */
  cropNotice: "edge-on" | null;
  /** The gesture could not start: back to idle, with the reason. */
  refuseCrop: (reason: "edge-on") => void;
  clearCropNotice: () => void;
  /** `s`: start drawing. The applied box stays up until the rectangle is fixed. */
  beginCrop: () => void;
  /** The rectangle is fixed: apply `box` and hand the wheel to its depth. */
  fixCropRect: (box: CropBox) => void;
  /** Depth phase only (no-op set otherwise, and for a value-equal box). */
  setCropBox: (box: CropBox) => void;
  commitCrop: () => void;
  /** Esc: back to the box the gesture started from. */
  cancelCrop: () => void;
  /** Remove the box; the whole scene loads again. */
  clearCrop: () => void;
}

export const createCropSlice = (set: SliceSet<CropSlice>): CropSlice => ({
  cropBox: null,
  cropPhase: "idle",
  cropBoxBefore: null,
  beginCrop: () =>
    set((state) =>
      state.cropPhase === "idle"
        ? { cropPhase: "rect", cropBoxBefore: state.cropBox, cropNotice: null }
        : state,
    ),
  cropNotice: null,
  refuseCrop: (reason) =>
    set((state) => ({
      cropPhase: "idle",
      cropBox: state.cropPhase === "idle" ? state.cropBox : state.cropBoxBefore,
      cropBoxBefore: null,
      cropNotice: reason,
    })),
  clearCropNotice: () => set((state) => (state.cropNotice === null ? state : { cropNotice: null })),
  fixCropRect: (box) =>
    set((state) => (state.cropPhase === "rect" ? { cropPhase: "depth", cropBox: box } : state)),
  setCropBox: (box) =>
    set((state) =>
      state.cropPhase !== "depth" || sameCropBox(state.cropBox, box) ? state : { cropBox: box },
    ),
  commitCrop: () =>
    set((state) =>
      state.cropPhase === "depth" ? { cropPhase: "idle", cropBoxBefore: null } : state,
    ),
  cancelCrop: () =>
    set((state) =>
      state.cropPhase === "idle"
        ? state
        : { cropPhase: "idle", cropBox: state.cropBoxBefore, cropBoxBefore: null },
    ),
  clearCrop: () =>
    set((state) =>
      state.cropPhase === "idle" && state.cropBox === null
        ? state
        : { cropPhase: "idle", cropBox: null, cropBoxBefore: null },
    ),
});
