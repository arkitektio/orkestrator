import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { sampleTour } from "../../platform/camera/animation";
import { applyCameraState, readDimSelections, readSceneZ } from "../../platform/camera/cameraState";
import { useAnimationStore, useAnimationStoreApi } from "../../platform/stores/animationStore";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

type TargetControls = { target: THREE.Vector3; update: () => void };

/**
 * Drives the camera along the playing tour.
 *
 * The only thing in the scene that turns a sampled pose into motion — all the
 * timing and interpolation is pure, in `platform/camera/animation.ts`. Store reads go
 * through the non-reactive `…StoreApi` escape hatch because this runs in a
 * `useFrame`: subscribing to `elapsedMs` would re-render the React tree at
 * frame rate (P17).
 *
 * Must be mounted inside the Canvas, after `<CameraController/>`.
 */
export const AnimationPlayer = () => {
  const playingId = useAnimationStore((s) => s.playingId);
  const animationApi = useAnimationStoreApi();
  const modeApi = useModeStoreApi();
  const viewerApi = useViewerStoreApi();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // The Canvas is `frameloop="demand"`: with a settled camera nothing asks for
  // a frame, so without this kick the tour would never take its first step and
  // `useFrame` would never run to ask for the next one.
  useEffect(() => {
    if (playingId) invalidate();
  }, [playingId, invalidate]);

  // Per-frame scratch: the playing animation resolved once per `playingId`
  // (not a list scan per frame) and a reused camera-apply context.
  const frameScratch = useRef({
    playingId: null as string | null,
    animation: null as
      | ReturnType<typeof animationApi.getState>["animations"][number]
      | null,
    context: { camera, controls: null as TargetControls | null, size: { width: 0, height: 0 } },
  });

  useFrame((_, delta) => {
    const state = animationApi.getState();
    if (!state.playingId) return;
    const scratch = frameScratch.current;
    if (scratch.playingId !== state.playingId) {
      scratch.playingId = state.playingId;
      scratch.animation = state.animations.find((a) => a.id === state.playingId) ?? null;
    }
    const animation = scratch.animation;
    if (!animation) return;

    // Read the clock back after advancing: `advance` clamps to the tour's end
    // (and clears `playingId`), so this settles exactly on the final pose
    // instead of wherever the last frame's delta overshot to.
    state.advance(delta * 1000);
    const pose = sampleTour(animation.waypoints, animationApi.getState().elapsedMs);
    if (!pose) return;

    const displayMode = modeApi.getState().displayMode;
    const targetControls =
      controls && "target" in controls ? (controls as unknown as TargetControls) : null;

    const context = scratch.context;
    context.camera = camera;
    context.controls = targetControls;
    context.size.width = size.width;
    context.size.height = size.height;
    applyCameraState(pose, context, displayMode, state.frame);

    const viewer = viewerApi.getState();
    // In 2D the pose's z is the slice, not the target (see platform/camera/cameraState.ts).
    const sliceZ = readSceneZ(pose, state.frame.axes);
    if (displayMode === "2D" && sliceZ !== null) viewer.setCurrentZ(sliceZ);
    const dims = readDimSelections(pose, state.frame.axes);
    for (const dim in dims) {
      viewer.setDimSelection(dim, dims[dim]);
    }

    // Keep the demand loop turning for the next step.
    if (animationApi.getState().playingId) invalidate();
  });

  return null;
};
