/**
 * What Escape does in the scene, innermost first — one press, one step:
 *
 * 1. `"drawer"` — a shape or brush stroke is under way: it is the annotation
 *    drawer's to discard (`RoiDrawer` / `BrushStrokeSession`, which leave
 *    ANNOTATE as they do).
 * 2. `"leave-annotate"` — ANNOTATE with nothing drawn: back to the mode it
 *    came from.
 * 3. `"clear-crop"` — the crop box (`S`), being drawn or applied: gone, the
 *    whole image shows again.
 * 4. `null` — not the scene's: the app's own Escape (clearing the selection)
 *    has it.
 *
 * Read by `KeyboardModeController`'s capture-phase listener: the app-wide
 * `SelectionBox` stops every Escape on `document`, so the scene must hear it
 * on the way down.
 */
export type SceneEscape = "drawer" | "leave-annotate" | "clear-crop" | null;

export const sceneEscapeAction = (input: {
  drawing: boolean;
  annotating: boolean;
  cropOn: boolean;
}): SceneEscape => {
  if (input.drawing) return "drawer";
  if (input.annotating) return "leave-annotate";
  if (input.cropOn) return "clear-crop";
  return null;
};

/** Escape aimed at a dialog or menu above the scene is theirs. */
export const inOverlay = (target: EventTarget | null): boolean =>
  typeof Element !== "undefined" &&
  target instanceof Element &&
  target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]') !== null;
