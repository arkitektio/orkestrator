import type { Plane } from "./rgbPlanes";

/**
 * White balance for an RGB layer — the data half of the card's "White
 * balance" section, pure so the conversions are testable without a renderer.
 *
 * The layer stores exactly one thing: three per-primary GAINS
 * (`RgbLayer.whiteBalance`, null = neutral). Each primary is multiplied by its
 * gain AFTER the shared contrast window: `out_k = norm_k · gain_k`. The
 * renderer carries them as the three planes' slot opacities
 * (`normalizeRgbLayer`), which is exactly what the general compositor's
 * `weight = opacity · norm` already does — so both the specialised rgb
 * material and the general fallback honour them.
 *
 * Temperature/tint, Auto and the neutral-point pick are all VIEWS onto those
 * gains, computed here and never stored: the server holds one fact.
 *
 * Every derived balance is normalised so its LARGEST gain is 1. A balance
 * only rebalances the primaries against each other; with no gain above 1 no
 * primary clips earlier than it did unbalanced, and the brightness of the
 * picture is left to the contrast window, where it belongs.
 */

import { NEUTRAL, isGain, type Gains } from "../../platform/model/whiteBalanceGains";

export { MAX_GAIN, NEUTRAL, readGains, type Gains } from "../../platform/model/whiteBalanceGains";

/** The smallest gain a control offers — 0 would erase a primary entirely,
 *  which is a plane-mapping decision, not a balance. */
export const MIN_GAIN = 0.02;

export const isNeutral = (gains: Gains, epsilon = 1e-6): boolean =>
  gains.every((gain) => Math.abs(gain - 1) < epsilon);

/** What to persist: neutral stores as null, so an untouched layer and a
 *  reset one read back identically. */
export const storedGains = (gains: Gains): number[] | null =>
  isNeutral(gains) ? null : [gains[0], gains[1], gains[2]];

/** Scale so the largest gain is 1 (see the module note). */
export const normalizeGains = (gains: readonly number[]): Gains => {
  const peak = Math.max(...gains);
  if (!(peak > 0) || !gains.every(isGain)) return NEUTRAL;
  const clampGain = (gain: number) => Math.max(MIN_GAIN, gain / peak);
  return [clampGain(gains[0]), clampGain(gains[1]), clampGain(gains[2])];
};

/**
 * The balance under which a pixel whose three WINDOWED values are `values`
 * renders grey: `gain_k ∝ 1 / value_k`. Null when a primary is black at that
 * point — nothing can be scaled up out of zero, and a guess would tint the
 * picture by whatever the other two happen to be.
 */
export const gainsForNeutral = (values: readonly number[]): Gains | null => {
  if (values.length !== 3 || !values.every(isGain)) return null;
  return normalizeGains(values.map((value) => 1 / value));
};

/** A raw data value through the layer's shared window — what the shader's
 *  `emitScalarNormalize` computes before the gain, without its 0.999 cap. */
export const windowed = (raw: number, climMin: number, climMax: number): number => {
  const span = climMax - climMin;
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (raw - climMin) / span));
};

/**
 * Auto: the white-patch balance from the three mapped planes' anchor
 * histograms — each plane's p99 through the shared window is taken as that
 * primary's white, and the balance makes those three equal. On a brightfield
 * slide or a photograph the brightest percentile is the illuminant, which is
 * exactly the cast to remove. Null when any plane carries no percentile.
 */
export const autoGains = (
  planes: readonly Plane[],
  climMin: number,
  climMax: number,
): Gains | null => {
  if (planes.length !== 3) return null;
  const whites = planes.map((plane) => {
    const p99 = plane.histogram?.p99;
    return p99 == null || !Number.isFinite(p99) ? NaN : windowed(p99, climMin, climMax);
  });
  return gainsForNeutral(whites);
};

// ---------------------------------------------------------------------------
// Temperature / tint
// ---------------------------------------------------------------------------

/**
 * Temperature and tint, each in [-1, 1], as a view onto the gains. Defined in
 * LOG space so the round trip is exact up to the normalisation (which
 * subtracts one constant from all three logs and cancels in both
 * differences):
 *
 *   log r = +S·temperature
 *   log b = −S·temperature
 *   log g = −S·tint
 *
 * Positive temperature warms (more red, less blue); positive tint pushes
 * towards magenta (less green). At the ends a primary moves by a factor of
 * `2^1` against the neutral.
 */
const STRENGTH = Math.LN2;

export type TemperatureTint = { temperature: number; tint: number };

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

export const gainsFromTemperatureTint = ({ temperature, tint }: TemperatureTint): Gains =>
  normalizeGains([
    Math.exp(STRENGTH * clampUnit(temperature)),
    Math.exp(-STRENGTH * clampUnit(tint)),
    Math.exp(-STRENGTH * clampUnit(temperature)),
  ]);

export const temperatureTintFromGains = (gains: Gains): TemperatureTint => {
  const [r, g, b] = gains.map(Math.log);
  return {
    temperature: clampUnit((r - b) / (2 * STRENGTH)),
    tint: clampUnit(((r + b) / 2 - g) / STRENGTH),
  };
};
