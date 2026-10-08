/**
 * The colour a layer is drawn in when nothing persisted says otherwise.
 *
 * Stable per layer id — the walk the legend has always used — so a layer keeps
 * its colour across reloads and reorders, and two layers never share one by
 * accident of position.
 */

const GOLDEN_ANGLE = 137.508;

export const colorForLayerId = (id: string): string => {
  const numeric = Number.parseInt(id, 10);
  const seed = Number.isFinite(numeric)
    ? numeric
    : [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7);
  return `hsl(${Math.abs(seed * GOLDEN_ANGLE) % 360}, 70%, 60%)`;
};
