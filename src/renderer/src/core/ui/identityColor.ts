/**
 * A stable colour per identifier (an app, an agent's app), first drawn by
 * Kabinet's app icons and shared so the same app wears the same colour on
 * every surface: its icon in the store, its agents' cards in Rekuest.
 *
 * The colour is a STEP within the brand hue, never a hue of its own, so it
 * repaints with the theme: the seed picks lightness and chroma, and the hue
 * moves only a few degrees.
 */

/** Stable 0–360 seed per identifier. */
export const identityHue = (identifier: string): number => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

const brandStop = (lightness: number, chroma: number, shift: number, alpha: number) =>
  `oklch(${lightness.toFixed(3)} calc(var(--brand-chroma) * ${chroma.toFixed(3)}) calc(var(--brand-hue) + ${shift.toFixed(1)}) / ${alpha})`;

const stepOf = (seed: number) => {
  const t = (((seed % 360) + 360) % 360) / 360;
  return {
    lightness: 0.46 + 0.12 * ((t * 3) % 1),
    chroma: 0.55 + 0.45 * ((t * 7) % 1),
    shift: (t - 0.5) * 24,
  };
};

/** The seed's colour, as one CSS colour. */
export const identityColor = (seed: number, alpha = 1): string => {
  const { lightness, chroma, shift } = stepOf(seed);
  return brandStop(lightness, chroma, shift, alpha);
};

/**
 * Soft two-stop gradient for the seed. Both stops stay dark enough for white
 * initials in either mode (Kabinet's app icons draw on it at full alpha).
 */
export const identityGradient = (seed: number, alpha = 1): string => {
  const { lightness, chroma, shift } = stepOf(seed);
  return `linear-gradient(135deg, ${brandStop(lightness + 0.06, chroma, shift, alpha)}, ${brandStop(lightness - 0.1, chroma * 0.85, shift + 8, alpha)})`;
};
