import type { ExtractionContext } from "../brush";
import type { IntensitySampler } from "./fit/radialProfile";

/**
 * The layer's intensity as a function of WORLD position, normalized through
 * the same clim window the extraction's cost field uses (0 = window floor,
 * 1 = ceiling) — what the fitted reconstructors measure. Nearest-voxel reads
 * of whatever is resident at `level` (or coarser, `sampleResident`'s walk);
 * null outside the layer and where nothing is loaded.
 */
export function worldSampler(extraction: ExtractionContext, level: number): IntensitySampler {
  const m = extraction.inverse.elements;
  const { min, max } = extraction.engineContext.window;
  const range = max - min;
  const { shape } = extraction;
  const channel = extraction.engineContext.channel;
  const sampleResident = extraction.engineContext.sampleResident;
  return (x, y, z) => {
    // World → level-0 voxel index: integer indices are sample centers (the
    // map `centerlineToWorld` inverts), so the nearest sample is a round.
    const vx = Math.round(m[0] * x + m[4] * y + m[8] * z + m[12]);
    const vy = Math.round(m[1] * x + m[5] * y + m[9] * z + m[13]);
    const vz = Math.round(m[2] * x + m[6] * y + m[10] * z + m[14]);
    if (vx < 0 || vy < 0 || vz < 0 || vx >= shape[0] || vy >= shape[1] || vz >= shape[2]) return null;
    const raw = sampleResident([vx, vy, vz], level, channel);
    if (raw === null || !(range > 0)) return null;
    return Math.min(1, Math.max(0, (raw - min) / range));
  };
}

/**
 * The automatic threshold of the click reconstructors: half the clicked
 * voxel's own brightness — the half-maximum edge of a blurred object, with
 * no slider to tune. Floored so a click on near-black still means something.
 */
export const autoThreshold = (seedIntensity: number): number => Math.max(0.02, seedIntensity * 0.5);
