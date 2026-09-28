import type { SliceSet } from "./sliceTypes";
import { createVolumeInputsTracker } from "../../gpu/volumeCompositor";
import type { VolumeCompositorReport, VolumeInputsTracker } from "../../gpu/volumeCompositor";
import type { RenderBudgetInfo } from "../viewerStore";
/**
 * Render-cost budgeting and the non-reactive volume-invalidation trackers.
 * Shared by bricks, labels and volume, so it stays platform.
 */
export interface BudgetSlice {
  /** Null while every layer fits the render-cost budget. */
  renderBudget: RenderBudgetInfo | null;
  setRenderBudget: (info: RenderBudgetInfo | null) => void;
  /** NON-REACTIVE bump tracker for "the volume image changed" edges the
   * VolumeCompositor's cache key cannot derive from store counters (uniform
   * writes: ray/step/channel/label uniforms, label LUT). A plain mutable
   * object like `brickSystem` — components call `volumeInputs.bump(reason)`
   * alongside their existing `invalidate()`; the compositor reads
   * `version`/`lastReason` imperatively per frame. Never subscribe to it. */
  volumeInputs: VolumeInputsTracker;
  /** Debug-report hook registered by the VolumeCompositor (DebugPanel). */
  volumeCompositorReport: (() => VolumeCompositorReport) | null;
  registerVolumeCompositor: (report: (() => VolumeCompositorReport) | null) => void;
}

export const createBudgetSlice = (
  set: SliceSet<BudgetSlice>,
): BudgetSlice => ({
  renderBudget: null,
  setRenderBudget: (info) => set({ renderBudget: info }),
  volumeInputs: createVolumeInputsTracker(),
  volumeCompositorReport: null,
  registerVolumeCompositor: (report) => set({ volumeCompositorReport: report }),
});
