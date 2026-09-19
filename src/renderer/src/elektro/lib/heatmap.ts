/**
 * The importance heatmap's colours — pure, so the morphology's colouring (and
 * its tests) can use them without pulling in the dominance query.
 */

/** Grey used for sections that have no dominance entry. */
export const IMPORTANCE_MUTED = "rgb(60, 60, 66)";

// Viridis-style control points (low → high). RGB in 0–255, evenly spaced in t.
const HEATMAP_STOPS: [number, number, number][] = [
  [68, 1, 84], // deep purple
  [59, 82, 139], // blue
  [33, 145, 140], // teal
  [94, 201, 98], // green
  [253, 231, 37], // yellow
];

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * Sample the heatmap colormap at `t ∈ [0, 1]`, returning a CSS `rgb(...)`
 * string (parseable by `THREE.Color` and usable directly in the DOM). Linearly
 * interpolates between the viridis-style control points.
 */
export const sampleHeatmap = (t: number): string => {
  const x = clamp01(t) * (HEATMAP_STOPS.length - 1);
  const i = Math.floor(x);
  const frac = x - i;
  const a = HEATMAP_STOPS[i];
  const b = HEATMAP_STOPS[Math.min(i + 1, HEATMAP_STOPS.length - 1)];
  const r = Math.round(a[0] + (b[0] - a[0]) * frac);
  const g = Math.round(a[1] + (b[1] - a[1]) * frac);
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac);
  return `rgb(${r}, ${g}, ${bl})`;
};

/** A CSS `linear-gradient(...)` across the heatmap, for legends/swatches. */
export const heatmapGradientCss = (steps = 8): string => {
  const stops = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return `${sampleHeatmap(t)} ${Math.round(t * 100)}%`;
  });
  return `linear-gradient(to right, ${stops.join(", ")})`;
};
