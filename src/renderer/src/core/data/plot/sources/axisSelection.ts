/**
 * Projecting a by-name array selection onto a store's dimension order.
 *
 * The old reader took a `Trace`, which was always 1-D, so "the axis" needed no
 * name and a selection was a single positional slice. The new model has no
 * `Trace`: samples live in an `ArrayDataset` with named axes, and a multi-channel
 * signal is one 2-D dataset rather than a list of 1-D ones.
 *
 * Resolving by name is the whole point: `(channel, time)` and `(time, channel)`
 * are both legal orders, and a positional read of the wrong one returns
 * plausible numbers rather than an error.
 *
 * Pure, and free of React, Apollo and generated types, so it runs in node.
 */

/** A half-open range along one named axis. Omitted bounds mean "all of it". */
export type AxisRange = {
  start?: number | null;
  stop?: number | null;
  /** Read every `step`-th sample. Null/undefined reads every one. */
  step?: number | null;
};

/** What to read, keyed by axis name. Axes left out are read in full. */
export type AxisSelection = Record<string, AxisRange>;

/**
 * Throws on an axis name the dataset does not have. That is deliberate: silently
 * ignoring it would read the full extent of the axis the caller meant to
 * restrict, and the result would look like data rather than like a bug.
 */
export const selectionForAxes = (
  axisNames: readonly string[],
  selection: AxisSelection,
): (AxisRange | null)[] => {
  for (const name of Object.keys(selection)) {
    if (!axisNames.includes(name)) {
      throw new Error(
        `Axis "${name}" is not one of [${axisNames.join(", ")}] — ` +
          `a selection cannot restrict an axis the dataset does not have`,
      );
    }
  }
  // Positional, in the array's own axis order. A null entry means "read this
  // axis in full" — which the reader resolves against the real extent, since only
  // it knows the shape.
  return axisNames.map((name) => selection[name] ?? null);
};
