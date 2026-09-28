import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { repivotPreservingView } from "../../platform/camera/orbitPivot";
import { nearestChordMidpointAlongRay } from "../../platform/camera/panScale";
import { gatherLayerWorldBoxes } from "../../platform/visibility/layerBoxes";
import { useAnimationStoreApi } from "../../platform/stores/animationStore";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/** The controls surface a recenter needs (structural, as everywhere). */
type RecenterControls = {
  target: THREE.Vector3;
  update: () => void;
  dispatchEvent?: (event: { type: string }) => void;
};

/**
 * Double-click in NAVIGATE recenters the view on the point under the cursor
 * and makes it the orbit pivot: the clicked content snaps to the screen
 * center with the view direction and distance unchanged
 * (`repivotPreservingView` — the target always sits on the view axis, so the
 * preserved camera-relative offset lands the point exactly where the old
 * target was on screen: the center).
 *
 * The point is resolved GEOMETRICALLY — cursor ray ∩ the nearest layer box,
 * chord midpoint (`nearestChordMidpointAlongRay`: the box the user pointed
 * at beats any union math). Not via the probe: the P20 gate unarms probing
 * entirely in NAVIGATE (`platform/probe/probeGating.ts`), so `probedCoordinate`
 * is stale there.
 *
 * A DOM "dblclick" on the canvas element, headless component mounted with
 * the 3D scene (display-mode gating is structural — `ThreeDScene` only
 * renders in 3D). R3F's own dblclick path needs an object with a handler
 * under the cursor, which NAVIGATE deliberately has none of; ANNOTATE's
 * polygon-closing double-click (`RoiDrawer`) is excluded by the mode guard.
 * Every store read is event-time getState() (P17).
 */
export const DoubleClickRecenter = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  const animationApi = useAnimationStoreApi();
  const modeApi = useModeStoreApi();

  useEffect(() => {
    const ctrl =
      controls && "target" in controls ? (controls as unknown as RecenterControls) : null;
    if (!ctrl) return;

    const raycaster = new THREE.Raycaster(); // locally owned — not R3F's shared one
    const ndc = new THREE.Vector2();
    const boxes: THREE.Box3[] = []; // pooled, per gather (layerBoxes contract)
    const world = new THREE.Vector3();

    const onDoubleClick = (event: MouseEvent) => {
      if (modeApi.getState().interactionMode !== "NAVIGATE") return;
      if (modeApi.getState().pivotOnProbe) return; // the probe pivot owns the target
      if (animationApi.getState().playingId !== null) return; // the player owns the camera

      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);

      gatherLayerWorldBoxes(viewerApi.getState().trackables, boxes);
      const depth = nearestChordMidpointAlongRay(
        raycaster.ray.origin,
        raycaster.ray.direction,
        boxes,
        Number.NaN,
      );
      if (!Number.isFinite(depth) || !(depth > 0)) return; // background double-click

      world.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, depth);
      if (!repivotPreservingView({ camera, controls: ctrl }, world)) return;

      // The user took the wheel: arm InitialCameraFit's latch (claimCamera
      // pattern — its listener only hears real pointer gestures otherwise).
      // Paired with "end" so `cameraInteraction` (latched via onStart/onEnd)
      // does not stick true for the session.
      ctrl.dispatchEvent?.({ type: "start" });
      ctrl.dispatchEvent?.({ type: "end" });
      invalidate(); // frameloop="demand"
    };

    gl.domElement.addEventListener("dblclick", onDoubleClick);
    return () => gl.domElement.removeEventListener("dblclick", onDoubleClick);
  }, [camera, controls, gl, invalidate, viewerApi, animationApi, modeApi]);

  return null; // Headless: a binding, not a control.
};
