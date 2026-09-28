/**
 * "Fit to fixed": a starting delta that brings the moving layer's box onto the
 * fixed one.
 *
 * Exists for the freshly seeded registration — an identity edge between a
 * pixel grid and a µm world puts a 2048-px image at 2048 µm, or 200× too
 * large, and the first thing the user would have to do is hunt for it. This is
 * a coarse start to refine from, not a registration, which is why it only ever
 * translates and scales uniformly: it never rotates and never distorts.
 */
import { aboutPivot, mul, scaling, translation, type Mat4, type Vec3 } from "./mat4";
import type { Constraint } from "./constraints";

export type Box = { min: Vec3; max: Vec3 };

export const boxCenter = (box: Box): Vec3 => [
  (box.min[0] + box.max[0]) / 2,
  (box.min[1] + box.max[1]) / 2,
  (box.min[2] + box.max[2]) / 2,
];

export const boxSize = (box: Box): Vec3 => [
  box.max[0] - box.min[0],
  box.max[1] - box.min[1],
  box.max[2] - box.min[2],
];

export const unionBoxes = (boxes: readonly Box[]): Box | null => {
  if (!boxes.length) return null;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes)
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], box.min[i]);
      max[i] = Math.max(max[i], box.max[i]);
    }
  return { min, max };
};

export const fitDelta = (moving: Box, fixed: Box, constraint: Constraint): Mat4 => {
  const from = boxCenter(moving);
  const to = boxCenter(fixed);
  const move = translation([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
  if (constraint === "rigid") return move;

  // "Contain": the largest uniform factor that keeps the moving box inside the
  // fixed one, over the axes both actually extend along (a 2D layer's zero z
  // extent says nothing about scale).
  const movingSize = boxSize(moving);
  const fixedSize = boxSize(fixed);
  let factor = Infinity;
  for (let i = 0; i < 3; i++) {
    if (movingSize[i] > 1e-12 && fixedSize[i] > 1e-12) {
      factor = Math.min(factor, fixedSize[i] / movingSize[i]);
    }
  }
  if (!Number.isFinite(factor) || factor <= 0) return move;
  return mul(move, aboutPivot(scaling([factor, factor, factor]), from));
};
