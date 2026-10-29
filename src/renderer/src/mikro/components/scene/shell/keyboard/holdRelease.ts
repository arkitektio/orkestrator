import type { InteractionMode } from "../../platform/stores/modeStore";

/**
 * What releasing a hold-to-mode key does (`KeyboardModeController`):
 *
 * - `"keep"` — nothing: the user picked another mode from the toolbar during
 *   the hold, and that choice wins over the restore.
 * - `"defer"` — stay in ANNOTATE for now: a shape was started during the hold
 *   and is still half-drawn. Letting go of A mid-path must not throw the user
 *   out of the mode the path needs; the restore runs once the shape is
 *   finished or discarded. Off with the `keepAnnotatingWhileDrawing` setting.
 * - `"restore"` — back to the mode the hold started from.
 */
export type HoldRelease = "keep" | "defer" | "restore";

export const holdReleaseAction = (input: {
  heldMode: InteractionMode;
  currentMode: InteractionMode;
  shapeInProgress: boolean;
  keepAnnotatingWhileDrawing: boolean;
}): HoldRelease => {
  if (input.currentMode !== input.heldMode) return "keep";
  if (
    input.heldMode === "ANNOTATE" &&
    input.shapeInProgress &&
    input.keepAnnotatingWhileDrawing
  ) {
    return "defer";
  }
  return "restore";
};
