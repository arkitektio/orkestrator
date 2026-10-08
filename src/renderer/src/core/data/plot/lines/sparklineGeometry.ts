import { packPoints } from "./pointPacking";

/**
 * One line of samples as the points of a small polyline — a trace drawn in a
 * readout rather than in the plot.
 *
 * The same rule as the plot's packing, by the same function: never more points
 * than the box can show, a dense stretch reduced to each pixel column's minimum
 * and maximum. So a spike survives a 16k-sample line drawn 200 pixels wide.
 *
 * Pure — runs in node.
 */

export type SparklineGeometry = {
  /** SVG `points` in a `0 0 width height` box, y down. */
  points: string;
  /** The drawn points, in sample index and value: what a hover reads back. */
  xs: Float64Array;
  ys: Float32Array;
  valueMin: number | null;
  valueMax: number | null;
};

/** Sample index → x in the box. */
export const sparklineX = (index: number, count: number, width: number): number =>
  count <= 1 ? width / 2 : (index / (count - 1)) * width;

/** x in the box → sample index (fractional), clamped to the line. */
export const sparklineIndexAt = (x: number, count: number, width: number): number =>
  count <= 1 || width <= 0 ? 0 : Math.min(count - 1, Math.max(0, (x / width) * (count - 1)));

export const sparklineGeometry = (
  values: ArrayLike<number>,
  width: number,
  height: number,
  /** Kept clear above and below, so the stroke is not clipped at the extremes. */
  inset = 1,
): SparklineGeometry => {
  const count = values.length;
  const indices = new Float64Array(count);
  for (let i = 0; i < count; i++) indices[i] = i;
  const packed = packPoints(indices, values, 0, {
    window: { start: 0, end: Math.max(0, count - 1) },
    widthPx: width,
  });
  const { xs, ys, valueMin, valueMax } = packed;
  const span = valueMin !== null && valueMax !== null ? valueMax - valueMin : 0;
  const drawable = Math.max(0, height - 2 * inset);
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    // A flat line sits in the middle rather than on an edge.
    const level = span > 0 ? (ys[i] - (valueMin as number)) / span : 0.5;
    const x = sparklineX(xs[i], count, width);
    const y = inset + (1 - level) * drawable;
    parts.push(`${Number(x.toFixed(2))},${Number(y.toFixed(2))}`);
  }
  return { points: parts.join(" "), xs, ys, valueMin, valueMax };
};
