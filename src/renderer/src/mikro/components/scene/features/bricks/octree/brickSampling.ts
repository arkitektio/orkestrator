import type { Vec3 } from "../../../platform/coords/levelGeometry";
import type { ResolvedProbeStrategy } from "../../../platform/probe/probeTypes";

/**
 * CPU raymarch over the resident brick set — the probe-side mirror of the
 * GPU raymarcher, in lockstep with its normalization (minValue/maxValue →
 * clim window → gamma; opacity 1). The sampler is injected so the math stays
 * pure and unit-testable (`BrickResidencyManager.sampleResident` in the app).
 */

export type ResidentSampler = (
  baseVoxel: Vec3,
  desiredLevel: number,
  channel: number,
) => number | null;

export type ProbeMarchStrategy = ResolvedProbeStrategy;

export type ProbeMarchHit = {
  /** Local unit-box hit position, clamped to [-0.5, 0.5]³. */
  position: Vec3;
  /** Ray parameter of the hit. */
  t: number;
  /** Raw sample value at the hit. */
  rawValue: number;
  /** Shader-lockstep normalized value at the hit. */
  normalized: number;
  /**
   * True when the strategy's own criterion never fired and this is the
   * COVERAGE FALLBACK: the strongest visible sample along the ray. Without
   * it, first-hit/gradient/volume-accum answer null over most of a sparse
   * or dim volume and the cursor only "works" in tiny dense spots — a probe
   * should report what is under the cursor wherever anything is rendered.
   */
  fallback?: boolean;
};

export type MarchResidentBricksInput = {
  /** Ray origin in local unit-box coords ([-0.5, 0.5]³, y up). */
  origin: Vec3;
  /** Normalized local ray direction. */
  direction: Vec3;
  /** Entry/exit distances from `intersectLocalVolumeBox`. */
  bounds: [number, number];
  baseShape: Vec3;
  desiredLevel: number;
  channel: number;
  minValue: number;
  maxValue: number;
  climMin: number;
  climMax: number;
  gamma?: number;
  /** Normalized-visibility threshold (used by the "first-hit" strategy). */
  threshold: number;
  sample: ResidentSampler;
  steps?: number;
  /** Hit-selection strategy along the ray; defaults to "first-hit". */
  strategy?: ProbeMarchStrategy;
};

/**
 * Scales normalized visibility into per-step opacity for the "volume-accum"
 * strategy. A documented visual approximation of the shader's
 * opacity-corrected front-to-back accumulation (colormap alpha is not
 * consulted — see features/bricks/shaderspec/opacityCorrection.ts for the real transfer math).
 */
export const VOLUME_ACCUM_GAIN = 4;

const clamp01 = (v: number): number => Math.min(Math.max(v, -0.5), 0.5);

const clampLocal3 = (x: number, y: number, z: number): Vec3 => [
  clamp01(x),
  clamp01(y),
  clamp01(z),
];

/**
 * March the ray and pick a hit according to `strategy`:
 * - "first-hit": first sample whose normalized visibility exceeds `threshold`
 *   (early-out — the follow-cursor probe hot path).
 * - "max": argmax of normalized visibility over the full ray (matches what
 *   MIP projection shows; no threshold).
 * - "gradient": strongest |Δnormalized| between consecutive RESIDENT samples
 *   (a pair spanning an unresident gap is skipped — a residency edge is not
 *   a data edge); hit at the pair midpoint, value of the far sample.
 * - "volume-accum": front-to-back transmittance accumulation; hit where
 *   accumulated opacity crosses 0.5 (median opacity depth, early-out).
 *
 * When the strategy's criterion never fires but the ray DID cross visible
 * data, the strongest visible sample is returned with `fallback: true`
 * instead of null — the cursor probes wherever anything is rendered. Only a
 * ray through pure background (normalized 0 everywhere) answers null.
 */
export function marchResidentBricks({
  origin,
  direction,
  bounds,
  baseShape,
  desiredLevel,
  channel,
  minValue,
  maxValue,
  climMin,
  climMax,
  gamma = 1,
  threshold,
  sample,
  steps = 256,
  strategy = "first-hit",
}: MarchResidentBricksInput): ProbeMarchHit | null {
  const [tNear, tFar] = bounds;
  if (tFar <= tNear) return null;
  const delta = (tFar - tNear) / steps;

  // Accumulators for the non-early-out strategies.
  let best: ProbeMarchHit | null = null; // "gradient"
  let bestEdge = 0; // "gradient"
  let prev: { t: number; normalized: number } | null = null;
  let accumulated = 0; // "volume-accum"
  /** Strongest visible sample anywhere on the ray — "max"'s answer and every
   * other strategy's coverage fallback. */
  let strongest: ProbeMarchHit | null = null;

  // The march runs ≤256 steps per hover FRAME: keep the per-step position and
  // base-voxel in a reused scratch (samplers read it synchronously and must
  // not retain it); arrays are only allocated when a hit is actually stored.
  const baseVoxelScratch: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < steps; i++) {
    const t = tNear + i * delta;
    const px = origin[0] + direction[0] * t;
    const py = origin[1] + direction[1] * t;
    const pz = origin[2] + direction[2] * t;

    // Unit-box local ([-0.5,0.5]) → base voxel. Corner-anchored, NO FLIP on any
    // axis — this must stay byte-for-byte the shader's `toBaseVoxel`
    // (`features/bricks/gpu/brickNodeMaterials.ts`) and the unflipped `voxelIndex`
    // that `BrickVolumeLayer.probeFromRay` reports, or the probe measures a
    // different voxel from the one it renders and names. y carried a flip until
    // the 2026-08-15 pass removed it from both shaders (COORDINATE_SYSTEMS.md
    // §0) and missed this mirror; the Y-axis tests exist to keep it gone.
    baseVoxelScratch[0] = (px + 0.5) * baseShape[0];
    baseVoxelScratch[1] = (py + 0.5) * baseShape[1];
    baseVoxelScratch[2] = (pz + 0.5) * baseShape[2];
    const rawValue = sample(baseVoxelScratch, desiredLevel, channel);
    if (rawValue === null) {
      // Unresident: never a hit, and it breaks gradient pair continuity.
      prev = null;
      continue;
    }

    // Shader-lockstep normalization (see channelNormalize / computeNormalized).
    const baseNorm = Math.min(
      Math.max((rawValue - minValue) / Math.max(maxValue - minValue, 1e-5), 0),
      1,
    );
    const climRange = Math.max(climMax - climMin, 1e-5);
    let normalized = Math.min(Math.max((baseNorm - climMin) / climRange, 0), 0.999);
    normalized = Math.pow(normalized, Math.max(gamma, 1e-4));

    if (normalized > 0 && (strongest === null || normalized > strongest.normalized)) {
      strongest = { position: clampLocal3(px, py, pz), t, rawValue, normalized, fallback: true };
    }

    switch (strategy) {
      case "first-hit": {
        if (normalized > threshold) {
          return { position: clampLocal3(px, py, pz), t, rawValue, normalized };
        }
        break;
      }
      case "max": {
        break; // `strongest` IS the answer, collected above.
      }
      case "gradient": {
        if (prev !== null) {
          const edge = Math.abs(normalized - prev.normalized);
          if (edge > bestEdge) {
            bestEdge = edge;
            const tMid = (t + prev.t) / 2;
            best = {
              position: clampLocal3(
                origin[0] + direction[0] * tMid,
                origin[1] + direction[1] * tMid,
                origin[2] + direction[2] * tMid,
              ),
              t: tMid,
              rawValue,
              normalized,
            };
          }
        }
        prev = { t, normalized };
        break;
      }
      case "volume-accum": {
        const alpha = Math.min(normalized * delta * VOLUME_ACCUM_GAIN, 1);
        accumulated += (1 - accumulated) * alpha;
        if (accumulated >= 0.5) {
          return { position: clampLocal3(px, py, pz), t, rawValue, normalized };
        }
        break;
      }
    }
  }

  if (strategy === "max") {
    // The strongest sample is max's own criterion, not a fallback.
    return strongest !== null ? { ...strongest, fallback: false } : null;
  }
  if (strategy === "gradient" && bestEdge > 0) {
    return best;
  }
  // first-hit below threshold, volume-accum that never crossed 0.5, gradient
  // with no edge: answer with the strongest visible sample rather than
  // nothing (null only when the ray saw pure background).
  return strongest;
}
