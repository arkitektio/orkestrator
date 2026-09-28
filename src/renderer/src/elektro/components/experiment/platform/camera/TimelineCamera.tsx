import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { createSettler } from "@/core/data/scene/perf/settle";
import { createRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import { useExperimentStoreApi } from "../stores/experimentStore";
import { panBy, useRangeStoreApi, zoomAbout } from "../stores/rangeStore";
import { useViewerStoreApi } from "../stores/viewerStore";
import { boxToWindow, dragIntentFor } from "./dragIntent";
import {
  frustumFor,
  timeAtPixel,
  timeDeltaForDrag,
  zoomFactorForWheel,
} from "./rangeToCamera";

/**
 * The timeline's camera, and the gestures that move it.
 *
 * Not OrbitControls. A time viewer's gestures do not map onto an orbit. In
 * EXPLORE, dragging draws a box and zooms INTO it (undoable); shift- or
 * middle-drag pans TIME; the wheel zooms TIME about the cursor; double-click fits. And the camera
 * has no state of its own — it is a projection of the range store's `liveRange`
 * (see `rangeToCamera.ts`), so there is nothing to keep in sync and nothing to
 * drift.
 *
 * ## The two planes (P17)
 *
 * Gestures write `liveRange` at pointer rate. This component binds to it with a
 * VANILLA subscription (`bindFields` on its two scalars), rewrites the frustum and
 * `invalidate()`s — no React render anywhere in that loop. A settler then copies
 * live → committed once the gesture pauses, and only THAT wakes the expensive
 * machinery (the tile plan and its reads, the URL, the axis labels).
 *
 * Hover is coalesced to one write per animation frame for the same reason: a
 * pointer can report several moves per frame, and the readout only needs one.
 */

/** How long a gesture must pause before its window is committed. */
export const COMMIT_SETTLE_MS = 120;

export const TimelineCamera = () => {
  const set = useThree((s) => s.set);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();

  const camera = useMemo(() => {
    const c = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
    // `manual`: r3f otherwise rewrites an orthographic camera's frustum to the
    // canvas' PIXEL size on mount and on every resize (`updateCamera` in
    // @react-three/fiber). The frustum here is the time window, re-applied only
    // when the window or the row count changes — so without this, any resize
    // (a sidebar opening) would silently replace it with ±half-the-canvas.
    (c as THREE.OrthographicCamera & { manual?: boolean }).manual = true;
    c.position.set(0, 0, 5);
    c.lookAt(0, 0, 0);
    return c;
  }, []);

  // Install as the default camera BEFORE the first frame, so nothing draws through
  // r3f's perspective default in between.
  useLayoutEffect(() => {
    set({ camera });
  }, [camera, set]);

  // The canvas' pixel size, for every pixel↔time conversion. UI cadence: resizes.
  useEffect(() => {
    viewerApi.getState().setViewportPx({ width: size.width, height: size.height });
  }, [size.width, size.height, viewerApi]);

  // --- render plane: the frustum follows the live window and the row count ---
  useEffect(() => {
    const timeOrigin = experimentApi.getState().timeOrigin;
    const apply = () => {
      const { liveRange } = rangeApi.getState();
      const { rowCount } = viewerApi.getState();
      const f = frustumFor(liveRange, timeOrigin, rowCount);
      camera.left = f.left;
      camera.right = f.right;
      camera.top = f.top;
      camera.bottom = f.bottom;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const unbindRange = bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      apply,
    );
    const unbindRows = bindFields(viewerApi, [(s) => s.rowCount], apply);
    return () => {
      unbindRange();
      unbindRows();
    };
  }, [camera, rangeApi, viewerApi, experimentApi, invalidate]);

  // --- live → committed, once the gesture pauses ---
  useEffect(() => {
    const settler = createSettler<null>({
      delayMs: COMMIT_SETTLE_MS,
      emit: () => rangeApi.getState().commitRange(),
    });
    const unsubscribe = rangeApi.subscribe((state, previous) => {
      if (state.liveRange !== previous.liveRange) settler.push(null);
    });
    return () => {
      unsubscribe();
      settler.cancel();
    };
  }, [rangeApi]);

  // --- gestures ---
  useEffect(() => {
    const element = gl.domElement as HTMLCanvasElement;
    const hover = createRafCoalescer<number | null>((time) =>
      viewerApi.getState().setHoverTime(time),
    );

    const localX = (event: { clientX: number }) =>
      event.clientX - element.getBoundingClientRect().left;

    /**
     * The drag in progress. Its INTENT is fixed at pointer-down (`dragIntent.ts`),
     * so a key pressed mid-gesture cannot flip a pan into a box.
     */
    let drag:
      | { kind: "pan"; x: number; pointerId: number }
      | { kind: "zoom-box"; startX: number; from: number; pointerId: number }
      | null = null;

    const onPointerDown = (event: PointerEvent) => {
      const intent = dragIntentFor(viewerApi.getState().interactionMode, event);
      if (intent === "none") return;
      element.setPointerCapture(event.pointerId);
      if (intent === "pan") {
        drag = { kind: "pan", x: event.clientX, pointerId: event.pointerId };
        return;
      }
      const from = timeAtPixel(localX(event), element.clientWidth, rangeApi.getState().liveRange);
      drag = { kind: "zoom-box", startX: event.clientX, from, pointerId: event.pointerId };
    };

    const onPointerMove = (event: PointerEvent) => {
      const width = element.clientWidth;
      const { liveRange } = rangeApi.getState();
      const t = timeAtPixel(localX(event), width, liveRange);
      hover.schedule(t);

      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.kind === "pan") {
        const dx = event.clientX - drag.x;
        drag.x = event.clientX;
        rangeApi.getState().setLiveRange(panBy(liveRange, timeDeltaForDrag(dx, width, liveRange)));
        return;
      }
      // The rubber band: drawn imperatively by `ZoomBoxOverlay`.
      viewerApi.getState().setZoomBox({ from: drag.from, to: t });
    };

    const endDrag = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const finished = drag;
      drag = null;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      if (finished.kind !== "zoom-box") return;

      viewerApi.getState().setZoomBox(null);
      // `pointercancel` abandons the box; only a real release zooms.
      if (event.type !== "pointerup") return;
      const to = timeAtPixel(localX(event), element.clientWidth, rangeApi.getState().liveRange);
      const target = boxToWindow({ from: finished.from, to }, event.clientX - finished.startX);
      // A deliberate jump: recorded in history, so ⌘Z steps back out of the zoom.
      if (target) rangeApi.getState().jumpTo(target);
    };

    const onPointerLeave = () => hover.schedule(null);

    const onWheel = (event: WheelEvent) => {
      // A timeline owns the wheel: without this the page scrolls under the zoom.
      event.preventDefault();
      const width = element.clientWidth;
      const { liveRange } = rangeApi.getState();
      // Trackpad horizontal swipe pans; vertical wheel zooms about the cursor.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        rangeApi
          .getState()
          .setLiveRange(panBy(liveRange, -timeDeltaForDrag(event.deltaX, width, liveRange)));
        return;
      }
      const anchor = timeAtPixel(localX(event), width, liveRange);
      rangeApi
        .getState()
        .setLiveRange(zoomAbout(liveRange, anchor, zoomFactorForWheel(event.deltaY)));
    };

    const onDoubleClick = () => rangeApi.getState().fit();

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
    element.addEventListener("pointerleave", onPointerLeave);
    // Non-passive, or preventDefault is ignored and the page scrolls.
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("dblclick", onDoubleClick);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endDrag);
      element.removeEventListener("pointercancel", endDrag);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("dblclick", onDoubleClick);
      hover.cancel();
    };
  }, [gl, rangeApi, viewerApi]);

  return null;
};
