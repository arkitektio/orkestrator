import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/core/lib/input/keyboardTarget";
import { useLayerSessionVisibility } from "../../scene/sceneHost";
import { useRegistration } from "../store/context";

/**
 * Hold B to hide the moving layers; release to show them again.
 *
 * Blinking is the oldest alignment check there is: flip between the two images
 * and the eye sees any residual motion at once. HOLD rather than toggle so the
 * layer can never be left hidden by accident, and so the rhythm is the user's.
 * Visibility is session-only scene state — nothing is written to the server —
 * and whatever was visible before is what comes back, also if the session ends
 * mid-blink.
 */
export const BlinkKey = () => {
  const memberLayerIds = useRegistration((state) => state.session?.memberLayerIds ?? null);
  const visibility = useLayerSessionVisibility();
  const hidden = useRef<string[]>([]);

  useEffect(() => {
    if (!memberLayerIds) return;

    const show = () => {
      for (const id of hidden.current) visibility.set(id, true);
      hidden.current = [];
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (hidden.current.length) return;
      // Only what is visible now is hidden — and therefore shown again.
      hidden.current = memberLayerIds.filter((id) => visibility.get(id) === true);
      for (const id of hidden.current) visibility.set(id, false);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b") show();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    // A key held while the window loses focus never sends its keyup.
    window.addEventListener("blur", show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", show);
      show();
    };
  }, [memberLayerIds, visibility]);

  return null;
};
