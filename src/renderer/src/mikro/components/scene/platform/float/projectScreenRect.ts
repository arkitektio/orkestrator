import * as THREE from "three";

/** A point on the viewport, in CSS pixels from the top-left. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** A rectangle on the viewport, in CSS pixels from the top-left. */
export interface ScreenRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type Vec3Like = { x: number; y: number; z: number };

/** A world-space box: `THREE.Box3` fits, and so does any `{ min, max }`. */
export interface WorldBox {
  min: Vec3Like;
  max: Vec3Like;
}

export type Viewport = { width: number; height: number };

const SCRATCH = new THREE.Vector3();

/**
 * One world point through the view-projection matrix, to CSS pixels. Null
 * when it is behind the eye or past the far plane: a point behind the eye
 * divides by a negative w and lands mirrored with NDC z past 1, under both
 * depth conventions (WebGPU [0, 1], WebGL [-1, 1]), and so does a point past
 * the far plane.
 */
export function projectToScreen(
  x: number,
  y: number,
  z: number,
  viewProjection: THREE.Matrix4,
  viewport: Viewport,
): ScreenPoint | null {
  SCRATCH.set(x, y, z).applyMatrix4(viewProjection);
  if (!Number.isFinite(SCRATCH.x) || !Number.isFinite(SCRATCH.y) || SCRATCH.z > 1) return null;
  return {
    x: (SCRATCH.x * 0.5 + 0.5) * viewport.width,
    y: (-SCRATCH.y * 0.5 + 0.5) * viewport.height,
  };
}

/**
 * The screen rectangle a world box covers: all eight corners through the
 * view-projection matrix, and their extent. Corners behind the eye are skipped
 * rather than failing the box; null only when none is in front.
 *
 * NOT clamped to the viewport. The float clamps where it reads the edge it
 * sits beside (`floatOriginBeside`), so a box half off-screen still reports
 * where it really goes.
 *
 * Pure and store-free: the float feeds it `viewStore.viewProjectionMatrix` on
 * every emission and writes the answer straight onto its node (P17).
 */
export function projectScreenRect(
  box: WorldBox,
  viewProjection: THREE.Matrix4,
  viewport: Viewport,
): ScreenRect | null {
  let rect: ScreenRect | null = null;
  const xs = box.min.x === box.max.x ? [box.min.x] : [box.min.x, box.max.x];
  const ys = box.min.y === box.max.y ? [box.min.y] : [box.min.y, box.max.y];
  const zs = box.min.z === box.max.z ? [box.min.z] : [box.min.z, box.max.z];
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        const point = projectToScreen(x, y, z, viewProjection, viewport);
        if (!point) continue;
        if (!rect) {
          rect = { minX: point.x, maxX: point.x, minY: point.y, maxY: point.y };
          continue;
        }
        rect.minX = Math.min(rect.minX, point.x);
        rect.maxX = Math.max(rect.maxX, point.x);
        rect.minY = Math.min(rect.minY, point.y);
        rect.maxY = Math.max(rect.maxY, point.y);
      }
    }
  }
  return rect;
}
