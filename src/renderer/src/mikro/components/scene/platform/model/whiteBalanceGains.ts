/**
 * The stored half of an RGB layer's white balance: how `RgbLayer.whiteBalance`
 * (three per-primary gains, null = neutral) is READ. Lives in the model
 * because `normalizeRgbLayer` needs it; the card's conversions (Auto,
 * temperature/tint, the neutral pick) build on it in
 * `shell/layerPanel/whiteBalance.ts`.
 */

export type Gains = readonly [number, number, number];

export const NEUTRAL: Gains = [1, 1, 1];

/** The server's bound on a stored gain. */
export const MAX_GAIN = 16;

export const isGain = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** The stored value as gains: anything that is not three positive finite
 *  numbers reads as neutral rather than as a broken picture. */
export const readGains = (stored: readonly number[] | null | undefined): Gains =>
  stored && stored.length === 3 && stored.every(isGain)
    ? [
        Math.min(MAX_GAIN, stored[0]),
        Math.min(MAX_GAIN, stored[1]),
        Math.min(MAX_GAIN, stored[2]),
      ]
    : NEUTRAL;
