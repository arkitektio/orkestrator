import {
  evaluatePin,
  type AnchorLayer,
  type LayerCoverage,
} from "../../features/annotations/anchorVisibility";

/**
 * Which planes an RGB layer can map to its primaries, and what is known about
 * each — the data half of `RgbChannelEditor`, kept pure so the matching rules
 * are testable without a renderer.
 *
 * An RGB layer's `redIndex`/`greenIndex`/`blueIndex` are indices along ONE
 * axis (`intensityAxis`) of the dataset's intrinsic grid. The lens already
 * ships a name and a distribution for each of those indices —
 * `SceneLens.activeAnchors` carries one anchor per coordinate, with
 * `channelLabel` and `valueHistogram` — so a picker can offer "2 · mCherry"
 * with its own histogram instead of an unbounded number box.
 *
 * The per-plane question is NOT the one `matchAnchor` answers. That one asks
 * "is this anchor's coordinate on screen", and for an RGB layer every one of
 * the three mapped planes is, so all three would match every anchor. Here the
 * intensity pin must equal the plane being asked about, exactly; the anchor's
 * OTHER pins (a `t`, a `z`) are still evaluated through `evaluatePin` so the
 * two modules cannot drift on what a non-intensity pin means.
 */

/** The `valueHistogram` shape both the sparkline and the levels traces read. */
export type PlaneHistogram = {
  bins: number[];
  histogram: number[];
  min?: number | null;
  max?: number | null;
  p1?: number | null;
  p99?: number | null;
};

export type Plane = {
  /** Index along `intensityAxis`. */
  index: number;
  /** The acquisition's name for it, when an anchor names it. */
  label: string | null;
  /** What to call it in the UI — the label, else `plane N`. */
  display: string;
  histogram: PlaneHistogram | null;
};

type AnchorLike = {
  coordinates?: unknown;
  channelLabel?: { label?: string | null } | null;
  valueHistogram?: PlaneHistogram | null;
};

export type PlaneLens = {
  activeAnchors?: readonly AnchorLike[] | null;
  dataset: {
    axisNames?: readonly string[] | null;
    dataArrays?: readonly { level: number; shape: readonly number[] }[] | null;
  };
};

/**
 * How many planes exist along `axis`.
 *
 * From the LEVEL-0 data array, not `lens.shape`: anchor coordinates are
 * level-0 pixel indices of the dataset's intrinsic grid (the anchor fragment
 * says so), and that is the same grid `layerCoverage` measures against. Zero
 * means "unknown" — the caller keeps the raw index rather than offering a list
 * it cannot fill.
 */
export const intensityExtent = (lens: PlaneLens, axis: string | null): number => {
  if (!axis) return 0;
  const axisNames = lens.dataset.axisNames ?? [];
  const position = axisNames.indexOf(axis);
  if (position < 0) return 0;
  const level0 = (lens.dataset.dataArrays ?? []).reduce<{
    level: number;
    shape: readonly number[];
  } | null>((best, da) => (best === null || da.level < best.level ? da : best), null);
  const extent = level0?.shape[position];
  return typeof extent === "number" && Number.isInteger(extent) && extent > 0 ? extent : 0;
};

/** The intensity pin of an anchor, or null when it pins that axis to nothing. */
const intensityPin = (coordinates: unknown, axis: string): number | null => {
  if (typeof coordinates !== "object" || coordinates === null || Array.isArray(coordinates)) {
    return null;
  }
  const raw = (coordinates as Record<string, unknown>)[axis];
  const value =
    typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isInteger(value) ? value : null;
};

/**
 * The anchor describing plane `index`, or null.
 *
 * Every non-intensity pin must be met by the layer's coverage: an anchor
 * scoped to `{c: 1, t: 7}` describes plane 1 only while the layer is showing
 * t=7, and naming the plane after it at t=0 would attribute the wrong
 * acquisition to it. Later anchors do not override an earlier match — the
 * first satisfied one wins, which is the order the server sent them in.
 */
export const anchorForPlane = (
  lens: PlaneLens,
  coverage: LayerCoverage,
  axis: string | null,
  index: number,
): AnchorLike | null => {
  if (!axis) return null;
  for (const anchor of lens.activeAnchors ?? []) {
    if (intensityPin(anchor.coordinates, axis) !== index) continue;
    const others = Object.entries(
      (anchor.coordinates ?? {}) as Record<string, unknown>,
    ).filter(([pinAxis, raw]) => pinAxis !== axis && raw !== null && raw !== undefined);
    const satisfied = others.every(([pinAxis, raw]) => {
      const value = typeof raw === "number" ? raw : Number(raw);
      // An unreadable pin is a claim we failed to evaluate, not a global
      // anchor — `matchAnchor`'s rule, kept identical here.
      if (!Number.isInteger(value)) return false;
      return evaluatePin(pinAxis, value, coverage).met;
    });
    if (satisfied) return anchor;
  }
  return null;
};

/** Every plane along `axis`, in index order, named where an anchor names it. */
export const resolvePlanes = (
  lens: PlaneLens,
  coverage: LayerCoverage,
  axis: string | null,
): Plane[] => {
  const extent = intensityExtent(lens, axis);
  return Array.from({ length: extent }, (_, index) => describePlane(lens, coverage, axis, index));
};

/** One plane, for an index that may sit outside the known extent (a stored
 *  mapping the dataset has since outgrown must still render as itself). */
export const describePlane = (
  lens: PlaneLens,
  coverage: LayerCoverage,
  axis: string | null,
  index: number,
): Plane => {
  const anchor = anchorForPlane(lens, coverage, axis, index);
  const label = anchor?.channelLabel?.label?.trim() || null;
  const histogram = anchor?.valueHistogram ?? null;
  return {
    index,
    label,
    display: label ?? `plane ${index}`,
    histogram: histogram && histogram.histogram?.length > 0 ? histogram : null,
  };
};

/** Whether a histogram is usable as a levels trace / sparkline. */
export const hasCounts = (histogram: PlaneHistogram | null): boolean =>
  !!histogram && histogram.histogram.length > 0;

/** The `[p1, p99]` union across the given planes, or null when none carry
 *  percentiles — the "Auto" exposure for a three-plane picture is the range
 *  that holds all three, not whichever plane happens to come first. */
export const percentileUnion = (
  planes: readonly Plane[],
): [number, number] | null => {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const plane of planes) {
    const p1 = plane.histogram?.p1;
    const p99 = plane.histogram?.p99;
    if (p1 == null || p99 == null || !Number.isFinite(p1) || !Number.isFinite(p99)) continue;
    if (p1 < lo) lo = p1;
    if (p99 > hi) hi = p99;
  }
  return hi > lo ? [lo, hi] : null;
};

/** The `[min, max]` union across the given planes, for the plot's extent. */
export const rangeUnion = (planes: readonly Plane[]): [number, number] | null => {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const plane of planes) {
    const min = plane.histogram?.min;
    const max = plane.histogram?.max;
    if (min == null || max == null || !Number.isFinite(min) || !Number.isFinite(max)) continue;
    if (min < lo) lo = min;
    if (max > hi) hi = max;
  }
  return hi > lo ? [lo, hi] : null;
};

/** Axes a lens could carry its colour components along: every dataset axis
 *  that is not already spent on geometry. One candidate means no choice to
 *  offer, and the picker stays out of the card. */
export const intensityAxisCandidates = (
  lens: PlaneLens,
  layer: Pick<AnchorLayer, "phasorAxis"> & {
    lens: { renderAxes?: { x?: string | null; y?: string | null; z?: string | null } | null };
  },
): string[] => {
  const spent = new Set(
    [
      layer.lens.renderAxes?.x,
      layer.lens.renderAxes?.y,
      layer.lens.renderAxes?.z,
      layer.phasorAxis,
    ].filter((axis): axis is string => Boolean(axis)),
  );
  return (lens.dataset.axisNames ?? []).filter(
    (axis) => !spent.has(axis) && intensityExtent(lens, axis) > 1,
  );
};
