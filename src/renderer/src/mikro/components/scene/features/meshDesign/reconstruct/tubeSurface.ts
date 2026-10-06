import { runStrokeExtraction } from "../brush";
import type { Reconstructor } from "./registry";

/**
 * Tube, surface: the intensity isosurface inside the stroke's corridor — the
 * structure exactly as the data shows it, bumps included.
 */
export const tubeSurface: Reconstructor = {
  id: "tube-surface",
  gesture: "stroke",
  title: "Surface",
  description: "The data's own surface along the stroke, at the Wrap threshold — faithful, bumpier",
  sourceKind: "tube",
  async run({ gesture, extraction, settings, stale }) {
    const radiusWorld = settings.radiusWorld ?? 4 * Math.min(...extraction.voxelSize);
    const result = await runStrokeExtraction(extraction, gesture, {
      radiusWorld,
      weights: settings.weights,
      tau: settings.tubeThreshold,
      wantTube: true,
      marcher: settings.marcher,
      // From 2 voxels of detail up, march a correspondingly coarser level.
      minSpacingWorld:
        settings.detailVoxels >= 2 ? settings.detailVoxels * Math.max(...extraction.voxelSize) : undefined,
      stale,
    });
    if (!result) return null;
    const { picked, tube, notes } = result;
    if (!tube || tube.triangles === 0) {
      throw new Error(
        notes.length > 0 ? notes.join("; ") : "Nothing brighter than Wrap along the stroke — lower Wrap and try again",
      );
    }
    return {
      kind: "surface",
      tube,
      spacing: picked.spacing,
      level: picked.level,
      note: notes.length > 0 ? notes.join("; ") : undefined,
    };
  },
};
