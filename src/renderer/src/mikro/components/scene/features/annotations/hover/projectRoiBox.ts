import type * as THREE from "three";

import { projectToScreen, type ScreenPoint } from "../../../platform/float/projectScreenRect";
import type { ZSpan } from "../annotationVisibility";
import type { RoiBounds } from "../roiSelectionStore";

export type { ScreenPoint };

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
        // A corner behind the eye (or past the far plane) is skipped.
        const corner = projectToScreen(x, y, z, viewProjection, viewport);
        if (!corner) continue;
        const px = corner.x;
        const py = corner.y;
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

/**
 * The screen position of one world point, or null when it is behind the
 * camera or past the far plane (the same rule the corners above follow).
 */
export function projectWorldPoint(
  point: readonly [number, number, number],
  viewProjection: THREE.Matrix4,
  viewport: { width: number; height: number },
): ScreenPoint | null {
  return projectToScreen(point[0], point[1], point[2], viewProjection, viewport);
}

/**
 * How far up-right of the pointer's entry point the button sits: clear of
 * the cursor and of the stroke under it (a right-click on the shape must
 * still land on the shape), yet a few pixels' travel away.
 */
export const BUTTON_POINTER_OFFSET_PX = 12;

export { BUTTON_MARGIN, buttonOriginFor, cardOriginFor } from "../../../platform/float/pointAnchor";
