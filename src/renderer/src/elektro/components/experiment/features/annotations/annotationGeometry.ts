import { placementToTimeMap, sampleToTime } from "../../platform/coords/timeMap";
import {
  axisNamesOf,
  channelAxisName,
  timeAxisName,
  valueAxisName,
  type CoordinateSystemLike,
} from "../../platform/coords/timeAxis";
import type { AffinePlacementLike } from "../../platform/coords/timeMap";
import { drawnChannelOf, type RowTarget } from "./valueCollections";

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
 *  - LINE / PATH / POLYGON with a VALUE axis: row-scoped shapes (a
 *    baseline-to-peak line, an outline round a burst). A collection drawn over a
 *    trace's lens names its rows through its `derivedFrom` edge (see
 *    `valueCollections.ts`); given those `rowTargets` each shape is emitted per
 *    target row in (world time, value), and drawn against that row's band and
 *    clim. A value collection with NO target (its trace is not in this
 *    experiment) is drawn by its TIME extent (as an epoch) and counted in
 *    `rowScoped`, so the gap is visible rather than silently wrong.
 *
 * Pure — runs in node.
 */

export type AnnotationLike = {
  id: string;
  name?: string | null;
  kind: string;
  vectors: readonly (readonly number[])[];
  /** Pinned coordinates — a value shape's channel, when its vertices omit it. */
  coordinates?: readonly { name: string; value: number }[] | null;
  strokeColor?: readonly number[] | null;
  fillColor?: readonly number[] | null;
};

export type EventMark = {
  /** Unique per mark: an EVENTS annotation expands to `${id}:${i}`. */
  id: string;
  /** The annotation it belongs to — what is selected and deleted. */
  annotationId: string;
  name: string | null;
  time: number;
  color: string | null;
};
export type EpochMark = {
  id: string;
  name: string | null;
  start: number;
  end: number;
  color: string | null;
  /** True for a row-scoped shape drawn by its time extent only. */
  rowScoped: boolean;
};

/** A LINE / PATH / POLYGON in one row's (world time, value) space. */
export type ValueShape = {
  id: string;
  name: string | null;
  kind: "LINE" | "PATH" | "POLYGON";
  times: number[];
  values: number[];
  /** POLYGON: the last vertex joins the first. */
  closed: boolean;
  color: string | null;
};

/** The value shapes one trace row draws. */
export type RowShapes = { traceLayerId: string; channel: number; shapes: ValueShape[] };

export type AnnotationMarks = {
  events: EventMark[];
  epochs: EpochMark[];
  /** Value shapes, per target row. Empty unless the collection has rows. */
  rows: RowShapes[];
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
  /** The trace rows a value collection draws in (`rowTargetsFor`). */
  rowTargets?: readonly RowTarget[];
}): AnnotationMarks => {
  const marks: AnnotationMarks = { events: [], epochs: [], rows: [], rowScoped: 0, skipped: 0 };

  const inputTime = timeAxisName(args.system);
  const outputTime = timeAxisName(args.world);
  const map = placementToTimeMap(args.asAffine, inputTime, outputTime);
  if (!map || !inputTime) {
    marks.skipped = args.annotations.length;
    return marks;
  }

  const axes = axisNamesOf(args.system);
  const tIndex = axes.indexOf(inputTime);
  const valueAxis = valueAxisName(args.system);
  const hasValueAxis = valueAxis != null;
  const vIndex = valueAxis ? axes.indexOf(valueAxis) : -1;
  const channelAxis = channelAxisName(args.system);
  const cIndex = channelAxis ? axes.indexOf(channelAxis) : -1;
  const targets = vIndex >= 0 ? (args.rowTargets ?? []) : [];
  const rows = new Map<string, RowShapes>();
  const rowFor = (traceLayerId: string, channel: number): RowShapes => {
    const key = `${traceLayerId}:${channel}`;
    let row = rows.get(key);
    if (!row) rows.set(key, (row = { traceLayerId, channel, shapes: [] }));
    return row;
  };
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
    // An empty name is no name: the optimistic mark carries "" until the server answers.
    const name = a.name || null;

    switch (a.kind) {
      case "EVENT":
        marks.events.push({ id: a.id, annotationId: a.id, name, time: times[0], color });
        break;
      case "EVENTS":
        times.forEach((time, i) =>
          marks.events.push({ id: `${a.id}:${i}`, annotationId: a.id, name, time, color }),
        );
        break;
      case "EPOCH": {
        const start = Math.min(...times);
        const end = Math.max(...times);
        marks.epochs.push({ id: a.id, name, start, end, color, rowScoped: false });
        break;
      }
      default: {
        // LINE / PATH / POLYGON over named rows: drawn in each row's value space.
        if (targets.length > 0 && (a.kind === "LINE" || a.kind === "PATH" || a.kind === "POLYGON")) {
          const shape = valueShapeOf(a, tIndex, vIndex, toWorld, name, color);
          if (!shape) {
            marks.skipped += 1;
            break;
          }
          const lensChannel = channelOfAnnotation(a, cIndex, channelAxis);
          for (const target of targets) {
            const drawn = drawnChannelOf(target.channelIndex, lensChannel);
            if (drawn != null) rowFor(target.traceLayerId, drawn).shapes.push(shape);
          }
          break;
        }
        // With a VALUE axis but no row to draw in, or with none at all: a time extent.
        const start = Math.min(...times);
        const end = Math.max(...times);
        if (hasValueAxis) marks.rowScoped += 1;
        marks.epochs.push({ id: a.id, name, start, end, color, rowScoped: hasValueAxis });
      }
    }
  }

  marks.events.sort((x, y) => x.time - y.time);
  marks.epochs.sort((x, y) => x.start - y.start);
  marks.rows = [...rows.values()];
  return marks;
};

/** The lens channel a value shape sits on: its channel coordinate, or its pin, or 0. */
const channelOfAnnotation = (
  a: AnnotationLike,
  cIndex: number,
  channelAxis: string | null,
): number => {
  const fromVertex = cIndex >= 0 ? a.vectors[0]?.[cIndex] : undefined;
  if (fromVertex !== undefined && Number.isFinite(fromVertex)) return Math.round(fromVertex);
  const pinned = channelAxis ? a.coordinates?.find((c) => c.name === channelAxis) : undefined;
  return pinned?.value ?? 0;
};

const valueShapeOf = (
  a: AnnotationLike,
  tIndex: number,
  vIndex: number,
  toWorld: (t: number) => number,
  name: string | null,
  color: string | null,
): ValueShape | null => {
  const times: number[] = [];
  const values: number[] = [];
  for (const vertex of a.vectors) {
    const t = vertex[tIndex];
    const v = vertex[vIndex];
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    times.push(toWorld(t));
    values.push(v);
  }
  if (times.length < 2) return null;
  return {
    id: a.id,
    name,
    kind: a.kind as ValueShape["kind"],
    times,
    values,
    closed: a.kind === "POLYGON" && times.length >= 3,
    color,
  };
};
