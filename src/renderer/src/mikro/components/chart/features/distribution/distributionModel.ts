/**
 * A distribution's marks from what DuckDB summarised: pure geometry, tested in
 * node.
 *
 *  - **Histogram**: per group, one bar per bin over the SHARED domain, so the
 *    groups' bars line up and overlay. Heights are counts, or -- with several
 *    groups -- each group's fraction of its rows, so a small condition is not
 *    flattened by a large one.
 *  - **Box**: per group, at member position `i` (its slot is `[i, i + 1]`), a
 *    box from the first to the third quartile, the median across it, and
 *    whiskers to the extremes.
 */

export type Group = { name: string; n: number };
export type HistogramBin = { group: string; bin: number; n: number };
export type BoxStats = { group: string; n: number; lo: number; q1: number; q2: number; q3: number; hi: number };

export type HistogramGeometry = {
  /** (x0, x1, y0, y1) per bar, in bar order; `barGroup[i]` is its group's index. */
  quads: Float64Array;
  barGroup: Int32Array;
  /** The top outline of each group: (x0, y0, x1, y1) segments. */
  outline: number[];
  outlineGroup: number[];
  width: number;
  maxHeight: number;
  normalized: boolean;
  /** Height per (group, bin), for the readout. */
  heights: Float64Array;
};

export const histogramGeometry = (
  groups: readonly Group[],
  bins: readonly HistogramBin[],
  domain: { lo: number; hi: number },
  binCount: number,
): HistogramGeometry => {
  const width = (domain.hi - domain.lo) / Math.max(1, binCount) || 1;
  const normalized = groups.length > 1;
  const index = new Map(groups.map((g, i) => [g.name, i]));
  const heights = new Float64Array(groups.length * binCount);
  for (const b of bins) {
    const g = index.get(b.group);
    if (g === undefined || b.bin < 0 || b.bin >= binCount) continue;
    const total = groups[g].n || 1;
    heights[g * binCount + b.bin] = normalized ? b.n / total : b.n;
  }
  const quads: number[] = [];
  const barGroup: number[] = [];
  const outline: number[] = [];
  const outlineGroup: number[] = [];
  let maxHeight = 0;
  for (let g = 0; g < groups.length; g++) {
    let previous = 0;
    for (let k = 0; k < binCount; k++) {
      const h = heights[g * binCount + k];
      const x0 = domain.lo + k * width;
      const x1 = x0 + width;
      if (h > maxHeight) maxHeight = h;
      if (h > 0) {
        quads.push(x0, x1, 0, h);
        barGroup.push(g);
      }
      // The step outline: the riser from the previous bin's height, then this bin's top.
      if (h !== previous) {
        outline.push(x0, previous, x0, h);
        outlineGroup.push(g);
      }
      if (h > 0) {
        outline.push(x0, h, x1, h);
        outlineGroup.push(g);
      }
      previous = h;
    }
    if (previous > 0) {
      const end = domain.lo + binCount * width;
      outline.push(end, previous, end, 0);
      outlineGroup.push(g);
    }
  }
  return {
    quads: Float64Array.from(quads),
    barGroup: Int32Array.from(barGroup),
    outline,
    outlineGroup,
    width,
    maxHeight,
    normalized,
    heights,
  };
};

export const BOX_INSET = 0.22;
const WHISKER_CAP = 0.36;

export type BoxGeometry = {
  /** One body per group: (x0, x1, y0, y1). */
  quads: Float64Array;
  /** Whiskers, caps, medians and outlines: (x0, y0, x1, y1) segments, with the group of each. */
  segments: number[];
  segmentGroup: number[];
  extent: { y0: number; y1: number };
};

export const boxGeometry = (boxes: readonly BoxStats[]): BoxGeometry => {
  const quads: number[] = [];
  const segments: number[] = [];
  const segmentGroup: number[] = [];
  let y0 = Infinity;
  let y1 = -Infinity;
  boxes.forEach((b, i) => {
    const left = i + BOX_INSET;
    const right = i + 1 - BOX_INSET;
    const mid = i + 0.5;
    const capL = i + WHISKER_CAP;
    const capR = i + 1 - WHISKER_CAP;
    quads.push(left, right, b.q1, b.q3);
    const add = (...s: number[]) => {
      segments.push(...s);
      segmentGroup.push(i);
    };
    add(left, b.q2, right, b.q2); // median
    add(mid, b.q3, mid, b.hi); // upper whisker
    add(mid, b.lo, mid, b.q1); // lower whisker
    add(capL, b.hi, capR, b.hi);
    add(capL, b.lo, capR, b.lo);
    // the box's outline
    add(left, b.q1, right, b.q1);
    add(left, b.q3, right, b.q3);
    add(left, b.q1, left, b.q3);
    add(right, b.q1, right, b.q3);
    y0 = Math.min(y0, b.lo);
    y1 = Math.max(y1, b.hi);
  });
  return { quads: Float64Array.from(quads), segments, segmentGroup, extent: { y0, y1 } };
};
