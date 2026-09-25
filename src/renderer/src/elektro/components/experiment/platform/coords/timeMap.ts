import { evalTransform } from "@/core/data/scene/coords/transformGraph";

/**
 * Reducing a view's `asAffine` to the one number pair a timeline needs.
 *
 * A view's placement is an M×(N+1) matrix over named axes. A trace viewer cares
 * about exactly one row and one column of it — the world's time axis against the
 * lens' sample axis — which reduces to:
 *
 *     world_time(sample i) = t0 + period * i
 *
 * ## Why this is not `placementToSpatialAffine`
 *
 * The shared reducer ends `return isIdentity4(m) ? null : m`, and its docblock
 * says callers read null as identity. That is safe in mikro, where an identity
 * placement means "draw it where it already is". Here it is not: an identity time
 * map is `{period: 1, t0: 0}` — one world unit per sample, starting at zero —
 * which is a perfectly ordinary, drawable placement, and collapsing it into the
 * same null that means "no placement at all" would drop the layer.
 *
 * So this calls `evalTransform` directly and decides for itself what null means.
 * `spatialAxisTriple` is unusable for the same class of reason: it filters
 * `type === "SPACE"` and reverses for image conventions.
 *
 * ## Why the slot list works at all
 *
 * `evalTransform`'s `spatial` / `spatialOut` arguments are just **slot name
 * lists** — nothing about them is geometrically spatial. Passing
 * `[timeAxisName, null, null]` puts time in slot 0, and the returned 4×4 then
 * carries `m[0][0]` as the scale from sample index to world time (the sampling
 * period) and `m[0][3]` as the world time of sample 0. The by-name row and column
 * addressing, the `inverted` handling and the translation column at index
 * `inputAxes.length` are all already correct and already tested there.
 */

export type TimeMap = {
  /** World time units per lens sample. The sampling period. */
  period: number;
  /** World time of lens sample 0. */
  t0: number;
  /**
   * `AffinePlacement.total` — false when the path constrains only some output
   * axes and the rest pass through. Carried for the badge, NOT used to decide
   * drawability: what decides that is whether the time axis got a row at all.
   */
  total: boolean;
};

export type AffinePlacementLike = {
  matrix?: readonly (readonly number[])[] | null;
  inputAxes?: readonly string[] | null;
  outputAxes?: readonly string[] | null;
  total?: boolean | null;
};

/**
 * Reduce a placement to a time map, or null when it does not constrain time.
 *
 * Null means "this view has no place on the timeline" and the caller must not
 * draw it. It never means identity.
 */
export const placementToTimeMap = (
  placement: AffinePlacementLike | null | undefined,
  inputTimeAxis: string | null | undefined,
  outputTimeAxis: string | null | undefined,
): TimeMap | null => {
  if (!placement?.matrix?.length) return null;
  if (!inputTimeAxis || !outputTimeAxis) return null;

  const inputAxes = placement.inputAxes ?? [];
  const outputAxes = placement.outputAxes ?? [];

  // Check both ends BEFORE reducing. `evalTransform` only refuses a mismatched
  // output side when the input side matched something; if neither end names our
  // axes it hands back an identity, which here would read as "1 world unit per
  // sample from zero" — a confident, wrong placement rather than an absent one.
  //
  // A missing output row is exactly the `total: false` case that matters: the
  // path says nothing about time, so there is nothing to draw against.
  if (!inputAxes.includes(inputTimeAxis)) return null;
  if (!outputAxes.includes(outputTimeAxis)) return null;

  const m = evalTransform(
    { __typename: "AffineTransformation", affine: placement.matrix },
    inputAxes,
    outputAxes,
    [inputTimeAxis, null, null],
    [outputTimeAxis, null, null],
  );
  if (!m) return null;

  const period = m[0][0];
  const t0 = m[0][3];
  if (!Number.isFinite(period) || !Number.isFinite(t0)) return null;
  // A zero period collapses every sample onto one instant: not a timeline.
  if (period === 0) return null;

  return { period, t0, total: placement.total ?? false };
};

/** World time of a lens sample index. */
export const sampleToTime = (map: TimeMap, sample: number): number =>
  map.t0 + map.period * sample;

/**
 * Lens sample index for a world time. Fractional — callers round outward when
 * turning a time window into a read.
 */
export const timeToSample = (map: TimeMap, time: number): number =>
  (time - map.t0) / map.period;

/**
 * The world-time span a lens of `sampleCount` samples covers, ordered low→high.
 *
 * A negative period (time running backwards against the sample index) is legal
 * and must not produce an inverted span — every caller of this treats it as
 * `[min, max]`.
 */
export const spanOf = (
  map: TimeMap,
  sampleCount: number,
): { start: number; end: number } => {
  const a = sampleToTime(map, 0);
  const b = sampleToTime(map, Math.max(0, sampleCount - 1));
  return a <= b ? { start: a, end: b } : { start: b, end: a };
};

/**
 * Reduce a single transformation EDGE (not a composed placement) to a time map.
 *
 * Used where there is no server-composed `asAffine` to ask for — a segment's
 * signals carry their `samplingLaw`, the one edge from their sample grid onto the
 * segment's clock, and nothing else (R1-B: the client composes here, because the
 * schema says composing `SourcePlacement.path` is the client's job). Canonically a
 * `Sequence[Scale, Translation]`, which `evalTransform` composes in order.
 */
export const edgeToTimeMap = (
  edge: Parameters<typeof evalTransform>[0] | null | undefined,
  inputTimeAxis: string | null | undefined,
  outputTimeAxis: string | null | undefined,
): TimeMap | null => {
  if (!edge || !inputTimeAxis || !outputTimeAxis) return null;
  const e = edge as { inputAxes?: readonly string[]; outputAxes?: readonly string[] };
  const inputAxes = e.inputAxes ?? [];
  const outputAxes = e.outputAxes ?? [];
  if (!inputAxes.includes(inputTimeAxis) || !outputAxes.includes(outputTimeAxis)) return null;

  const m = evalTransform(
    edge,
    inputAxes,
    outputAxes,
    [inputTimeAxis, null, null],
    [outputTimeAxis, null, null],
  );
  if (!m) return null;
  const period = m[0][0];
  const t0 = m[0][3];
  if (!Number.isFinite(period) || !Number.isFinite(t0) || period === 0) return null;
  return { period, t0, total: true };
};
