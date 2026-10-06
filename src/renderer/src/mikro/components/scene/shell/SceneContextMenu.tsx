import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { registerSmartNode, unregisterSmartNode } from "@/core/smart/nodeRegistry";
import type { Structure } from "@/core/types";
import { exceedsDragThreshold } from "../features/annotations/drawGesture";
import { useRoiSelectionStoreApi } from "../features/annotations/roiSelectionStore";
import { useGpuPicker } from "../platform/draw/useGpuPicker";
import { useSceneStoreApi } from "../platform/stores/sceneStore";
import { sceneContextTarget } from "./sceneContextTarget";

/**
 * Right-click in the viewport → the smart context menu of what is under the
 * pointer: the hovered annotation, or the mesh collection of the mesh that
 * was clicked. The menu itself is the app's ONE context menu
 * (`core/smart/SmartSurface`): it opens for any registered smart node a
 * `contextmenu` event reaches, at the event's coordinates. The canvas has no
 * DOM node per shape, so this component keeps one invisible stand-in, points
 * it at the resolved structure and sends the event there — workflows, local
 * actions and every other section then appear exactly as on a card.
 *
 * A CLICK, not a drag: the right button also pans (NAVIGATE) or orbits (the
 * tool modes), so the menu opens on release, and only when the pointer
 * stayed put. That is also why the native `contextmenu` event is not used —
 * it fires on press on Linux, before anyone can tell a click from a drag
 * (and OrbitControls cancels it anyway).
 *
 * The mesh is resolved by a one-shot id-buffer pick, not by handlers on the
 * mesh layer: a handler prop would put every mounted cell into R3F's raycast
 * set for each click and orbit start (P20, `platform/probe/probeGating.ts`).
 * Without the GPU picker a mesh right-click therefore does nothing.
 *
 * Also owns the pointer CURSOR over a hovered annotation, the cheapest "you
 * are on it" there is.
 */
export const SceneContextMenu = () => {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const picker = useGpuPicker();
  const selectionApi = useRoiSelectionStoreApi();
  const sceneApi = useSceneStoreApi();

  useEffect(() => {
    const canvas = gl.domElement;
    const applyCursor = () => {
      canvas.style.cursor = selectionApi.getState().hoveredRoi ? "pointer" : "";
    };
    applyCursor();
    const unsubscribe = selectionApi.subscribe((state, previous) => {
      if ((state.hoveredRoi === null) !== (previous.hoveredRoi === null)) applyCursor();
    });
    return () => {
      unsubscribe();
      canvas.style.cursor = "";
    };
  }, [gl, selectionApi]);

  useEffect(() => {
    const canvas = gl.domElement;
    // The stand-in the menu opens "on". Zero-size and fixed: Radix anchors
    // the menu to the event's coordinates, never to this node's box.
    const anchor = document.createElement("span");
    anchor.setAttribute("aria-hidden", "true");
    anchor.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;";
    (canvas.parentElement ?? document.body).appendChild(anchor);

    const open = (structure: Structure, clientX: number, clientY: number) => {
      registerSmartNode(anchor, structure);
      anchor.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX, clientY }),
      );
    };

    let pressedAt: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      pressedAt = event.button === 2 ? { x: event.clientX, y: event.clientY } : null;
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = pressedAt;
      pressedAt = null;
      if (event.button !== 2 || !start) return;
      const { clientX, clientY } = event;
      if (exceedsDragThreshold(start, { x: clientX, y: clientY })) return; // a pan / orbit
      const layers = sceneApi.getState().sceneLayers;
      const hoveredRoi = selectionApi.getState().hoveredRoi;
      const immediate = sceneContextTarget({ hoveredRoi, pickedLayerId: null, layers });
      if (immediate) {
        open(immediate, clientX, clientY);
        return;
      }
      picker?.pick("click", { clientX, clientY, camera: get().camera }, (hit) => {
        const target = sceneContextTarget({
          hoveredRoi: null,
          pickedLayerId: hit?.key ?? null,
          // Re-read: the pick answers a frame later.
          layers: sceneApi.getState().sceneLayers,
        });
        if (target) open(target, clientX, clientY);
      });
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      unregisterSmartNode(anchor);
      anchor.remove();
    };
  }, [gl, get, picker, selectionApi, sceneApi]);

  return null;
};
