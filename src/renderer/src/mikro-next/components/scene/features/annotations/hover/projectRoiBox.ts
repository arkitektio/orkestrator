import * as THREE from "three";

import type { ZSpan } from "../annotationVisibility";
import type { RoiBounds } from "../roiSelectionStore";

/** A point on the viewport, in CSS pixels from the top-left. */
export interface ScreenPoint {
  x: number;
  y: number;
}

const CORNER = new THREE.Vector3();

/**
 * The screen position of a world box's MOST TOP-RIGHT corner: every corner
 * through the view-projection matrix (`applyMatrix4` does the perspective
 * divide), NDC → pixels, keep the one furthest toward the top-right of the
 * screen. An actual corner of the shape, not the corner of its screen
 * bounding box — for a perspective-rotated cube those differ, and the box's
 * corner floats in empty space away from the shape.
 *
 * Corners behind the camera (or past the far plane) are skipped rather than
 * failing the whole box; null only when none is in front.
 *
 * Pure and store-free; the overlay feeds it `viewStore.viewProjectionMatrix`
 * on every emission and writes the answer straight onto its DOM node (P17).
 */
export function projectTopRightCorner(
  bounds: RoiBounds,
  zSpan: ZSpan,
  viewProjection: THREE.Matrix4,
  viewport: { width: number; height: number },
): ScreenPoint | null {
  let best: ScreenPoint | null = null;
  let bestScore = -Infinity;
  const xs = [bounds.minX, bounds.maxX];
  const ys = [bounds.minY, bounds.maxY];
  const zs = zSpan.min === zSpan.max ? [zSpan.min] : [zSpan.min, zSpan.max];
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        CORNER.set(x, y, z).applyMatrix4(viewProjection);
        // A corner behind the eye divides by a negative w and lands mirrored
        // with NDC z past 1 — under both conventions (WebGPU [0, 1], WebGL
        // [-1, 1]); past the far plane reads the same. Skip it.
        if (!Number.isFinite(CORNER.x) || !Number.isFinite(CORNER.y) || CORNER.z > 1) {
          continue;
        }
        const px = (CORNER.x * 0.5 + 0.5) * viewport.width;
        const py = (-CORNER.y * 0.5 + 0.5) * viewport.height;
        // Screen top-right: large x, small y.
        const score = px - py;
        if (score > bestScore) {
          bestScore = score;
          best = { x: px, y: py };
        }
      }
    }
  }
  return best;
}

/** Margin the button keeps to the frame edge when the corner is off-screen. */
export const BUTTON_MARGIN = 8;

/**
 * Where the button's top-left goes so that its BOTTOM-LEFT sits exactly on
 * the anchor corner, slid inward only when that would leave the frame.
 */
export function buttonOriginFor(
  anchor: ScreenPoint,
  button: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  let left = anchor.x;
  let top = anchor.y - button.height;
  const maxLeft = Math.max(BUTTON_MARGIN, viewport.width - button.width - BUTTON_MARGIN);
  const maxTop = Math.max(BUTTON_MARGIN, viewport.height - button.height - BUTTON_MARGIN);
  left = Math.min(Math.max(left, BUTTON_MARGIN), maxLeft);
  top = Math.min(Math.max(top, BUTTON_MARGIN), maxTop);
  return { left, top };
}
