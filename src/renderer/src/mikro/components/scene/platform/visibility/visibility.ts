import * as THREE from "three";
import { resolveAxisIndices } from "../model/dims";
import { affineToMatrix4 } from "../coords/worldTransform";
import {
  frustumBoxIntersectionAabb,
  type FrustumClipCoordinateSystem,
} from "./frustumClip";
import type { LayerState } from "../model/layerModel";

/**
 * Pure per-layer visibility computation: frustum-test every trackable and,
 * for image layers, derive the visible voxel ranges + screen-pixels-per-voxel
 * scale. Extracted from the old `VisibilityManager` component so the math is
 * unit-testable and the driver (`platform/visibility/visibilityTracker.ts`) is a plain
 * store subscription instead of a React effect.
 */

export interface LayerViewRange {
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number] | null;
  /** Screen pixels per image pixel (how many viewer pixels one voxel occupies) */
  scale: number;
}

/** Structural subset of viewerStore's TrackableObject. */
export type VisibilityTrackable = {
  kind: string;
  id: string;
  ref: { current?: THREE.Object3D | null };
};

export type SceneVisibilityInput = {
  projScreenMatrix: THREE.Matrix4;
  viewportSize: { width: number; height: number };
  trackables: Iterable<VisibilityTrackable>;
  layers: readonly LayerState[];
  /** NDC z convention of `projScreenMatrix` (see `CameraPose.coordinateSystem`).
   * Defaults to WebGL ([-1,1]); the production tracker passes the camera's
   * actual convention (WebGPU, [0,1]). */
  coordinateSystem?: number;
};

export type SceneVisibilityResult = {
  visibleIds: Set<string>;
  ranges: Record<string, LayerViewRange>;
};

// Preallocated scratch objects (single-threaded, one computation at a time).
// This runs once per camera write (~16/s during a zoom, where the 1% scale
// dead-band never saves the recompute), so it must not allocate per call.
const frustum = new THREE.Frustum();
const box = new THREE.Box3();
const voxelToClip = new THREE.Matrix4();
const localBox = new THREE.Box3();
const scaleP0 = new THREE.Vector3();
const scaleP1 = new THREE.Vector3();

export function computeSceneVisibility({
  projScreenMatrix,
  viewportSize,
  trackables,
  layers,
  coordinateSystem = THREE.WebGLCoordinateSystem,
}: SceneVisibilityInput): SceneVisibilityResult {
  frustum.setFromProjectionMatrix(
    projScreenMatrix,
    coordinateSystem as THREE.CoordinateSystem,
  );

  // O(1) layer lookup — `layers.find` inside the trackable loop was
  // O(trackables × layers) per camera tick.
  const layerById = new Map<string, LayerState>();
  for (const layer of layers) layerById.set(layer.id, layer);

  const visibleIds = new Set<string>();
  const ranges: Record<string, LayerViewRange> = {};

  for (const trackable of trackables) {
    const object = trackable.ref.current;
    if (!object) continue;

    box.setFromObject(object);
    if (!frustum.intersectsBox(box)) continue;

    visibleIds.add(trackable.id);
    if (trackable.kind !== "layer") continue;

    const layer = layerById.get(trackable.id);
    if (!layer) continue;

    const range = computeLayerViewRange(layer, projScreenMatrix, viewportSize, coordinateSystem);
    if (range) ranges[trackable.id] = range;
  }

  return { visibleIds, ranges };
}

/** `affineToMatrix4` allocates a Matrix4 per call; the raw affine array's
 * identity is stable across camera ticks (layers are replaced immutably on
 * edit), so cache per identity — this ran per layer per visibility recompute
 * (~17 Hz during a gesture). Null (identity affine) shares one constant. */
const affineMatrixCache = new WeakMap<number[][], THREE.Matrix4>();
const IDENTITY_AFFINE = new THREE.Matrix4();
const cachedAffineMatrix = (raw: number[][] | null | undefined): THREE.Matrix4 => {
  if (!raw) return IDENTITY_AFFINE;
  let matrix = affineMatrixCache.get(raw);
  if (!matrix) {
    matrix = affineToMatrix4(raw);
    affineMatrixCache.set(raw, matrix);
  }
  return matrix;
};

function computeLayerViewRange(
  layer: LayerState,
  projScreenMatrix: THREE.Matrix4,
  viewportSize: { width: number; height: number },
  coordinateSystem: number,
): LayerViewRange | null {
  const affine = cachedAffineMatrix(layer.affineMatrix);

  const { xPos: xIdx, yPos: yIdx, zPos: zIdx } = resolveAxisIndices(layer.lens.axisNames, layer);
  const xMax = xIdx >= 0 ? layer.lens.shape[xIdx] : 0;
  const yMax = yIdx >= 0 ? layer.lens.shape[yIdx] : 0;
  const zMax = layer.zAxis && zIdx >= 0 ? layer.lens.shape[zIdx] : 0;

  // Exact AABB of (frustum ∩ layer box), computed directly in voxel space —
  // the layer-local frame IS voxel space (corner-anchored, no flip,
  // COORDINATE_SYSTEMS.md "Coordinate conventions"), so `projScreen × affine`
  // maps voxels straight to clip space. This replaces the legacy double
  // AABB (world AABB of frustum corners → re-AABB through the inverse
  // affine), which under a perspective camera near/inside the volume
  // degenerated to ~the whole dataset and inflated further under tilt —
  // see frustumClip.ts for the failure modes this fixes.
  voxelToClip.multiplyMatrices(projScreenMatrix, affine);
  const hit = frustumBoxIntersectionAabb(
    voxelToClip,
    [0, 0, 0],
    [xMax, yMax, zMax],
    localBox,
    coordinateSystem as FrustumClipCoordinateSystem,
  );
  if (!hit) return null;

  const zRange: [number, number] | null = layer.zAxis
    ? [
        Math.max(0, Math.floor(localBox.min.z)),
        Math.min(zMax, Math.ceil(localBox.max.z)),
      ]
    : null;

  // Screen-pixels-per-image-pixel: transform two points 1 voxel apart
  // through affine + projection into screen space — anchored at the CENTER
  // of the visible voxel box, not the layer origin (under perspective the
  // origin can be far off-screen and misrepresent the on-screen density).
  const cx = (localBox.min.x + localBox.max.x) / 2;
  const cy = (localBox.min.y + localBox.max.y) / 2;
  const cz = (localBox.min.z + localBox.max.z) / 2;
  const p0 = scaleP0.set(cx, cy, cz).applyMatrix4(affine).applyMatrix4(projScreenMatrix);
  const p1 = scaleP1.set(cx + 1, cy, cz).applyMatrix4(affine).applyMatrix4(projScreenMatrix);
  const hw = viewportSize.width / 2;
  const hh = viewportSize.height / 2;
  const dx = (p1.x - p0.x) * hw;
  const dy = (p1.y - p0.y) * hh;
  const scale = Math.sqrt(dx * dx + dy * dy);

  return {
    xRange: [Math.max(0, Math.floor(localBox.min.x)), Math.min(xMax, Math.ceil(localBox.max.x))],
    yRange: [Math.max(0, Math.floor(localBox.min.y)), Math.min(yMax, Math.ceil(localBox.max.y))],
    zRange,
    scale,
  };
}

/** Value equality for a visible-id set against the store's string array. */
export function sameVisibleIds(previous: readonly string[], next: Set<string>): boolean {
  return previous.length === next.size && previous.every((id) => next.has(id));
}

/** Relative equality for the px-per-voxel scale (1% tolerance). */
function sameScale(a: number, b: number): boolean {
  const magnitude = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return Math.abs(a - b) <= 0.01 * magnitude;
}

/**
 * Value equality for two range maps (skip store writes when nothing changed).
 *
 * Every field is a planning input: the integer voxel ranges and `scale`.
 * `scale` jitters continuously during a 3D orbit, so it is compared with a 1%
 * relative tolerance (sub-1% wobble must not rewrite `layerViewRanges` per
 * camera tick). The cosmetic-only `viewportFraction` estimate that used to
 * ride along here was removed outright — it existed only for a sidebar badge
 * whose prop churn defeated the layer cards' memoization.
 */
export function sameViewRanges(
  previous: Record<string, LayerViewRange>,
  next: Record<string, LayerViewRange>,
): boolean {
  const previousKeys = Object.keys(previous);
  if (previousKeys.length !== Object.keys(next).length) return false;

  return previousKeys.every((key) => {
    const a = previous[key];
    const b = next[key];
    if (!b) return false;
    return (
      sameScale(a.scale, b.scale) &&
      a.xRange[0] === b.xRange[0] &&
      a.xRange[1] === b.xRange[1] &&
      a.yRange[0] === b.yRange[0] &&
      a.yRange[1] === b.yRange[1] &&
      (a.zRange === null) === (b.zRange === null) &&
      (a.zRange === null || (a.zRange[0] === b.zRange![0] && a.zRange[1] === b.zRange![1]))
    );
  });
}
