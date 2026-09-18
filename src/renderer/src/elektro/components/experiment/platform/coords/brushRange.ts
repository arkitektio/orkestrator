/**
 * The `?brush=left:right` URL contract for an experiment's zoom window.
 *
 * Lifted verbatim out of `pages/ExperimentPage.tsx` so the shape survives the
 * renderer rewrite: links to a zoomed experiment are pasted into issues and
 * notebooks, and silently changing how they parse is worse than not supporting
 * them.
 *
 * What DOES change is what the numbers mean. They used to be sample indices
 * into `Experiment.timeTrace`, the one array every series was aligned to. That
 * array is gone, and with it the idea of a single sample space — a 20 kHz
 * recording and a 1 kHz stimulus in one experiment do not share one. The numbers
 * are now **integer milliseconds of world time**. An old link still parses and
 * still produces a window; it is simply the wrong window, and `clampToWorld`
 * keeps it inside the data rather than leaving the viewer staring at empty space.
 *
 * Kept free of React and of generated types so it can be unit-tested in node.
 */

export type TimeRange = {
  /** Start, in ms of world time. Null means "from the beginning". */
  left: number | null;
  /** End, in ms of world time. Null means "to the end". */
  right: number | null;
};

export const DEFAULT_RANGE: TimeRange = { left: 0, right: null };

/**
 * Parse a `brush` search param. Anything malformed falls back to the default
 * rather than throwing: a bad URL should open the experiment, not break it.
 */
export const parseBrushRange = (raw: string | null): TimeRange => {
  if (!raw) return DEFAULT_RANGE;

  const [rawLeft, rawRight] = raw.split(":");
  const left = Number.parseInt(rawLeft, 10);
  const right = Number.parseInt(rawRight, 10);

  // An inverted or empty window is not a window. `right <= left` catches both,
  // and NaN comparisons are false, so it catches unparseable halves too.
  if (Number.isNaN(left) || Number.isNaN(right) || right <= left) {
    return DEFAULT_RANGE;
  }

  return { left: Math.max(0, left), right };
};

/**
 * Encode a range back to a param value, or null to drop the param entirely.
 * A full-extent view carries no `brush`, so the clean URL is the default one.
 */
export const encodeBrushRange = (range: TimeRange): string | null => {
  if (range.right == null || range.right <= (range.left ?? 0)) return null;
  return `${range.left ?? 0}:${range.right}`;
};

export const normalizeRange = (range?: TimeRange | null): TimeRange => ({
  left: range?.left ?? DEFAULT_RANGE.left,
  right: range?.right ?? DEFAULT_RANGE.right,
});

export const areRangesEqual = (a: TimeRange, b: TimeRange): boolean =>
  a.left === b.left && a.right === b.right;

/**
 * Pull a range inside the world's own extent.
 *
 * This is what makes an inherited sample-index link harmless: a `brush` of
 * `0:2000000` against a 5 s world collapses to the whole world rather than a
 * window two thousand seconds past the end of the data. Returns the full extent
 * when the requested window misses the world entirely.
 */
export const clampToWorld = (
  range: TimeRange,
  world: { start: number; end: number },
): TimeRange => {
  if (!(world.end > world.start)) return DEFAULT_RANGE;

  const left = Math.max(world.start, range.left ?? world.start);
  const right = Math.min(world.end, range.right ?? world.end);

  // Fully outside, or inverted after clamping: show everything.
  if (right <= left) return { left: world.start, right: world.end };
  return { left, right };
};
