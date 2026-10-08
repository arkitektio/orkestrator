import type { TimeMap } from "@/core/data/plot/coords/timeMap";

/**
 * An annotation, as a chart draws it.
 *
 * A chart's drawn marks live in an annotation collection's own space. Two
 * shapes of space occur:
 *
 *  - a DRAWING SURFACE: the chart's axis and a VALUE axis. A mark there has a
 *    position and a height — a point on a peak, a line from baseline to peak, an
 *    outline round a burst.
 *  - an AXIS-ONLY space (a collection registered in from elsewhere, with no
 *    VALUE axis). A mark there has only an extent along the axis, so it is drawn
 *    across the whole height: an instant as a line, anything wider as a band.
 *
 * Which component of a vector is which is read from the collection's axes BY
 * NAME AND TYPE, never by position: `alongAxis` names the one the placement
 * lays along the chart, and the VALUE axis is the one typed so.
 *
 * Pure — no store, no React — so the geometry is pinned by tests.
 */

export type AxisLike = { name: string; type?: string | null; order?: number | null };

export type AnnotationLike = {
  id: string;
  kind: string;
  vectors: readonly (readonly number[])[];
  strokeColor?: readonly number[] | null;
  fillColor?: readonly number[] | null;
  filled?: boolean | null;
  name?: string | null;
};

/** How a collection's vectors are read: which component is where. */
export type MarkSpace = {
  /** Index of the component laid along the chart's axis. */
  alongIndex: number;
  /** Index of the VALUE component, or null for an axis-only space. */
  valueIndex: number | null;
  /** Collection units along the axis → the chart's axis. */
  axisMap: TimeMap;
};

/** A point in chart terms: a position along the axis, and a value (or none). */
export type MarkPoint = { at: number; value: number };

export type ChartMark =
  /** Dots at points that carry a height. */
  | { shape: "dots"; id: string; points: MarkPoint[] }
  | { shape: "polyline"; id: string; points: MarkPoint[] }
  | { shape: "polygon"; id: string; points: MarkPoint[]; filled: boolean }
  /** An ellipse inscribed in the box between two corners. */
  | { shape: "ellipse"; id: string; from: MarkPoint; to: MarkPoint; filled: boolean }
  /** Axis-only: one position, drawn across the whole height. */
  | { shape: "instant"; id: string; at: number }
  /** Axis-only: an extent, drawn across the whole height. */
  | { shape: "span"; id: string; from: number; to: number };

/** Axes in declared order. `order` wins; ties keep the given order. */
const ordered = (axes: readonly AxisLike[]): AxisLike[] =>
  axes
    .map((axis, index) => ({ axis, index }))
    .sort((a, b) => (a.axis.order ?? a.index) - (b.axis.order ?? b.index) || a.index - b.index)
    .map(({ axis }) => axis);

/** The axis names of a collection's space, in the order its vectors are in. */
export const vectorAxes = (axes: readonly AxisLike[] | null | undefined): AxisLike[] => ordered(axes ?? []);

/**
 * How to read a collection's vectors, or null when its space has no component
 * along the chart's axis (the layer is then not placed, and draws nothing).
 */
export const markSpaceOf = (
  axes: readonly AxisLike[] | null | undefined,
  alongAxis: string | null | undefined,
  axisMap: TimeMap | null,
): MarkSpace | null => {
  if (!alongAxis || !axisMap) return null;
  const names = vectorAxes(axes);
  const alongIndex = names.findIndex((a) => a.name === alongAxis);
  if (alongIndex < 0) return null;
  const valueIndex = names.findIndex((a) => a.type === "VALUE");
  return { alongIndex, valueIndex: valueIndex < 0 ? null : valueIndex, axisMap };
};

/** Whether marks can be DRAWN into this space: it must give them a height. */
export const isDrawingSurface = (space: MarkSpace | null): space is MarkSpace & { valueIndex: number } =>
  space != null && space.valueIndex != null;

const TWO_CORNER = new Set(["RECTANGLE", "CIRCLE", "ELLIPSE"]);

/** One annotation as a chart mark, or null for a kind a chart has nowhere to draw. */
export const chartMarkOf = (annotation: AnnotationLike, space: MarkSpace): ChartMark | null => {
  const { alongIndex, valueIndex, axisMap } = space;
  const at = (vector: readonly number[]) => axisMap.t0 + axisMap.period * (vector[alongIndex] ?? 0);
  const { id, kind, vectors } = annotation;
  if (vectors.length === 0) return null;
  // A volume has a third extent a chart cannot show.
  if (kind === "CUBE" || kind === "SPHERE" || kind === "ELLIPSOID") return null;

  if (valueIndex == null) {
    // No height: only the extent along the axis survives.
    let lo = Infinity;
    let hi = -Infinity;
    for (const vector of vectors) {
      const x = at(vector);
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    if (kind === "MULTI_POINT") return null; // split by the caller: see `chartMarksOf`
    return hi > lo ? { shape: "span", id, from: lo, to: hi } : { shape: "instant", id, at: lo };
  }

  const points = vectors.map((vector) => ({ at: at(vector), value: vector[valueIndex] ?? 0 }));
  const filled = annotation.filled ?? false;
  if (kind === "POINT" || kind === "MULTI_POINT") return { shape: "dots", id, points };
  if (kind === "LINE" || kind === "PATH") return { shape: "polyline", id, points };
  if (kind === "POLYGON") return { shape: "polygon", id, points, filled };
  if (TWO_CORNER.has(kind) && points.length >= 2) {
    const [a, b] = points;
    if (kind === "RECTANGLE") {
      return {
        shape: "polygon",
        id,
        filled,
        points: [a, { at: b.at, value: a.value }, b, { at: a.at, value: b.value }],
      };
    }
    return { shape: "ellipse", id, from: a, to: b, filled };
  }
  return null;
};

/** Every annotation of a collection as chart marks; kinds with nowhere to go are dropped. */
export const chartMarksOf = (annotations: readonly AnnotationLike[], space: MarkSpace): ChartMark[] => {
  const marks: ChartMark[] = [];
  for (const annotation of annotations) {
    if (space.valueIndex == null && annotation.kind === "MULTI_POINT") {
      // A click set with no height is a set of instants, not one span.
      annotation.vectors.forEach((vector, i) =>
        marks.push({
          shape: "instant",
          id: `${annotation.id}:${i}`,
          at: space.axisMap.t0 + space.axisMap.period * (vector[space.alongIndex] ?? 0),
        }),
      );
      continue;
    }
    const mark = chartMarkOf(annotation, space);
    if (mark) marks.push(mark);
  }
  return marks;
};

/**
 * A drawn point as a vector in the collection's space: the position mapped
 * back through the placement, the value on the VALUE axis, zero elsewhere.
 * One component per axis of the collection, in its own order.
 */
export const vectorOf = (
  point: MarkPoint,
  space: MarkSpace & { valueIndex: number },
  axisCount: number,
): number[] => {
  const vector = new Array<number>(axisCount).fill(0);
  vector[space.alongIndex] = (point.at - space.axisMap.t0) / space.axisMap.period;
  vector[space.valueIndex] = point.value;
  return vector;
};
