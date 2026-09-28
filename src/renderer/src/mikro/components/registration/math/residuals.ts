/**
 * How well the CURRENT draft brings the landmarks together — as opposed to
 * `FitResult.residuals`, which describe a fit at the moment it was made. The
 * table shows these live, so nudging after a fit, or aligning by hand and then
 * dropping landmarks to CHECK the result, reads honestly.
 */
import { applyPoint, type Mat4, type Vec3 } from "./mat4";

export type ResidualLandmark = { id: number; fixed: Vec3 | null; moving: Vec3 | null };

export const landmarkResiduals = (
  landmarks: readonly ResidualLandmark[],
  delta: Mat4,
): { byId: Map<number, number>; rms: number | null } => {
  const byId = new Map<number, number>();
  let sum = 0;
  for (const landmark of landmarks) {
    if (!landmark.fixed || !landmark.moving) continue;
    const drawn = applyPoint(delta, landmark.moving);
    const distance = Math.hypot(
      drawn[0] - landmark.fixed[0],
      drawn[1] - landmark.fixed[1],
      drawn[2] - landmark.fixed[2],
    );
    byId.set(landmark.id, distance);
    sum += distance * distance;
  }
  return { byId, rms: byId.size ? Math.sqrt(sum / byId.size) : null };
};
