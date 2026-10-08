import { runStrokeExtraction } from "../brush";
import { median, resamplePolyline } from "./fit/polyline";
import { fitTube } from "./fit/radialProfile";
import type { Reconstructor } from "./registry";
import { worldSampler } from "./sampler";

/** Rays look this much further than the stroke's search radius: a structure
 * a little wider than the brush still gets measured rather than clipped. */
const SEARCH_REACH = 1.5;

/** Stations along the tube: enough for a smooth sweep, few enough that the
 * measurement and the swept stamp stay cheap however long the stroke was. */
const MAX_STATIONS = 96;

/**
 * Tube, fitted: the centerline through the stroke's corridor, a radius
 * measured at every station from the intensity falloff around it
 * (`fit/radialProfile`), and a round tube of that varying width swept along
 * it. The result is a model of the structure, not a copy of its noise.
 */
export const tubeFit: Reconstructor = {
  id: "tube-fit",
  gesture: "stroke",
  title: "Fitted",
  description: "A clean round tube: centerline from the data, width measured from the brightness falloff",
  sourceKind: "tube",
  async run({ gesture, extraction, settings, params, stale }) {
    const radiusWorld = settings.radiusWorld ?? 4 * Math.min(...extraction.voxelSize);
    const path = await runStrokeExtraction(extraction, gesture, {
      radiusWorld,
      weights: settings.weights,
      tau: settings.tubeThreshold,
      wantTube: false,
      marcher: settings.marcher,
      stale,
    });
    if (!path) return null;
    const { picked } = path;
    const finest = Math.min(...picked.spacing);
    const stations = resamplePolyline(path.points, Math.max(finest, radiusWorld / 4), MAX_STATIONS);
    const fit = await fitTube(
      stations,
      worldSampler(extraction, picked.level),
      {
        maxRadius: radiusWorld * SEARCH_REACH,
        step: finest / 2,
        edge: params.tubeEdge,
        smooth: params.tubeSmooth,
        scale: params.tubeScale,
        minRadius: finest / 2,
      },
      stale,
    );
    if (stale()) return null;
    if (!fit) {
      throw new Error(
        path.holes > 0
          ? "Could not measure the structure — data is still streaming in, try again"
          : "No edge found around the stroke — raise Radius, or use Surface",
      );
    }
    const typical = median(fit.radii);
    const notes = [...path.notes];
    if (fit.unresolved > fit.radii.length / 2) {
      notes.push(
        `Width measured at only ${fit.radii.length - fit.unresolved} of ${fit.radii.length} stations — the structure may be wider than Radius`,
      );
    }
    return {
      kind: "stamp",
      spec: { kind: "taperedChain", points: fit.centers, radii: fit.radii },
      // A quarter of the typical radius resolves a round cross-section; never
      // finer than half a voxel, which is all the measurement supports.
      spacing: Math.max(finest / 2, typical / 4),
      guide: fit.centers,
      level: picked.level,
      note: notes.length > 0 ? notes.join("; ") : undefined,
    };
  },
};
