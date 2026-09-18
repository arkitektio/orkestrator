/**
 * Finding the axes of a coordinate system by what they ARE, not where they sit.
 *
 * mikro's `Lens` publishes `renderAxes`, which tells a client which axis to treat
 * as x, y, z. Elektro's does not — so the axes on a lens' (or a dataset's)
 * coordinate system are the axis-selection source, and picking the right one is
 * the client's job.
 *
 * Every lookup here is by `AxisType`, never by position. A `(channel, time)`
 * dataset and a `(time, channel)` one are both legal, and guessing "axis 0 is
 * time" reads one of them backwards while returning numbers that look like data.
 * When there is no axis of the wanted type these return null; callers badge that
 * rather than falling back to a position.
 *
 * Pure and structurally typed — no generated enums — so it runs in node. The
 * `type` strings are `AxisType` values from the elektro schema.
 */

export type AxisLike = {
  name: string;
  /** An `AxisType`: SPACE | TIME | CHANNEL | COORDINATE | DISPLACEMENT | FREQUENCY | VALUE | INDEX. */
  type?: string | null;
  order?: number | null;
  unit?: string | null;
};

export type CoordinateSystemLike = {
  axes?: readonly AxisLike[] | null;
};

/** Axes in declared order. `order` wins; ties keep the given order. */
const ordered = (system?: CoordinateSystemLike | null): AxisLike[] =>
  [...(system?.axes ?? [])]
    .map((axis, index) => ({ axis, index }))
    .sort(
      (a, b) =>
        (a.axis.order ?? a.index) - (b.axis.order ?? b.index) ||
        a.index - b.index,
    )
    .map(({ axis }) => axis);

const firstOfType = (
  system: CoordinateSystemLike | null | undefined,
  type: string,
): AxisLike | null => ordered(system).find((a) => a.type === type) ?? null;

export const timeAxis = (system?: CoordinateSystemLike | null) =>
  firstOfType(system, "TIME");

/**
 * The sample axis' name, or null when this system has none.
 *
 * A lens with no TIME axis is not a trace, and the view over it is not drawable —
 * which is a thing to badge, not to work around.
 */
export const timeAxisName = (system?: CoordinateSystemLike | null) =>
  timeAxis(system)?.name ?? null;

/** The channel axis: what a multi-channel signal's rows are indexed by. */
export const channelAxisName = (system?: CoordinateSystemLike | null) =>
  firstOfType(system, "CHANNEL")?.name ?? null;

/**
 * The value axis. Only ever present on a DRAWING space — an annotation
 * collection's system — where a line from baseline to peak needs somewhere to be
 * drawn. A recording's own system has no VALUE axis: its values are the data, not
 * a coordinate.
 */
export const valueAxisName = (system?: CoordinateSystemLike | null) =>
  firstOfType(system, "VALUE")?.name ?? null;

/** Axis names in declared order, for projecting a selection onto a store. */
export const axisNamesOf = (system?: CoordinateSystemLike | null): string[] =>
  ordered(system).map((a) => a.name);

/**
 * The length of one named axis, read from a parallel `axisNames` / `shape` pair.
 *
 * These two always come from the same source and index each other; taking them as
 * separate arguments keeps that pairing visible at the call site. Null when the
 * axis is absent or the two disagree in length.
 */
export const axisSize = (
  axisNames: readonly string[] | null | undefined,
  shape: readonly number[] | null | undefined,
  axis: string | null | undefined,
): number | null => {
  if (!axisNames || !shape || !axis) return null;
  if (axisNames.length !== shape.length) return null;
  const index = axisNames.indexOf(axis);
  return index < 0 ? null : (shape[index] ?? null);
};

/**
 * How many channels a dataset holds: the size of its CHANNEL axis, or 1 when it
 * has none.
 *
 * `AnalogSignalChannel` used to be its own type with its own id, so a channel was
 * something you could count and link to. It is now a position along an axis, and
 * this is the only honest way to ask how many there are.
 */
export const channelCount = (dataset: {
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  intrinsicSystem?: CoordinateSystemLike | null;
}): number => {
  const axis = channelAxisName(dataset.intrinsicSystem);
  return axisSize(dataset.axisNames, dataset.shape, axis) ?? 1;
};

/** How many samples along the time axis, or null when there is no time axis. */
export const sampleCount = (dataset: {
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  intrinsicSystem?: CoordinateSystemLike | null;
}): number | null =>
  axisSize(
    dataset.axisNames,
    dataset.shape,
    timeAxisName(dataset.intrinsicSystem),
  );
