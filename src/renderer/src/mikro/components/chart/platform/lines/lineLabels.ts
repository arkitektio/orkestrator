import { sampleAt } from "@/core/data/plot/probe/sampleAt";

/**
 * Where to write each line's name: at the left edge of the plot, level with the
 * line itself there.
 *
 * Pure — positions in pixels down the canvas box — so the rules are pinned by
 * tests: a name sits on its line where the lines are apart, names of lines
 * that run together are spread just enough to be read, and when a layer draws
 * more lines than there is room to name, every k-th is named rather than all of
 * them written over each other.
 */

/** The height one name takes. */
export const LINE_LABEL_PX = 12;

export type LineLabel = { line: number; topPx: number };

/**
 * A line's value where it meets the left edge `x`: on the edge when the line
 * crosses it, else at the line's own start inside the window. Null when the
 * line has nothing at or after the edge.
 */
export const valueAtLeft = (xs: ArrayLike<number>, ys: ArrayLike<number>, x: number): number | null => {
  const n = xs.length;
  if (n === 0 || x > xs[n - 1]) return null;
  if (x <= xs[0]) return ys[0];
  return sampleAt(xs, ys, x)?.value ?? null;
};

export const placeLineLabels = (
  /** Each line's centre, in pixels down the box; null for a line with nothing to sit on. */
  centres: readonly (number | null)[],
  /** The stretch of the box the names may use. */
  box: { top: number; bottom: number },
): LineLabel[] => {
  const room = Math.max(1, Math.floor((box.bottom - box.top) / LINE_LABEL_PX));
  const drawn = centres.flatMap((centre, line) => (centre == null ? [] : [{ line, centre }]));
  const every = Math.ceil(drawn.length / room);
  const kept = every > 1 ? drawn.filter((_, i) => i % every === 0) : drawn;

  const placed = kept
    .map(({ line, centre }) => ({ line, topPx: centre - LINE_LABEL_PX / 2 }))
    .sort((a, b) => a.topPx - b.topPx || a.line - b.line);
  // Down: nothing above the box, nothing over the name before it.
  let floor = box.top;
  for (const label of placed) {
    label.topPx = Math.max(label.topPx, floor);
    floor = label.topPx + LINE_LABEL_PX;
  }
  // Back up: nothing below the box.
  let ceiling = box.bottom;
  for (let i = placed.length - 1; i >= 0; i--) {
    placed[i].topPx = Math.min(placed[i].topPx, ceiling - LINE_LABEL_PX);
    ceiling = placed[i].topPx;
  }
  return placed;
};
