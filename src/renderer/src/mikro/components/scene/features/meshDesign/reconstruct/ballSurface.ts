import { runGrowLoop } from "../brush";
import type { Reconstructor } from "./registry";
import { autoThreshold, worldSampler } from "./sampler";

/**
 * Ball, surface: the isosurface of the bright structure CONNECTED to the
 * click, grown until it closes. With the automatic threshold it wraps at
 * half the clicked brightness; otherwise at the Wrap slider.
 */
export const ballSurface: Reconstructor = {
  id: "ball-surface",
  gesture: "click",
  title: "Surface",
  description: "The data's own surface around the click, grown until it closes — faithful, bumpier",
  sourceKind: "blob",
  async run({ gesture, extraction, settings, params, stale, publishLive }) {
    const seed = gesture[0];
    let tau = settings.tubeThreshold;
    if (params.autoThreshold) {
      const value = worldSampler(extraction, extraction.startLevel)(seed.world[0], seed.world[1], seed.world[2]);
      if (value === null) {
        throw new Error("The clicked voxel is not loaded yet — let streaming settle and try again");
      }
      tau = autoThreshold(value);
    }
    const outcome = await runGrowLoop(extraction, {
      seed,
      startRadius: settings.radiusWorld ?? 4 * Math.min(...extraction.voxelSize),
      weights: settings.weights,
      tau,
      smoothVoxels: Math.max(0, Math.floor(settings.blobSmoothness)),
      gapVoxels: Math.max(0, Math.floor(settings.blobGap)),
      minSpacingWorld:
        settings.detailVoxels >= 2 ? settings.detailVoxels * Math.max(...extraction.voxelSize) : undefined,
      marcher: settings.marcher,
      stale,
      publishLive,
    });
    if (stale()) return null;
    if (!outcome || outcome.tube.triangles === 0) {
      throw new Error(
        params.autoThreshold
          ? "Nothing as bright as the click around it — click a brighter spot, or turn Auto off"
          : "Nothing brighter than Wrap near the click — lower Wrap and try again",
      );
    }
    return {
      kind: "surface",
      tube: outcome.tube,
      spacing: outcome.spacing,
      level: outcome.level,
      note: outcome.closed
        ? undefined
        : "The surface still touches the search boundary — the structure may extend further",
    };
  },
};
