import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { applyFitToCamera } from "@/lib/scene/camera/cameraFit";
import { computeSceneWorldBox } from "./sceneFit";
import { useSceneStoreApi } from "../stores/sceneStore";

type TargetControls = { target: THREE.Vector3; update: () => void };
type ControlsEvents = {
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
};

/**
 * Frames the union world-space extent of the ORIGINAL scene (as loaded, from
 * layer metadata alone — no mounted objects needed) BEFORE the first painted
 * frame, and again whenever the display-mode switch remounts the camera.
 *
 * Timing: this runs in a `useLayoutEffect`, i.e. before the browser paints the
 * commit, and it re-runs on (camera, controls, size) identity. The only frames
 * that can render un-fitted are the ones before the Canvas has measured its
 * container — a 0×0 canvas, so nothing is visible and no jump can be seen. The
 * drei `makeDefault` camera/controls install themselves in their own effects
 * (CameraController precedes this component in JSX); when they land, `camera`/
 * `controls` change identity and the fit re-applies to the real rig.
 *
 * The fit never stomps a pose the user has touched: a controls `"start"` event
 * arms an interaction latch, cleared only when the CAMERA identity changes
 * (2D↔3D remount) — so resizes after interaction don't re-fit, but every mode
 * switch starts fitted.
 *
 * Must be mounted inside the Canvas, after `<CameraController/>`.
 */
export const InitialCameraFit = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const sceneApi = useSceneStoreApi();

  // Metadata-only union box of the as-loaded scene, read ONCE per store scope
  // (the memo keys on the store api, and `layers` is still as-loaded when this
  // mounts). Non-reactive read: layer edits (clim, dims, affine…) must never
  // re-trigger the initial fit (P17 — a camera jump on every layer edit).
  //
  // Going stale when a layer is reconciled INTO a running scene is deliberate,
  // not an oversight: this is the INITIAL fit, and refitting because a layer
  // arrived is the camera jump above wearing a different hat. Leave it.
  const box = useMemo(
    () => computeSceneWorldBox(sceneApi.getState().layers),
    [sceneApi],
  );

  const interactedRef = useRef(false);
  const lastCameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    const events = controls as unknown as ControlsEvents | null;
    if (!events?.addEventListener) return;
    const onStart = () => {
      interactedRef.current = true;
    };
    events.addEventListener("start", onStart);
    return () => events.removeEventListener("start", onStart);
  }, [controls]);

  useLayoutEffect(() => {
    // A fresh camera (display-mode switch remounts the drei camera) re-arms
    // the fit even after interaction.
    if (camera !== lastCameraRef.current) {
      lastCameraRef.current = camera;
      interactedRef.current = false;
    }
    if (!box || interactedRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;

    const targetControls =
      controls && "target" in controls
        ? (controls as unknown as TargetControls)
        : null;
    applyFitToCamera(box, {
      camera,
      controls: targetControls,
      size: { width: size.width, height: size.height },
      invalidate,
    });
  }, [camera, controls, size.width, size.height, box, invalidate]);

  return null;
};
