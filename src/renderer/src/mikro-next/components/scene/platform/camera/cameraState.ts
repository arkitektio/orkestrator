import * as THREE from "three";

import { AxisType } from "@/mikro-next/api/graphql";
import type { CameraStateFragment } from "@/mikro-next/api/graphql";
import type { DisplayMode } from "../stores/modeStore";
import type { LayerState } from "../model/layerModel";

/**
 * Camera pose ⇄ the server's `CameraState`.
 *
 * The server stores a pose as a position KEYED BY THE WORLD SYSTEM'S AXIS
 * NAMES, in that system's units, plus a per-view (flat / volumetric)
 * orientation+scale pair. Two things make the mapping non-trivial:
 *
 * 1. **Axis names, not a triple** (COORDINATE_SYSTEMS.md R3): an axis name is
 *    only meaningful within a CS, and a tour through a timelapse moves in `t`
 *    as much as in `z`. So the map carries the spatial axes AND the collapsed
 *    dim selections, and an axis the pose does not name is left wherever the
 *    viewer already had it.
 *
 * 2. **Three-space IS world space** (COORDINATE_SYSTEMS.md "Coordinate
 *    conventions"): every layer renders corner-anchored at its plain affine,
 *    so the three ⇄ world µm frame map is the identity. The `SceneCameraFrame`
 *    structure is kept (a future scene-root transform would slot in here);
 *    the matrices it carries are identity.
 */

/** The world-CS axis names three's x / y / z stand for (z null for 2D data). */
export type WorldSpatialAxes = { x: string; y: string; z: string | null };

/** The camera surface a capture/apply needs. Structurally a `CanvasContext`. */
export type CameraFrame = {
  camera: THREE.Camera;
  controls: { target: THREE.Vector3; update: () => void } | null;
  size: { width: number; height: number };
};

/**
 * What a pose is resolved against: the frame map and the axis naming. Built
 * once per scene by `resolveSceneCameraFrame` and threaded to every
 * capture/apply, so neither has to know how the frame was derived.
 */
export type SceneCameraFrame = {
  /** three-space → world µm. Null when no reference layer resolves. */
  sceneToWorld: THREE.Matrix4 | null;
  /** world µm → three-space (the inverse). Null with `sceneToWorld`. */
  worldToScene: THREE.Matrix4 | null;
  /** Null when the world system does not name the reference layer's axes. */
  axes: WorldSpatialAxes | null;
};

/**
 * three-space → world µm.
 *
 * Identity by construction: layers render corner-anchored at `affine(v)`,
 * which IS world µm — there is no client-side centering left to invert. The
 * function survives (rather than inlining identity at the call sites) so a
 * future scene-root transform has exactly one place to land.
 */
export const buildSceneToWorldMatrix = (_layer: LayerState): THREE.Matrix4 =>
  new THREE.Matrix4();

/**
 * The layer whose frame the scene's poses are expressed in: the first image
 * layer that names both spatial axes. Deliberately positional (not "largest",
 * not "selected") — the tour must resolve to the same frame on every open, and
 * layer order is the only thing stable across them.
 */
export const pickReferenceLayer = (
  layers: readonly LayerState[],
): LayerState | null =>
  layers.find((layer) => Boolean(layer.xAxis && layer.yAxis)) ?? null;

/**
 * The world axis names for three's x/y/z. Taken from the reference layer's
 * render axes and validated against the world system's SPACE axes: composition
 * (`@/mikro-next/lib/coords/transformGraph.ts` `evalTransform`) already assumes a spatial axis
 * keeps its name from the lens through to the world, and this is where that
 * assumption is checked rather than trusted. Null when it does not hold — the
 * pose then carries no spatial axes instead of guessing.
 */
export const resolveWorldSpatialAxes = (
  world: { axes: readonly { name: string; type: AxisType }[] },
  reference: LayerState | null,
): WorldSpatialAxes | null => {
  if (!reference) return null;
  const spatial = new Set(
    world.axes.filter((axis) => axis.type === AxisType.Space).map((a) => a.name),
  );
  const { xAxis, yAxis, zAxis } = reference;
  if (!xAxis || !yAxis || !spatial.has(xAxis) || !spatial.has(yAxis)) return null;
  return { x: xAxis, y: yAxis, z: zAxis && spatial.has(zAxis) ? zAxis : null };
};

/** Resolve the whole frame for a scene, once, from its world CS and layers. */
export const resolveSceneCameraFrame = (
  world: { axes: readonly { name: string; type: AxisType }[] },
  layers: readonly LayerState[],
): SceneCameraFrame => {
  const reference = pickReferenceLayer(layers);
  const axes = resolveWorldSpatialAxes(world, reference);
  if (!reference) return { sceneToWorld: null, worldToScene: null, axes };
  const sceneToWorld = buildSceneToWorldMatrix(reference);
  const worldToScene = sceneToWorld.clone().invert();
  return { sceneToWorld, worldToScene, axes };
};

/** Distance from the target that makes a perspective camera show `scale`. */
export const perspectiveScaleToDistance = (
  scale: number,
  fovDegrees: number,
  viewportHeight: number,
): number =>
  (scale * Math.max(viewportHeight, 1)) /
  (2 * Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2));

/**
 * World units per screen pixel for a perspective camera at `distance` FROM THE
 * TARGET.
 *
 * Deliberately distance-to-target, where `platform/probe/probeWorld.ts`
 * `computeWorldUnitsPerPixel` uses distance-to-ORIGIN. The two agree only for
 * an origin-centred scene, and they answer different questions: the probe/
 * ScaleBar one describes what is under the cursor right now, while a stored
 * `projectionScale` has to reproduce a FRAMING — how much of the subject fills
 * the viewport — which is a fact about the camera's distance from what it
 * orbits. Round-tripping through the origin-based one would move the camera
 * whenever the tour's subject is off-centre.
 */
export const perspectiveDistanceToScale = (
  distance: number,
  fovDegrees: number,
  viewportHeight: number,
): number =>
  (2 * Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2) * distance) /
  Math.max(viewportHeight, 1);

const isOrtho = (camera: THREE.Camera): camera is THREE.OrthographicCamera =>
  (camera as THREE.OrthographicCamera).isOrthographicCamera === true;

/** The point the camera orbits: the controls' target, or the camera itself. */
const readTarget = (frame: CameraFrame): THREE.Vector3 =>
  frame.controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);

/**
 * What the viewer holds outside the camera but inside the pose.
 *
 * `currentZ` is the flat view's SLICE, and it is already world µm — the
 * ZSlider works in `voxelToPhysicalZ` space, i.e. the layer affine applied to
 * a voxel z with no centering, which is exactly the world z this pose stores.
 * So in 2D the z axis of a pose is the slice, not the camera target: an
 * orthographic camera looking down z does not change what it shows when its
 * target's z moves, and a flat tour through a stack is a tour through slices.
 */
export type ViewerPose = {
  /** Collapsed dim selections (`viewerStore.dimSelections`), keyed by name. */
  dimSelections?: Record<string, number>;
  /** `viewerStore.currentZ` — world µm. Only meaningful in 2D. */
  currentZ?: number;
};

/**
 * Capture the live camera as a `CameraState`.
 *
 * Only the pair for the CURRENTLY DISPLAYED view is filled; the other stays
 * null, which the schema defines as "leave it to the viewer" — a 2D-authored
 * stop must not claim to know the volumetric orientation it never had.
 */
export const captureCameraState = (
  frame: CameraFrame,
  displayMode: DisplayMode,
  scene: SceneCameraFrame,
  viewer: ViewerPose = {},
): CameraStateFragment => {
  const position: Record<string, number> = { ...viewer.dimSelections };

  if (scene.axes && scene.sceneToWorld) {
    const world = readTarget(frame).applyMatrix4(scene.sceneToWorld);
    position[scene.axes.x] = world.x;
    position[scene.axes.y] = world.y;
    if (scene.axes.z) {
      position[scene.axes.z] =
        displayMode === "2D" && typeof viewer.currentZ === "number"
          ? viewer.currentZ
          : world.z;
    }
  }

  const orientation = frame.camera.quaternion.toArray() as number[];
  const state: CameraStateFragment = {
    position,
    crossSectionOrientation: null,
    crossSectionScale: null,
    projectionOrientation: null,
    projectionScale: null,
  };

  if (displayMode === "2D") {
    state.crossSectionOrientation = orientation;
    state.crossSectionScale = isOrtho(frame.camera) ? 1 / frame.camera.zoom : null;
    return state;
  }

  state.projectionOrientation = orientation;
  if (!isOrtho(frame.camera)) {
    const persp = frame.camera as THREE.PerspectiveCamera;
    const distance = persp.position.distanceTo(readTarget(frame));
    state.projectionScale = perspectiveDistanceToScale(
      distance,
      persp.fov,
      frame.size.height,
    );
  }
  return state;
};

/**
 * The non-spatial entries of a pose: everything the position names that is not
 * one of the three render axes — the collapsed dim selections (`t`, `tau`, …).
 * Indices, so they round.
 */
export const readDimSelections = (
  state: Pick<CameraStateFragment, "position">,
  axes: WorldSpatialAxes | null,
): Record<string, number> => {
  // Called per frame while a tour plays: no Set / entries-array allocation.
  const ax = axes?.x ?? null;
  const ay = axes?.y ?? null;
  const az = axes?.z ?? null;
  const out: Record<string, number> = {};
  const position = (state.position ?? {}) as Record<string, unknown>;
  for (const name in position) {
    if (name === ax || name === ay || name === az) continue;
    const value = position[name];
    if (typeof value !== "number") continue;
    out[name] = Math.round(value);
  }
  return out;
};

const readAxis = (
  state: Pick<CameraStateFragment, "position">,
  name: string | null | undefined,
): number | null => {
  if (!name) return null;
  const value = (state.position ?? {})[name as keyof typeof state.position];
  return typeof value === "number" ? value : null;
};

/**
 * The world µm z a pose names — the flat view's slice (`viewerStore.currentZ`).
 * Null when the pose does not name z, or the scene has no z axis.
 */
export const readSceneZ = (
  state: Pick<CameraStateFragment, "position">,
  axes: WorldSpatialAxes | null,
): number | null => readAxis(state, axes?.z);

/**
 * The three-space target a pose asks for, starting from where the camera
 * already is: axes the position does not name keep their current value, per
 * the schema's "left wherever the viewer already had them". Done in WORLD
 * space (current target → world, override named axes, back to three) so a
 * partially-named pose composes correctly rather than mixing frames.
 *
 * In 2D the pose's z is the SLICE (see `ViewerPose`), so it is deliberately
 * not applied to the target here — `readSceneZ` feeds it to the ZSlider.
 */
export const resolveTargetForState = (
  state: Pick<CameraStateFragment, "position">,
  frame: CameraFrame,
  scene: SceneCameraFrame,
  displayMode: DisplayMode = "3D",
): THREE.Vector3 => {
  const current = readTarget(frame);
  if (!scene.axes || !scene.sceneToWorld || !scene.worldToScene) return current;

  const world = current.clone().applyMatrix4(scene.sceneToWorld);
  const x = readAxis(state, scene.axes.x);
  const y = readAxis(state, scene.axes.y);
  const z = displayMode === "2D" ? null : readAxis(state, scene.axes.z);
  if (x !== null) world.x = x;
  if (y !== null) world.y = y;
  if (z !== null) world.z = z;

  return world.applyMatrix4(scene.worldToScene);
};

/**
 * Drive the live camera to a pose. Only the fields the state actually carries
 * are applied — a null orientation/scale leaves that aspect untouched, so
 * playing a 2D-authored tour in the volumetric view moves the target without
 * wrenching the orientation to something never authored.
 */
export const applyCameraState = (
  state: CameraStateFragment,
  frame: CameraFrame,
  displayMode: DisplayMode,
  scene: SceneCameraFrame,
): void => {
  const { camera, controls } = frame;
  const target = resolveTargetForState(state, frame, scene, displayMode);

  const orientation =
    displayMode === "2D" ? state.crossSectionOrientation : state.projectionOrientation;
  const scale = displayMode === "2D" ? state.crossSectionScale : state.projectionScale;

  if (orientation?.length === 4) {
    camera.quaternion.fromArray(orientation as [number, number, number, number]);
  }

  // Distance is a property of the VIEW, not of the pose: an ortho camera's
  // framing is its zoom, so its distance only has to stay off the near plane —
  // keep whatever it had. A perspective camera's framing IS the distance.
  let distance = camera.position.distanceTo(target);
  if (isOrtho(camera)) {
    if (typeof scale === "number" && scale > 0) {
      camera.zoom = 1 / scale;
      camera.updateProjectionMatrix();
    }
  } else if (typeof scale === "number" && scale > 0) {
    distance = perspectiveScaleToDistance(
      scale,
      (camera as THREE.PerspectiveCamera).fov,
      frame.size.height,
    );
  }

  // A camera looks down its local -Z, so its eye sits at target + (+Z · d).
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  camera.position.copy(target).addScaledVector(back, distance || 1);

  if (controls) {
    controls.target.copy(target);
    controls.update();
  }
};
