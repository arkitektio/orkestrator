import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { applyLinePickThreshold } from "./linePicking";

/**
 * Widens the pick band around every fat line in the scene — in practice, the
 * annotation outlines, since only objects carrying event handlers are raycast
 * at all. See `linePicking.ts` for why the default is a hairline.
 *
 * A component rather than the `Canvas`'s `raycaster` prop because the band is
 * stated in CSS pixels and three measures in device ones: the conversion has to
 * follow DPR, which changes when the window moves between displays.
 */
export const LinePickTuning = () => {
  const raycaster = useThree((state) => state.raycaster);
  const dpr = useThree((state) => state.viewport.dpr);

  useEffect(() => {
    applyLinePickThreshold(raycaster, dpr);
  }, [raycaster, dpr]);

  return null;
};
