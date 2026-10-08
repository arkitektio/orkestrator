import type { PackedChannel } from "./tracePacking";

/**
 * A packed polyline redrawn as STEPS: each value held until the next sample,
 * then a vertical riser — `(x0,y0)→(x1,y0)` and `(x1,y0)→(x1,y1)` for every
 * segment `(x0,y0)→(x1,y1)`.
 *
 * A look, not a read: it is derived from the packed line, so switching to and
 * from steps repacks what is resident and fetches nothing.
 *
 * A stretch packed as a per-pixel min/max ENVELOPE is left as it is. There the
 * points are already column extremes, not samples — holding one "until the next"
 * would draw a staircase the data does not have, a pixel wide.
 */
export const stepped = (line: PackedChannel): PackedChannel => {
  if (line.decimated || line.segmentCount === 0) return line;
  const pairs = new Float32Array(line.segmentCount * 12);
  for (let i = 0; i < line.segmentCount; i++) {
    const from = i * 6;
    const to = i * 12;
    const x0 = line.pairs[from];
    const y0 = line.pairs[from + 1];
    const z = line.pairs[from + 2];
    const x1 = line.pairs[from + 3];
    const y1 = line.pairs[from + 4];
    // The tread.
    pairs[to] = x0;
    pairs[to + 1] = y0;
    pairs[to + 2] = z;
    pairs[to + 3] = x1;
    pairs[to + 4] = y0;
    pairs[to + 5] = z;
    // The riser.
    pairs[to + 6] = x1;
    pairs[to + 7] = y0;
    pairs[to + 8] = z;
    pairs[to + 9] = x1;
    pairs[to + 10] = y1;
    pairs[to + 11] = z;
  }
  return { ...line, pairs, segmentCount: line.segmentCount * 2 };
};
