import { timeToSample, type TimeMap } from "../../platform/coords/timeMap";
import {
  axisNamesOf,
  channelAxisName,
  timeAxisName,
  valueAxisName,
  type AxisLike,
  type CoordinateSystemLike,
} from "../../platform/coords/timeAxis";
import { yToValue } from "../../platform/coords/rowMap";
import type { GesturePoint } from "./annotationTools";

/**
 * Where a VALUE shape lives: a per-trace "value collection".
 *
 * The experiment's own collection is time-only — it copies the world's axes — so
 * a baseline-to-peak line has no y to be written in. A value shape instead goes
 * into a collection DRAWN OVER the trace's lens:
 *
 *  - its axes are the lens' TIME (and CHANNEL) axes plus a VALUE axis;
 *  - its first `derivedFrom` edge is a BY_DIMENSION onto the lens' own time (and
 *    channel) axes, identity on each — so a vertex's time is a lens sample, its
 *    channel the lens' channel, and the VALUE axis is the one the edge drops;
 *  - an annotation layer draws it, whose `asAffine` the server composes along
 *    collection → lens → dataset → world, exactly as it does for the trace.
 *
 * The collection names its row through that edge: its `output` is the lens'
 * space, and every trace layer reading a lens with that space is a row it
 * draws in (several layers may: one per channel of one lens).
 *
 * Pure — runs in node.
 */

export type SpaceLike = CoordinateSystemLike & { id?: string | null };

export type LensSpaceLike = {
  id: string;
  coordinateSystem?: SpaceLike | null;
  dataset: { intrinsicSystem?: SpaceLike | null };
};

/**
 * The lens' own space. An unsliced lens selects everything, and its space IS
 * the dataset's intrinsic grid.
 */
export const lensSpaceOf = (lens: LensSpaceLike): SpaceLike | null =>
  lens.coordinateSystem ?? lens.dataset.intrinsicSystem ?? null;

export type CollectionLike = {
  id: string;
  coordinateSystem?: CoordinateSystemLike | null;
  derivedFrom?: readonly { output?: { id: string } | null }[] | null;
};

/** The space a collection is drawn over — its PRIMARY parent's output — or null. */
export const drawnOverId = (collection: CollectionLike): string | null =>
  collection.derivedFrom?.[0]?.output?.id ?? null;

/** A collection with a VALUE axis, drawn over something: one whose shapes have a row. */
export const isValueCollection = (collection: CollectionLike): boolean =>
  valueAxisName(collection.coordinateSystem) != null && drawnOverId(collection) != null;

type RawLayerLike = {
  __typename?: string;
  id: string;
  annotationCollection?: CollectionLike | null;
  lens?: LensSpaceLike | null;
  channelIndex?: number | null;
};

/** Stable iteration: rawLayers is keyed by id, but insertion order is the fold's. */
const byId = <L extends { id: string }>(layers: Iterable<L>): L[] =>
  [...layers].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** The annotation layer already drawing a value collection over this lens' space. */
export const findValueCollection = (
  rawLayers: Record<string, RawLayerLike>,
  lens: LensSpaceLike,
): { layerId: string; collection: CollectionLike } | null => {
  const spaceId = lensSpaceOf(lens)?.id;
  if (!spaceId) return null;
  for (const raw of byId(Object.values(rawLayers))) {
    const collection = raw.annotationCollection;
    if (raw.__typename !== "AnnotationLayer" || !collection) continue;
    if (isValueCollection(collection) && drawnOverId(collection) === spaceId) {
      return { layerId: raw.id, collection };
    }
  }
  return null;
};

/** A trace a value collection draws over: its layer, and which lens channel it shows. */
export type RowTarget = { traceLayerId: string; channelIndex: number | null };

/** Every trace layer reading a lens whose space this collection is drawn over. */
export const rowTargetsFor = (
  collection: CollectionLike,
  rawLayers: Record<string, RawLayerLike>,
): RowTarget[] => {
  const spaceId = isValueCollection(collection) ? drawnOverId(collection) : null;
  if (!spaceId) return [];
  const out: RowTarget[] = [];
  for (const raw of byId(Object.values(rawLayers))) {
    if (raw.__typename !== "TraceLayer" || !raw.lens) continue;
    if (lensSpaceOf(raw.lens)?.id !== spaceId) continue;
    out.push({ traceLayerId: raw.id, channelIndex: raw.channelIndex ?? null });
  }
  return out;
};

/** The lens channel a trace layer's drawn channel `j` shows. */
export const lensChannelOf = (channelIndex: number | null | undefined, drawn: number): number =>
  channelIndex ?? drawn;

/** The drawn channel a lens channel lands on in a trace layer, or null if it is not shown. */
export const drawnChannelOf = (channelIndex: number | null, lensChannel: number): number | null =>
  channelIndex == null ? lensChannel : lensChannel === channelIndex ? 0 : null;

export type AxisInputLike = { name: string; type: "TIME" | "CHANNEL" | "VALUE"; longName?: string };

export type ValueCollectionInput = {
  name: string;
  description: string;
  axes: AxisInputLike[];
  derivedFrom: {
    kind: "LENS";
    lens: string;
    transform: { kind: "BY_DIMENSION"; inputAxes: string[]; outputAxes: string[]; scale: number[] };
  }[];
};

const freeName = (taken: readonly string[], wanted: string[]): string =>
  wanted.find((n) => !taken.includes(n)) ?? `value_${taken.length}`;

/**
 * The `createAnnotationCollection` input for a value collection over this lens.
 * Null when the lens' space has no TIME axis (not a trace).
 */
export const valueCollectionInput = (args: {
  lens: LensSpaceLike;
  layerLabel: string;
  valueUnit?: string | null;
}): ValueCollectionInput | null => {
  const space = lensSpaceOf(args.lens);
  const t = timeAxisName(space);
  if (!t) return null;
  const c = channelAxisName(space);
  const mapped = c ? [t, c] : [t];
  const v = freeName(axisNamesOf(space), ["value", "v", "amplitude"]);
  return {
    name: `${args.layerLabel} · marks`,
    description: "Shapes drawn over this trace in its (time, value) space.",
    axes: [
      { name: t, type: "TIME" },
      ...(c ? [{ name: c, type: "CHANNEL" as const }] : []),
      { name: v, type: "VALUE", longName: args.valueUnit ? `value (${args.valueUnit})` : "value" },
    ],
    derivedFrom: [
      {
        kind: "LENS",
        lens: args.lens.id,
        // Identity on the named axes; the VALUE axis is the one it drops.
        transform: {
          kind: "BY_DIMENSION",
          inputAxes: mapped,
          outputAxes: mapped,
          scale: mapped.map(() => 1),
        },
      },
    ],
  };
};

/**
 * Gesture points → vertices in a value collection's own axis order.
 *
 * Time is the lens sample (the trace's `timeMap` inverted — the collection's time
 * axis IS the lens'), channel is the lens channel, value is the pointer's y read
 * against the row's band and clim. The channel is also PINNED in `coordinates`:
 * a coordinate an annotation does not pin is one it spans, and a line over one
 * channel spans no other.
 */
export const rowVectors = (args: {
  points: readonly Pick<GesturePoint, "time" | "y">[];
  system: CoordinateSystemLike | null | undefined;
  timeMap: TimeMap;
  band: { bottom: number; top: number };
  clim: { lo: number; hi: number };
  lensChannel: number;
}): { vectors: number[][]; coordinates: { name: string; value: number }[] } | null => {
  const axes: AxisLike[] = axisNamesOf(args.system).map(
    (name) => args.system?.axes?.find((a) => a.name === name) ?? { name },
  );
  const t = timeAxisName(args.system);
  const v = valueAxisName(args.system);
  if (!t || !v) return null;
  const c = channelAxisName(args.system);
  const vectors = args.points.map((p) =>
    axes.map((axis) => {
      if (axis.name === t) return timeToSample(args.timeMap, p.time);
      if (axis.name === v) return yToValue(p.y, args.band, args.clim);
      if (axis.name === c) return args.lensChannel;
      return 0;
    }),
  );
  return { vectors, coordinates: c ? [{ name: c, value: args.lensChannel }] : [] };
};

/** A world-coordinate vertex: the time in the world's time slot, 0 elsewhere. */
export const worldVertex = (world: CoordinateSystemLike | null | undefined, time: number): number[] => {
  const axes = axisNamesOf(world);
  const t = timeAxisName(world);
  if (!t || axes.length === 0) return [time];
  return axes.map((axis) => (axis === t ? time : 0));
};
