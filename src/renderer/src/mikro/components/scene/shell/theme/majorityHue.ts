import { srgbToOklch } from "@/lib/color/oklch";
import type { BrandTarget } from "@/providers/settings/brandTheme";
import { MAX_BRAND_CHROMA } from "./brandTarget";

/**
 * The MAJORITY hue of a rendered frame, from a small RGBA pixel sample.
 *
 * This is deliberately not `brandTargetFromColors`' vector mean: a scene that
 * renders a red channel next to a cyan one should tint the app toward whichever
 * DOMINATES the pixels on screen, not toward the grey their mean cancels to.
 * So pixels vote into a coarse hue histogram and only the winning band (plus
 * its two neighbours, so a hue sitting on a bin edge doesn't split its vote)
 * decides the target.
 *
 * Votes are weighted by `chroma × alpha`:
 *   - alpha, because the scene canvas is transparent where nothing rendered —
 *     the background div showing through must not vote at all;
 *   - chroma, because a dim/grey pixel has no meaningful hue to vote for. A
 *     mostly-black volume render with a few vivid voxels correctly tints
 *     toward the voxels.
 *
 * "Majority" means majority OF THE COLOR that is there: whitish pixels
 *  (chroma below `WHITISH_FLOOR`) are disenfranchised entirely, so a mostly
 *  white/grey render with any genuinely colored region tints toward the
 *  region — a white theme is the answer only when there is no color at all.
 *  For the same reason an elected hue is floored at `MIN_ELECTED_CHROMA`:
 *  a hue that won the election should read as a real tint, not wash out
 *  because pale pixels shared its band.
 *
 * Bins are in OKLCH hue — the same angle space the brand theme is
 * parameterised in — so "majority" here lands directly on `--brand-hue`.
 *
 * Return contract mirrors `brandTargetFromColors`: null means "nothing
 * rendered, nothing to derive a theme from" (blank canvas); an achromatic
 * frame is NOT nothing — it is a grey theme (`hue: null`, low chroma).
 */

/** 15° bins: coarse on purpose. Accuracy is not the point — stability is, and
 * wide bins keep the winner from flickering between neighbouring hues as the
 * camera moves. */
const BIN_COUNT = 24;

/** Below this alpha (out of 255) a pixel is background showing through the
 * transparent canvas, not scene content. */
const ALPHA_FLOOR = 8;

/** If fewer than this fraction of sampled pixels carry any content, the frame
 * is effectively blank (first frame, mid-load) — report "nothing" rather than
 * a theme derived from a handful of stray pixels. */
const MIN_COVERAGE = 0.02;

/** Below this OKLCH chroma a pixel reads as white/grey, not as a color, and
 * gets no hue vote. Well above `HUE_NOISE_FLOOR` (which only guards against
 * rounding noise): this is a PERCEPTUAL cut, so that a dominant white field
 * cannot outvote a real color. */
const WHITISH_FLOOR = 0.04;

/** An elected hue is presented at least this saturated. Without it, pale
 * pixels sharing the winning band drag the mean toward white and the tint
 * becomes invisible — the "whitish theme" outcome the election explicitly
 * exists to avoid. Comfortably below the `MAX_BRAND_CHROMA` ceiling the
 * theme tokens were designed around. */
const MIN_ELECTED_CHROMA = 0.08;

const TO_RADIANS = Math.PI / 180;

/**
 * Compute the majority-hue brand target of an RGBA8 pixel buffer
 * (`ImageData.data` layout, un-premultiplied).
 *
 * Cost is one `srgbToOklch` per covered pixel — for the 32×32 samples the
 * canvas probe feeds this, well under a millisecond.
 */
export const majorityHueFromPixels = (
  rgba: Uint8ClampedArray,
): BrandTarget | null => {
  const weight = new Float64Array(BIN_COUNT);
  const sumA = new Float64Array(BIN_COUNT);
  const sumB = new Float64Array(BIN_COUNT);
  /** Σ chroma·weight per bin — for the vividness-weighted band chroma. */
  const chromaWeight = new Float64Array(BIN_COUNT);

  const pixelCount = rgba.length >>> 2;
  let covered = 0;
  let coveredAlpha = 0;
  let chromaSum = 0;

  for (let i = 0; i < rgba.length; i += 4) {
    const a8 = rgba[i + 3];
    if (a8 < ALPHA_FLOOR) continue;
    const alpha = a8 / 255;
    covered += 1;
    coveredAlpha += alpha;

    const { c, h } = srgbToOklch(rgba[i], rgba[i + 1], rgba[i + 2]);
    chromaSum += c * alpha;
    // Whitish pixels count toward coverage (an all-grey render is a grey
    // theme) but get no hue vote, no matter how many they are.
    if (c < WHITISH_FLOOR) continue;

    const w = c * alpha;
    const bin = Math.min(BIN_COUNT - 1, (h / 360) * BIN_COUNT) | 0;
    const radians = h * TO_RADIANS;
    weight[bin] += w;
    sumA[bin] += w * Math.cos(radians);
    sumB[bin] += w * Math.sin(radians);
    chromaWeight[bin] += c * w;
  }

  if (covered < pixelCount * MIN_COVERAGE) return null;

  let best = 0;
  for (let bin = 1; bin < BIN_COUNT; bin += 1) {
    if (weight[bin] > weight[best]) best = bin;
  }

  if (weight[best] === 0) {
    // Content, but no hue anywhere: desaturate rather than abstain.
    return {
      hue: null,
      chroma: Math.min(chromaSum / coveredAlpha, MAX_BRAND_CHROMA),
    };
  }

  const prev = (best + BIN_COUNT - 1) % BIN_COUNT;
  const next = (best + 1) % BIN_COUNT;
  const a = sumA[prev] + sumA[best] + sumA[next];
  const b = sumB[prev] + sumB[best] + sumB[next];
  // Vividness-weighted (Σc·w / Σw) rather than a plain mean: the band's tint
  // should look like its saturated members, not be averaged toward white by
  // its pale ones. Floored so an elected hue is always a visible tint.
  const bandWeight = weight[prev] + weight[best] + weight[next];
  const bandChroma =
    (chromaWeight[prev] + chromaWeight[best] + chromaWeight[next]) / bandWeight;
  const chroma = Math.min(
    Math.max(bandChroma, MIN_ELECTED_CHROMA),
    MAX_BRAND_CHROMA,
  );

  const hue = (Math.atan2(b, a) / TO_RADIANS + 360) % 360;
  return { hue, chroma };
};

/** ~Half a histogram-bin of hue and an invisible sliver of chroma: below this
 * a re-publish would re-tint the app to an indistinguishable color. */
export const sameBrandTarget = (
  a: BrandTarget | null,
  b: BrandTarget | null,
): boolean => {
  if (a === null || b === null) return a === b;
  if (Math.abs(a.chroma - b.chroma) > 0.005) return false;
  if (a.hue === null || b.hue === null) return a.hue === b.hue;
  const delta = Math.abs(a.hue - b.hue) % 360;
  return Math.min(delta, 360 - delta) <= 2;
};
