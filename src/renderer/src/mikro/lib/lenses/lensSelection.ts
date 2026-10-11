/**
 * What a lens SELECTS, as plain data, and the arithmetic between a selection
 * and the index or position it stands for.
 *
 * A layer names its data through lenses: one channel of an array is a lens
 * whose channel axis is sliced to one position, one slice of a sparse matrix is
 * a lens whose windows pin every identifying axis. The renderer and the pickers
 * think in the other direction — channel 2, gene 4711 — so both translations
 * live here, once.
 *
 * Pure, with no runtime import of the generated api (that module pulls in the
 * Apollo client and with it `window`): the scene's model, the add-layer engine
 * and the node-env suites all import it.
 */

/** One slice of an array lens, in the server's spelling (dataset index space). */
export type SliceLike = {
  axis: string;
  start?: number | null;
  stop?: number | null;
  step?: number | null;
};

/** One window of a non-array lens: an inclusive range, an open side as null. */
export type WindowLike = {
  axis: string;
  min?: number | null;
  max?: number | null;
};

/** One position along one identifying axis of a sparse matrix. */
export type AxisPosition = { axis: string; value: number };

/**
 * A lens reduced to what it selects and from which container.
 *
 * `at` is null for a sparse lens whose windows do not all pin one position: it
 * selects a range, which no colouring reads.
 */
export type LensSelection =
  | { kind: "array"; id: string; dataset: string; slices: readonly SliceLike[] }
  | { kind: "sparse"; id: string; dataset: string; at: readonly AxisPosition[] | null }
  | { kind: "other"; id: string };

/** Resolve a lens id to its selection, or undefined when it is not known yet. */
export type LensLookup = (id: string) => LensSelection | undefined;

/**
 * The position a lens pins `axis` to, as a DATASET index, or null when it keeps
 * more than one position (or does not slice the axis at all).
 */
export function pinnedIndex(
  slices: readonly SliceLike[] | null | undefined,
  axis: string | null | undefined,
): number | null {
  if (!axis || !slices) return null;
  const slice = slices.find((candidate) => candidate.axis === axis);
  if (!slice) return null;
  const start = slice.start ?? 0;
  if (slice.stop == null) return null;
  return slice.stop - start === 1 ? start : null;
}

/** `base` with `axis` pinned to one dataset index: the slices of a channel lens. */
export function channelSlices(
  base: readonly SliceLike[] | null | undefined,
  axis: string,
  index: number,
): { axis: string; start: number | null; stop: number | null; step: number | null }[] {
  const rest = (base ?? [])
    .filter((slice) => slice.axis !== axis)
    .map((slice) => ({
      axis: slice.axis,
      start: slice.start ?? null,
      stop: slice.stop ?? null,
      step: slice.step ?? null,
    }));
  return [...rest, { axis, start: index, stop: index + 1, step: 1 }];
}

/**
 * The dataset indices a lens keeps along `axis`, in order: every index of the
 * axis when the lens does not slice it. `extent` is the DATASET's length along
 * the axis.
 */
export function keptPositions(
  slices: readonly SliceLike[] | null | undefined,
  axis: string | null | undefined,
  extent: number,
): number[] {
  const length = Math.max(0, Math.floor(extent));
  const slice = axis ? (slices ?? []).find((candidate) => candidate.axis === axis) : undefined;
  const step = Math.max(1, slice?.step ?? 1);
  const start = Math.max(0, Math.min(length, slice?.start ?? 0));
  const stop = Math.max(start, Math.min(length, slice?.stop ?? length));
  const positions: number[] = [];
  for (let index = start; index < stop; index += step) positions.push(index);
  return positions;
}

const byAxis = <T extends { axis: string }>(a: T, b: T): number =>
  a.axis < b.axis ? -1 : a.axis > b.axis ? 1 : 0;

/** A position as the windows of the sparse lens that pins it. */
export function positionWindows(
  at: readonly AxisPosition[],
): { axis: string; min: number; max: number }[] {
  return [...at].sort(byAxis).map(({ axis, value }) => ({ axis, min: value, max: value }));
}

/**
 * The position a sparse lens' windows pin, sorted by axis, or null when a
 * window is a range (or the lens selects everything).
 */
export function atOfWindows(
  windows: readonly WindowLike[] | null | undefined,
): AxisPosition[] | null {
  if (!windows || windows.length === 0) return null;
  const at: AxisPosition[] = [];
  for (const window of windows) {
    if (window.min == null || window.max == null || window.min !== window.max) return null;
    at.push({ axis: window.axis, value: window.min });
  }
  return at.sort(byAxis);
}

/**
 * Identity of an array selection: the dataset and its slices, order-free. Two
 * spellings of one selection may still key apart (an explicit full range
 * against an omitted one); the only cost is one idempotent mutation.
 */
export function arraySelectionKey(datasetId: string, slices: readonly SliceLike[]): string {
  const parts = [...slices]
    .sort(byAxis)
    .map((slice) => `${slice.axis}:${slice.start ?? ""}:${slice.stop ?? ""}:${slice.step ?? 1}`);
  return `a|${datasetId}|${parts.join(",")}`;
}

/** Identity of a sparse position: the matrix and the position, order-free. */
export function sparseSelectionKey(datasetId: string, at: readonly AxisPosition[]): string {
  const parts = [...at].sort(byAxis).map(({ axis, value }) => `${axis}=${value}`);
  return `s|${datasetId}|${parts.join(",")}`;
}
