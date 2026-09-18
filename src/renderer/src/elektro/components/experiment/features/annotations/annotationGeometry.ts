import { placementToTimeMap, sampleToTime } from "../../platform/coords/timeMap";
import {
  axisNamesOf,
  timeAxisName,
  valueAxisName,
  type CoordinateSystemLike,
} from "../../platform/coords/timeAxis";
import type { AffinePlacementLike } from "../../platform/coords/timeMap";

/**
 * Turning an annotation collection into marks on the timeline.
 *
 * An annotation lives in its COLLECTION's coordinate system — a drawing space —
 * not in any recording's sample grid. The experiment's own collection copies the
 * world's axes with an identity registration, but a collection drawn over a
 * segment's clock is placed by a real edge; either way the annotation VIEW's
 * `asAffine` is what maps a vertex onto the world, and it is reduced here with the
 * same temporal reduction the traces use.
 *
 * ## What can be drawn, and what cannot yet
 *
 *  - EVENT / EVENTS: instants, drawn as vertical lines across every row.
 *  - EPOCH: a span, drawn as a band across every row. "A coordinate the annotation
 *    does not pin is one it spans" — an epoch pins time only, so it spans the rows.
 *  - LINE / PATH / POLYGON with a VALUE axis: these are row-scoped shapes (a
 *    baseline-to-peak line, an amplitude box). The collection's system can carry a
 *    VALUE axis, but NOTHING in the schema says WHICH VIEW'S ROW a value belongs to
 *    — `Annotation` has no view reference and `coordinates` pins only world axes.
 *    In a stacked layout every row has its own scale, so drawing the value would
 *    mean guessing a row. They are drawn by their TIME extent (as an epoch) and
 *    counted in `rowScoped`, so the gap is visible rather than silently wrong.
 *
 * Pure — runs in node.
 */

export type AnnotationLike = {
  id: string;
  name?: string | null;
  kind: string;
  vectors: readonly (readonly number[])[];
  strokeColor?: readonly number[] | null;
  fillColor?: readonly number[] | null;
};

export type EventMark = { id: string; name: string | null; time: number; color: string | null };
export type EpochMark = {
  id: string;
  name: string | null;
  start: number;
  end: number;
  color: string | null;
  /** True for a row-scoped shape drawn by its time extent only. */
  rowScoped: boolean;
};

export type AnnotationMarks = {
  events: EventMark[];
  epochs: EpochMark[];
  /** Row-scoped shapes drawn time-only, because no view is named for their row. */
  rowScoped: number;
  /** Annotations that could not be placed at all. */
  skipped: number;
};

const rgbCss = (rgb: readonly number[] | null | undefined): string | null =>
  rgb && rgb.length >= 3 ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : null;

export const annotationMarks = (args: {
  annotations: readonly AnnotationLike[];
  /** The collection's own coordinate system. */
  system: CoordinateSystemLike | null | undefined;
  /** The annotation VIEW's placement into the world. */
  asAffine: AffinePlacementLike | null | undefined;
  world: CoordinateSystemLike | null | undefined;
}): AnnotationMarks => {
  const marks: AnnotationMarks = { events: [], epochs: [], rowScoped: 0, skipped: 0 };

  const inputTime = timeAxisName(args.system);
  const outputTime = timeAxisName(args.world);
  const map = placementToTimeMap(args.asAffine, inputTime, outputTime);
  if (!map || !inputTime) {
    marks.skipped = args.annotations.length;
    return marks;
  }

  const axes = axisNamesOf(args.system);
  const tIndex = axes.indexOf(inputTime);
  const hasValueAxis = valueAxisName(args.system) != null;
  if (tIndex < 0) {
    marks.skipped = args.annotations.length;
    return marks;
  }

  // The map is linear in the collection's own time units, so "sample" here is just
  // a coordinate along that axis.
  const toWorld = (coordinate: number) => sampleToTime(map, coordinate);

  for (const a of args.annotations) {
    const times = a.vectors
      .map((vertex) => vertex[tIndex])
      .filter((t): t is number => Number.isFinite(t))
      .map(toWorld);
    if (times.length === 0) {
      marks.skipped += 1;
      continue;
    }
    const color = rgbCss(a.strokeColor) ?? rgbCss(a.fillColor);
    const name = a.name ?? null;

    switch (a.kind) {
      case "EVENT":
        marks.events.push({ id: a.id, name, time: times[0], color });
        break;
      case "EVENTS":
        times.forEach((time, i) =>
          marks.events.push({ id: `${a.id}:${i}`, name, time, color }),
        );
        break;
      case "EPOCH": {
        const start = Math.min(...times);
        const end = Math.max(...times);
        marks.epochs.push({ id: a.id, name, start, end, color, rowScoped: false });
        break;
      }
      default: {
        // LINE / PATH / POLYGON. With a VALUE axis they belong to one row that the
        // schema cannot name; without one they are just a time extent.
        const start = Math.min(...times);
        const end = Math.max(...times);
        if (hasValueAxis) marks.rowScoped += 1;
        marks.epochs.push({ id: a.id, name, start, end, color, rowScoped: hasValueAxis });
      }
    }
  }

  marks.events.sort((x, y) => x.time - y.time);
  marks.epochs.sort((x, y) => x.start - y.start);
  return marks;
};
