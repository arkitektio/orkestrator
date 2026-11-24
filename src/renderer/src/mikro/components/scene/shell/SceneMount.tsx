import type * as THREE from "three";
import { BrickSystemHost } from "../features/bricks/residency/BrickSystemHost";
import { BrickSystemProvider } from "../features/bricks/residency/BrickSystemProvider";
import { VolumeCompositor } from "../features/volume/VolumeCompositor";
import { CameraMatrixSync } from "../platform/camera/CameraMatrixSync";
import { SceneVolume } from "./SceneVolume";
import { WorldTimeHost } from "./WorldTimeHost";

/**
 * A scene's 3D layers inside ANOTHER canvas (a stage that mounts it), under `Scene.Provider`
 * and the host's group for it (`frame`).
 *
 * What the viewport sets up for drawing, and nothing of its own: the host owns the camera
 * and its controls, the input, the tone mapping and the chrome. Viewing only: drawing and
 * probing read world points and are left to the viewport. The camera is published in the
 * frame's local units, so the bricks are planned for what the host shows.
 *
 * One per canvas: the volume compositor takes over the canvas' render loop.
 */
export const SceneMount = ({ frame }: { frame: THREE.Object3D | null }) => (
  <>
    <BrickSystemHost />
    <WorldTimeHost />
    <CameraMatrixSync frame={frame} />
    <VolumeCompositor />
    <SceneVolume />
    <BrickSystemProvider />
  </>
);
