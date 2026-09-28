import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { isTypingTarget } from "@/core/dnd/keyboardTarget";
import { nudge, worldUnitsPerPixel } from "../math/gizmoMath";
import type { Vec3 } from "../math/mat4";
import { useRegistrationApi } from "../store/context";
import { drawnPivot } from "../store/registrationStore";

/** Screen pixels per press; ×10 with Shift. */
const NUDGE_PX = 1;
const NUDGE_PX_COARSE = 10;

/**
 * Session keyboard: Alt+arrows nudge the draft, ⌘/Ctrl+Z undoes (⇧ redoes).
 *
 * Alt, because the bare arrows pan the view and Shift+arrows zoom / scrub Z —
 * and the scene's own handlers all bail on `altKey`, so the two never answer
 * the same press. A nudge is a fixed number of SCREEN pixels along the
 * camera's right/up, which is what "one press" means to someone looking at the
 * overlay: the same visible step at any zoom, in either view.
 *
 * In the canvas only because it needs the camera; it renders nothing.
 */
export const NudgeKeys = () => {
  const api = useRegistrationApi();
  const get = useThree((state) => state.get);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = api.getState();
      if (state.session?.phase !== "editing") return;
      if (isTypingTarget(event.target as { tagName?: string; isContentEditable?: boolean } | null)) return;

      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }

      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      const direction =
        event.key === "ArrowLeft" ? [-1, 0] : event.key === "ArrowRight" ? [1, 0] : event.key === "ArrowUp" ? [0, 1] : event.key === "ArrowDown" ? [0, -1] : null;
      if (!direction) return;
      event.preventDefault();

      const { camera, size } = get();
      // Columns 0 and 1 of the camera's world matrix: its right and up.
      const e = camera.matrixWorld.elements;
      const along: Vec3 = [
        e[0] * direction[0] + e[4] * direction[1],
        e[1] * direction[0] + e[5] * direction[1],
        e[2] * direction[0] + e[6] * direction[1],
      ];
      const pivot = drawnPivot(state);
      const distance = Math.hypot(
        camera.position.x - pivot[0],
        camera.position.y - pivot[1],
        camera.position.z - pivot[2],
      );
      const scale = worldUnitsPerPixel(
        camera as { isOrthographicCamera?: boolean; zoom?: number; fov?: number },
        distance,
        size.height,
      );
      state.applyStep(nudge(along, event.shiftKey ? NUDGE_PX_COARSE : NUDGE_PX, scale));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [api, get]);

  return null;
};
