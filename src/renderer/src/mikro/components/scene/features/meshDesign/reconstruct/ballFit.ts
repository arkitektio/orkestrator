import { fitBall } from "./fit/moments";
import type { Reconstructor } from "./registry";
import { autoThreshold, worldSampler } from "./sampler";

/** The object is followed this many search radii from the click at most. */
const SEARCH_REACH = 25;

/**
 * Ball, fitted: the sphere or oriented ellipsoid with the same centre and
 * second moments as the bright object under the click (`fit/moments`). A
 * model of the object — a nucleus, a vesicle, a soma — not its surface.
 */
export const ballFit: Reconstructor = {
  id: "ball-fit",
  gesture: "click",
  title: "Fitted",
  description: "A clean sphere or ellipsoid matched to the bright object under the click",
  sourceKind: "blob",
  async run({ gesture, extraction, settings, params, stale }) {
    const seed = gesture[0];
    const level = extraction.startLevel;
    const step = extraction.levelSteps[level] ?? [1, 1, 1];
    const cell = Math.min(
      extraction.voxelSize[0] * step[0],
      extraction.voxelSize[1] * step[1],
      extraction.voxelSize[2] * step[2],
    );
    const sample = worldSampler(extraction, level);
    let threshold = settings.tubeThreshold;
    if (params.autoThreshold) {
      const value = sample(seed.world[0], seed.world[1], seed.world[2]);
      if (value === null) {
        throw new Error("The clicked voxel is not loaded yet — let streaming settle and try again");
      }
      threshold = autoThreshold(value);
    }
    const fit = await fitBall(
      seed.world,
      sample,
      {
        cell,
        threshold,
        maxRadius: (settings.radiusWorld ?? 4 * cell) * SEARCH_REACH,
        shape: params.ballShape,
        scale: params.ballScale,
      },
      stale,
    );
    if (stale()) return null;
    if (!fit) {
      throw new Error(
        params.autoThreshold
          ? "Nothing bright under the click — click on the object itself"
          : "Nothing brighter than Wrap under the click — lower Wrap and try again",
      );
    }
    const smallest = Math.min(...fit.radii);
    return {
      kind: "stamp",
      spec: { kind: "orientedEllipsoid", center: fit.center, axes: fit.axes, radii: fit.radii },
      spacing: Math.max(cell / 2, smallest / 6),
      level,
      note: fit.closed ? undefined : "The object is larger than the search — the fit covers only the part that was read",
    };
  },
};
