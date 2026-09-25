import { useEffect } from "react";
import { useScenePick } from "../../scene/sceneHost";
import { useRegistration, useRegistrationApi } from "../store/context";

/**
 * Turns scene clicks into landmark halves while a pick side is armed.
 *
 * The scene's probe does the work (`useScenePick`): the probe pin makes exactly
 * ONE layer answer, so "pick on the fixed layer" ignores the moving layer lying
 * on top of it, and vice versa — which is the entire difficulty of clicking
 * corresponding points on two overlaid images. `worldPos` is where the layer is
 * DRAWN, draft included; the store takes a moving-side click back into base
 * world so the landmark stays on the data.
 *
 * Mounted with the canvas layer, not the sidebar: arming a pick and then
 * glancing at the Layers tab must not disarm it.
 */
export const LandmarkPicker = () => {
  const api = useRegistrationApi();
  const side = useRegistration((state) => (state.session?.phase === "editing" ? state.pickSide : null));
  const layerId = useRegistration((state) =>
    state.pickSide === "fixed" ? state.fixedLayerId : (state.session?.movingLayerId ?? null),
  );

  const { active } = useScenePick({
    enabled: side !== null && layerId !== null,
    layerId,
    onPick: (pick) => {
      const current = api.getState().pickSide;
      if (current) api.getState().addLandmarkPoint(current, pick.world);
    },
  });

  // Escape disarms — the same key that cancels every other scene gesture.
  useEffect(() => {
    if (side === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") api.getState().setPickSide(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, side]);

  // The scene can refuse PROBE (no probeable layer — `ModeCompatGuard`); an
  // armed pick that cannot fire would be a button that silently does nothing.
  useEffect(() => {
    api.getState().setPickBlocked(side !== null && layerId !== null && !active);
  }, [api, side, layerId, active]);

  return null;
};
