/**
 * Tick and readout labels with SI prefixes, so an axis reads `2 k`, `150 µ`,
 * `3.5 M` instead of `2000`, `0.00015`, `3500000`.
 *
 * Small magnitudes (1e-3 ≤ |v| < 1e4) are written plainly -- a label of `12.5` is
 * clearer than `12.5 ` with an empty prefix -- and only values outside that band
 * take a prefix. The number of decimals follows the STEP between ticks, never the
 * value, so neighbouring labels line up.
 *
 * Pure -- runs in node.
 */

const PREFIXES: readonly [number, string][] = [
  [1e12, "T"],
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

const PLAIN_LOW = 1e-3;
const PLAIN_HIGH = 1e4;

/** The prefix scale for a magnitude: the largest factor not above it. */
export const siScaleFor = (magnitude: number): readonly [number, string] => {
  if (!(magnitude > 0) || !Number.isFinite(magnitude)) return [1, ""];
  for (const entry of PREFIXES) if (magnitude >= entry[0] * 0.9999999) return entry;
  return PREFIXES[PREFIXES.length - 1];
};

const decimalsForStep = (step: number): number =>
  !(step > 0) || !Number.isFinite(step) ? 2 : step >= 1 ? 0 : Math.min(12, Math.ceil(-Math.log10(step) - 1e-9));

/**
 * One label. `step` is the distance between neighbouring ticks (or a readout's
 * resolution); `reference` the largest magnitude on the axis, which picks ONE
 * prefix for every label of an axis.
 */
export const formatSi = (value: number, step: number, reference = Math.abs(value)): string => {
  if (!Number.isFinite(value)) return String(value);
  const ref = Math.abs(reference);
  if (ref === 0 || (ref >= PLAIN_LOW && ref < PLAIN_HIGH)) {
    const snapped = step > 0 ? Math.round(value / step) * step : value;
    return snapped.toFixed(decimalsForStep(step));
  }
  const [scale, prefix] = siScaleFor(ref);
  const scaled = value / scale;
  const scaledStep = step > 0 ? step / scale : 0;
  const snapped = scaledStep > 0 ? Math.round(scaled / scaledStep) * scaledStep : scaled;
  return `${snapped.toFixed(decimalsForStep(scaledStep))}${prefix ? ` ${prefix}` : ""}`;
};

/** A readout of one value at a sensible precision (4 significant digits), with its SI prefix. */
export const formatSiValue = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  const magnitude = Math.abs(value);
  if (magnitude === 0) return "0";
  const step = 10 ** (Math.floor(Math.log10(magnitude)) - 3);
  return formatSi(value, step, magnitude);
};
