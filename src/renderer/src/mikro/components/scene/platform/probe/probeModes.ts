import { ProjectionMode } from "@/mikro/api/graphql";
import type { ProbeMode, ResolvedProbeStrategy } from "./probeTypes";

/**
 * Auto-dispatch of the user's probe mode onto a march strategy. "Auto" picks
 * the strategy that matches what the layer's projection actually shows on
 * screen, so the probed point is the point the user is looking at.
 */

/**
 * The GPU isosurface extracts at a fixed normalized 0.5 (the `isoThreshold`
 * uniform in brickNodeMaterials.ts) — the iso probe uses the same value so
 * the CPU hit lands on the rendered surface.
 */
export const ISO_PROBE_THRESHOLD = 0.5;

export function resolveProbeStrategy(
  mode: ProbeMode,
  projection: ProjectionMode | undefined,
  userThreshold: number,
): { strategy: ResolvedProbeStrategy; threshold: number } {
  if (mode !== "auto") {
    return { strategy: mode, threshold: userThreshold };
  }
  switch (projection) {
    case ProjectionMode.Mip:
    case ProjectionMode.AttenuatedMip:
      return { strategy: "max", threshold: userThreshold };
    case ProjectionMode.Isosurface:
      return { strategy: "first-hit", threshold: ISO_PROBE_THRESHOLD };
    case ProjectionMode.Volume:
      return { strategy: "volume-accum", threshold: userThreshold };
    default:
      return { strategy: "first-hit", threshold: userThreshold };
  }
}
