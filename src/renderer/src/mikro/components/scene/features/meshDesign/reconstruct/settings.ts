import type { BrushSkeletonState } from "../brush";
import type { ReconstructorId, ReconstructParams } from "../store/meshDesignStore";

/**
 * The slice of the brush store a reconstruction depends on — the knobs the
 * capture shares with ANNOTATE's brush (search radius, wrap threshold,
 * surface quality). Taken as a plain snapshot so a reconstructor never holds
 * the live store.
 */
export type ReconstructSettings = Pick<
  BrushSkeletonState,
  | "radiusWorld"
  | "weights"
  | "tubeThreshold"
  | "detailVoxels"
  | "marcher"
  | "polishIterations"
  | "blobSmoothness"
  | "blobGap"
>;

export const settingsOf = (brush: BrushSkeletonState): ReconstructSettings => ({
  radiusWorld: brush.radiusWorld,
  weights: brush.weights,
  tubeThreshold: brush.tubeThreshold,
  detailVoxels: brush.detailVoxels,
  marcher: brush.marcher,
  polishIterations: brush.polishIterations,
  blobSmoothness: brush.blobSmoothness,
  blobGap: brush.blobGap,
});

/**
 * Everything a candidate was built from, as one comparable string: the panel
 * re-runs the candidate when the live key stops matching the one it carries.
 */
export const reconstructKey = (
  reconstructorId: ReconstructorId,
  settings: ReconstructSettings,
  params: ReconstructParams,
): string => JSON.stringify([reconstructorId, settings, params]);
