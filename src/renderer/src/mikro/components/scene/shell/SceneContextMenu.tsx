import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { registerSmartNode, unregisterSmartNode } from "@/core/smart/nodeRegistry";
import type { Structure } from "@/core/types";
import { exceedsDragThreshold } from "../features/annotations/drawGesture";
import { useRoiSelectionStoreApi } from "../features/annotations/roiSelectionStore";
import { useLayerRunStoreApi, type LayerRunAnchor } from "../features/layerRun/layerRunSlice";
import { runnableLayers, type LayerRunSnapshot } from "../features/layerRun/layerRunSnapshot";
import { useOptionalSceneFloatStoreApi } from "../platform/float/floatStore";
import { useGpuPicker } from "../platform/draw/useGpuPicker";
import { effectiveDataLayerId } from "../platform/probe/probeTargeting";
import { readControlsTarget } from "../platform/probe/probeWorld";
import { useModeStoreApi } from "../platform/stores/modeStore";
import { useSceneStoreApi } from "../platform/stores/sceneStore";
import { sceneContextTarget, type SceneContextHit } from "./sceneContextTarget";

/**
 * Right-click in the viewport → the smart context menu of what is under the
 * pointer: the hovered annotation, or the mesh collection of the mesh that
 * was clicked. Anywhere else, the image layer the scene runs on: its float
 * (`features/layerRun/LayerRunFloat`) runs on the slice on screen (2D) or the
 * volume / crop box (3D), cut when an action runs. The menu itself is the app's ONE context menu
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
  const viewerApi = useLayerRunStoreApi();
  const modeApi = useModeStoreApi();
  const floatApi = useOptionalSceneFloatStoreApi();

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
      // Read at resolve time: the pick answers a frame later.
      const resolve = (hoveredRoi: Parameters<typeof sceneContextTarget>[0]["hoveredRoi"], pickedLayerId: string | null) =>
        sceneContextTarget({
          hoveredRoi,
          pickedLayerId,
          layers: sceneApi.getState().sceneLayers,
          dataLayerId: effectiveDataLayerId(viewerApi.getState().dataLayerId, sceneApi.getState().layers),
        });
      const act = (target: SceneContextHit | null) => {
        if (!target) return;
        if (target.kind === "structure") open(target.structure, clientX, clientY);
        else openLayerMenu(target.layerId, clientX, clientY);
      };
      const hoveredRoi = selectionApi.getState().hoveredRoi;
      if (hoveredRoi) {
        act(resolve(hoveredRoi, null));
        return;
      }
      // Without the GPU picker a mesh cannot be told apart: the layer menu
      // still opens.
      if (!picker) {
        act(resolve(null, null));
        return;
      }
      picker.pick("click", { clientX, clientY, camera: get().camera }, (hit) =>
        act(resolve(null, hit?.key ?? null)),
      );
    };

    // The view is SNAPSHOT here, at the click: the float runs on what was on
    // screen when it opened. Nothing opens where no shown layer has a cut (a
    // plane past every stack, a crop box they all lie outside of).
    const openLayerMenu = (dataLayerId: string, clientX: number, clientY: number) => {
      const viewer = viewerApi.getState();
      // Mid-gesture the crop box is half drawn: not a selection to run on.
      if (viewer.cropPhase !== "idle") return;
      const snapshot: LayerRunSnapshot = {
        displayMode: modeApi.getState().displayMode,
        currentZ: viewer.currentZ,
        cropBox: viewer.cropBox,
        dimSelections: viewer.dimSelections,
        worldSelections: viewer.worldSelections,
        layerAxisInstants: viewer.layerAxisInstants,
      };
      const [layer] = runnableLayers(sceneApi.getState().layers, dataLayerId, snapshot);
      if (!layer) return;
      // One float at a time: the layer's replaces a shape's card or a mesh's.
      selectionApi.getState().closeRoiMenu();
      floatApi?.getState().close();
      viewer.openLayerRunMenu({
        layerId: layer.id,
        snapshot,
        anchor: clickAnchor(clientX, clientY, snapshot),
      });
    };

    // The world point under the click, so the float follows the camera like a
    // shape's card: on the plane shown in 2D; in 3D on the plane through the
    // orbit pivot, facing the eye. The click's pixel when the ray meets neither.
    const clickAnchor = (clientX: number, clientY: number, snapshot: LayerRunSnapshot): LayerRunAnchor => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { camera, controls } = get();
      raycaster.setFromCamera(
        new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1),
        camera,
      );
      if (snapshot.displayMode === "2D") {
        plane.set(new THREE.Vector3(0, 0, 1), -snapshot.currentZ);
      } else {
        const pivot = readControlsTarget(controls) ?? new THREE.Vector3();
        const facing = camera.getWorldDirection(new THREE.Vector3()).negate();
        plane.setFromNormalAndCoplanarPoint(facing, pivot);
      }
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      return hit ? { kind: "world", point: [hit.x, hit.y, hit.z] } : { kind: "screen", point: { x, y } };
    };
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      unregisterSmartNode(anchor);
      anchor.remove();
    };
  }, [gl, get, picker, selectionApi, sceneApi, viewerApi, modeApi, floatApi]);

  return null;
};
