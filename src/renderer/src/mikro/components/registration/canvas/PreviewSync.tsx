import { useEffect } from "react";
import { usePlacementPreview } from "../../scene/sceneHost";
import { useRegistrationApi } from "../store/context";

/**
 * Mirrors the session's draft into the scene's placement preview.
 *
 * A VANILLA store subscription, not a React one: the draft changes at pointer
 * rate during a drag, and nothing here renders (P17 — the two-plane rule).
 * Writes are coalesced to one per animation frame by the host API.
 *
 * The three phases, and why each does what it does:
 *  - editing: the scene shows `delta` on every layer looking through the edge.
 *    In `release` apply-mode the scene is left alone WHILE a drag is in flight
 *    (the box proxy stands in) and catches up when it ends.
 *  - saving: hands off. The preview stays exactly as it is until the scene
 *    store drops it itself, in the same `set` the saved placement arrives in.
 *  - no session: nothing may be left previewed.
 */
export const PreviewSync = () => {
  const api = useRegistrationApi();
  const preview = usePlacementPreview();

  useEffect(() => {
    const push = () => {
      const state = api.getState();
      if (!state.session) {
        if (preview.previewedLayerIds().length) preview.clear();
        return;
      }
      if (state.session.phase !== "editing") return;
      if (state.applyMode === "release" && state.gestureStart) return;
      preview.schedule({
        layerIds: state.session.memberLayerIds,
        worldDelta: state.delta,
        onResult: (failures) =>
          api.getState().setPreviewIssue(failures.length ? failures[0].reason : null),
      });
    };

    push();
    const unsubscribe = api.subscribe((state, previous) => {
      if (
        state.delta !== previous.delta ||
        state.session !== previous.session ||
        state.gestureStart !== previous.gestureStart ||
        state.applyMode !== previous.applyMode
      ) {
        push();
      }
    });
    return () => {
      unsubscribe();
      // Leaving a preview behind would leave the scene lying about where
      // things are, with nothing on screen to say so.
      preview.clear();
    };
  }, [api, preview]);

  return null;
};
