/**
 * The brush stroke as data: what the pointer painted, before any extraction.
 *
 * The gesture feeds samples at pointermove cadence, so the model's whole job
 * is hygiene — keep the stroke small and evenly spread without losing its
 * shape. Everything here is pure; the capture session
 * (`features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession.tsx`) owns the impure side.
 */

export type Vec3 = readonly [number, number, number];

export type BrushSample = {
  /** Scene world coordinates of the probed point. */
  world: Vec3;
  /** Level-0 voxel the probe landed on (for endpoint snapping). */
  voxel: Vec3;
};

/**
 * Append `sample` only when it adds information: the voxel changed, or the
 * pointer moved at least `minStepWorld` since the last kept sample. A
 * non-positive `minStepWorld` (radius not initialized yet) degrades to
 * voxel-change-only, never to keep-everything. Returns whether it was kept,
 * so the caller can skip repaints for dropped samples.
 */
export function appendSample(
  stroke: BrushSample[],
  sample: BrushSample,
  minStepWorld: number,
): boolean {
  const last = stroke[stroke.length - 1];
  if (last) {
    const voxelChanged =
      last.voxel[0] !== sample.voxel[0] ||
      last.voxel[1] !== sample.voxel[1] ||
      last.voxel[2] !== sample.voxel[2];
    const moved =
      minStepWorld > 0 &&
      Math.hypot(
        sample.world[0] - last.world[0],
        sample.world[1] - last.world[1],
        sample.world[2] - last.world[2],
      ) >= minStepWorld;
    if (!voxelChanged && !moved) return false;
  }
  stroke.push(sample);
  return true;
}

/**
 * The stroke's world polyline resampled to at most `maxPoints`, evenly spaced
 * BY ARC LENGTH. Even spacing matters twice over: the corridor is a union of
 * tubes around these points, so a cluster where the pointer lingered must not
 * fatten the corridor there; and the GPU kernel walks this list per voxel, so
 * its length is a real cost.
 *
 * Endpoints are always kept exactly — they seed and target the geodesic.
 */
export function resampleStroke(
  stroke: readonly BrushSample[],
  maxPoints: number,
): Vec3[] {
  const points = stroke.map((s) => s.world);
  if (points.length <= Math.max(2, maxPoints)) return points;

  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          points[i][0] - points[i - 1][0],
          points[i][1] - points[i - 1][1],
          points[i][2] - points[i - 1][2],
        ),
    );
  }
  const total = lengths[lengths.length - 1];
  if (total === 0) return [points[0], points[points.length - 1]];

  const out: Vec3[] = [];
  let cursor = 0;
  for (let k = 0; k < maxPoints; k += 1) {
    const target = (total * k) / (maxPoints - 1);
    while (cursor < lengths.length - 2 && lengths[cursor + 1] < target) {
      cursor += 1;
    }
    const span = lengths[cursor + 1] - lengths[cursor];
    const t = span > 0 ? (target - lengths[cursor]) / span : 0;
    const a = points[cursor];
    const b = points[cursor + 1];
    out.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
  return out;
}
