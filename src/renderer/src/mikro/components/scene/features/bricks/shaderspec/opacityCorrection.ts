/**
 * Volume-rendering opacity (step-size) correction.
 *
 * The brick volume raymarcher (`features/bricks/layers/BrickVolumeLayer.tsx`, VOLUME
 * projection) accumulates opacity front-to-back, one term per ray step. Its step
 * length is LOD-adaptive and also grows while the camera moves (`uStepScale`), so
 * a coarser level takes FEWER, LARGER steps across the same physical span. With a
 * naive per-step opacity `a = sampleNorm`, fewer steps accumulate less total
 * opacity — the volume looks dimmer at coarse LOD / while moving.
 *
 * The fix rescales each sample's alpha for its actual step length relative to a
 * fixed reference step, so accumulated opacity is invariant to how finely the ray
 * is subdivided:
 *
 *     a = 1 - (1 - sampleNorm) ^ (stepLen / refStep)
 *
 * This module is the CPU mirror of that GLSL (same lockstep contract as
 * `features/bricks/probeMath.ts` ↔ the shader normalization). The `.test.ts` pins the
 * invariance the shader relies on; keep the formula here identical to the shader.
 *
 * The PITCH RULE feeding stepLen/refStep is orthogonal to this formula: under
 * `orkestrator.anisoStride` both switch to the direction-projected pitch
 * (`features/bricks/shaderspec/raymarchStep.ts directionProjectedPitch`) — numerator and reference
 * use the SAME projection, so the identity-at-the-finest-settled-sample
 * semantics carry over unchanged.
 */

/**
 * Correct a per-sample opacity for the ray step length.
 * `stepLen === refStep` is the identity (returns `alpha`); larger steps return a
 * proportionally larger alpha so the same physical span reaches the same opacity.
 */
export function correctOpacityForStep(
  alpha: number,
  stepLen: number,
  refStep: number,
): number {
  const a = Math.min(Math.max(alpha, 0), 1);
  const ratio = stepLen / Math.max(refStep, 1e-5);
  return 1 - Math.pow(Math.max(1 - a, 0), ratio);
}

/**
 * Front-to-back composite of a homogeneous ray: `count` samples of intensity
 * `norm`, each spanning `stepLen`, with opacity correction against `refStep`.
 * Returns the accumulated opacity (alpha). Mirrors the shader's VOLUME accumulator
 * (`volAlpha += (1 - volAlpha) * a`, early-out at 0.98).
 */
export function compositeHomogeneousAlpha(
  norm: number,
  count: number,
  stepLen: number,
  refStep: number,
): number {
  let alpha = 0;
  for (let i = 0; i < count; i++) {
    const a = correctOpacityForStep(norm, stepLen, refStep);
    alpha += (1 - alpha) * a;
    if (alpha >= 0.98) break;
  }
  return alpha;
}
