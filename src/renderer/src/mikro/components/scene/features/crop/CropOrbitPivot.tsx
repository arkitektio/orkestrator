import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cropOrbitCenter, repivotPreservingView } from "../../platform/camera/orbitPivot";
import { gatherLayerWorldBoxes } from "../../platform/visibility/layerBoxes";
import { useAnimationStoreApi } from "../../platform/stores/animationStore";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/** The controls surface a repivot needs (structural, as everywhere). */
type PivotControls = {
  target: THREE.Vector3;
  update: () => void;
  dispatchEvent?: (event: { type: string }) => void;
};

/**
 * Committing a crop box (`s` → three clicks, or Enter in the depth phase)
 * makes its center the center of the stage: the drawn content inside the
 * crop (`cropOrbitCenter`) becomes the orbit pivot and snaps to the screen
 * center, view direction and distance unchanged (`repivotPreservingView`),
 * so rotating turns the cropped region around itself. A jump, like the
 * double-click recenter. `PanScaleSync` gathers crop-clipped boxes, so its
 * retargets keep the pivot there.
 *
 * Fires on the commit edge only (`cropPhase` depth → idle with a box):
 * cancel and clear leave the camera alone. The probe pivot and a playing
 * animation own the target, as everywhere. 3D only (mounted by
 * `ThreeDScene`); the 2D camera does not rotate.
 */
export const CropOrbitPivot = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  const animationApi = useAnimationStoreApi();
  const modeApi = useModeStoreApi();

  useEffect(() => {
    const ctrl = controls && "target" in controls ? (controls as unknown as PivotControls) : null;
    if (!ctrl) return;

    const boxes: THREE.Box3[] = []; // pooled, per gather (layerBoxes contract)
    const center = new THREE.Vector3();

    let lastPhase = viewerApi.getState().cropPhase;
    return viewerApi.subscribe((state) => {
      const committed = lastPhase === "depth" && state.cropPhase === "idle" && state.cropBox !== null;
      lastPhase = state.cropPhase;
      if (!committed || !state.cropBox) return;
      if (modeApi.getState().pivotOnProbe) return; // the probe pivot owns the target
      if (animationApi.getState().playingId !== null) return; // the player owns the camera

      gatherLayerWorldBoxes(state.trackables, boxes, state.cropBox);
      cropOrbitCenter(state.cropBox, boxes, center);
      if (!repivotPreservingView({ camera, controls: ctrl }, center)) return;

      // The user took the wheel: arm InitialCameraFit's latch, paired so
      // `cameraInteraction` does not stick (as DoubleClickRecenter does).
      ctrl.dispatchEvent?.({ type: "start" });
      ctrl.dispatchEvent?.({ type: "end" });
      invalidate(); // frameloop="demand"
    });
  }, [camera, controls, invalidate, viewerApi, animationApi, modeApi]);

  return null; // Headless: a binding, not a control.
};
