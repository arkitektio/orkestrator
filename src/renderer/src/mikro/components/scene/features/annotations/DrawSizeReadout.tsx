import { useEffect, useRef } from "react";
import {
  useRoiDrawSessionStoreApi,
  type RoiDrawReadout,
} from "./roiDrawSessionStore";

/** Offset from the cursor so the label never sits under the crosshair. */
const CURSOR_GAP_PX = 14;

/**
 * The shape's dimensions, next to the cursor, while you drag it out.
 *
 * Renders exactly once and never again: the label follows the pointer through a
 * vanilla store subscription that mutates the DOM node directly. A React
 * subscription would re-render this on every pointer move.
 *
 * No projection is involved — the label tracks the *cursor*, whose
 * canvas-relative position is already on the pointer event, and R3F's canvas
 * nests at 0,0 inside the scene's own relatively-positioned container. (The
 * scene does publish a view-projection matrix for anchoring HTML to world
 * points, but it is throttled with a trailing settle, so it would visibly lag a
 * per-move label.)
 */
export const DrawSizeReadout = () => {
  const api = useRoiDrawSessionStoreApi();
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const apply = (readout: RoiDrawReadout | null) => {
      const element = boxRef.current;
      if (!element) return;

      if (!readout) {
        element.style.display = "none";
        return;
      }

      element.style.display = "block";
      // translate3d is compositor-only; animating left/top would force a layout
      // on every frame of the drag.
      element.style.transform = `translate3d(${readout.x + CURSOR_GAP_PX}px, ${
        readout.y + CURSOR_GAP_PX
      }px, 0)`;
      element.textContent = readout.label;
    };

    apply(api.getState().readout);
    return api.subscribe((state) => apply(state.readout));
  }, [api]);

  return (
    <div
      ref={boxRef}
      style={{ display: "none" }}
      className="pointer-events-none absolute left-0 top-0 z-30 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white tabular-nums"
    />
  );
};
