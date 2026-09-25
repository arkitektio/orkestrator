import type { DataType } from "zarrita";
import { mapDTypeToMinMax } from "@/lib/zarr/indexing/dtype";
/**
 * The shape both functions here read: a brick-backed layer's lens, whether that
 * layer arrived as a fragment or already normalized into `LayerState`.
 */
type ValueRangeLayer = {
  __typename?: string;
  lens?: {
    activeAnchors?: readonly {
      valueHistogram?: { min?: number | null; max?: number | null } | null;
    }[] | null;
  } | null;
};

/**
 * The largest integer a label id may take and still survive the brick atlas.
 *
 * An `r32f` atlas stores float32, which represents integers EXACTLY up to 2^24 —
 * the same ceiling fabriks uses for its object ordinals — and the 24-bit EMPTY
 * page-table encoding is exact over precisely this range. Above it an id would
 * quantize, and a quantized id is a different object.
 */
export const LABEL_ID_CEILING = 2 ** 24 - 1;

/**
 * The value range a layer's samples are interpreted against.
 *
 * For an IMAGE this is the intensity range used to normalize samples to [0,1]
 * before the render graph's (normalized) contrast limits are applied.
 * For dtypes whose declared range is a weak proxy for the values actually
 * stored (`dtypeRangeIsWeakProxy`) we use the real range from the value
 * histogram when it is available. `uint8`/`uint16` keep their dtype range —
 * it is a workable proxy and existing scenes must render unchanged.
 *
 * For a LABEL mask it is `[0, LABEL_ID_CEILING]` regardless of dtype, and
 * nothing normalizes against it. It is here because the range is ALSO what the
 * EMPTY-brick encoding quantizes against, and over this range the 24-bit encode
 * is exact — an id in a uniform brick survives the page table unchanged. A
 * dtype range would not do: uint16's [0, 65535] through an 8-bit encode loses
 * ~257 raw units per code, so every uniform brick of a mask would decode to a
 * wrong id, and a mask is MOSTLY uniform bricks.
 *
 * This function is the SINGLE place that decision is made, and it has to be:
 * `brickResidency.derivePool` and `nodePlanTracker` call it independently, and
 * if the planner's byte accounting and the pool's allocation ever disagree the
 * plan requests slots that do not exist (the same failure `atlasFormat.ts`
 * documents for `atlasKindForGeometry`).
 */
export function resolveLayerDataRange(
  layer: ValueRangeLayer,
  dtype: string,
): [number, number] {
  if (layer.__typename === "LabelLayer") return [0, LABEL_ID_CEILING];
  if (dtypeRangeIsWeakProxy(dtype)) {
    const range = serverHistogramRange(layer);
    if (range) return range;
  }
  return mapDTypeToMinMax(dtype as DataType);
}

/**
 * Dtypes whose DECLARED range is a poor proxy for the values actually stored,
 * so the real range (server histogram, else `LayerBrickPool.autoRange`) has to
 * stand in for it.
 *
 * - **floats** declare `[0,1]` (`mapDTypeToMinMax`), which whites-out any data
 *   valued >1.
 * - **signed integers** declare a range centred on zero, so ordinary data
 *   valued 0..4000 normalizes into `[0.500, 0.561]` — a flat mid-gray with no
 *   black point, and raw 0 no longer reads as background (the `norm <= 0.001`
 *   empty-space skip in `raymarchStep` never fires, so the volume renders as
 *   opaque half-intensity fog and every brick is marched).
 * - **uint32** declares 2^32 against data that never leaves the low thousands.
 *
 * `uint8`/`uint16` are deliberately absent: their dtype range is a workable
 * proxy and existing scenes must render unchanged.
 *
 * This set is shared with `brickResidency`'s auto-range predicate and the two
 * MUST agree — see the pool-key argument in `octree/poolKey.ts`. `autoRange` is
 * not itself a pool-key field because it is implied by `dtype` (keyed) plus
 * "the range fell back to the dtype's" (keyed as `dataRange`); that implication
 * only holds while both gates test the same dtypes.
 */
export function dtypeRangeIsWeakProxy(dtype: string): boolean {
  const d = dtype.toLowerCase();
  // Canonical zarrita names, plus the numpy-style aliases the dtype string is
  // not guaranteed to have been canonicalized out of (cf. `atlasFormat.ts`).
  return (
    d === "float32" ||
    d === "float64" ||
    d === "int8" ||
    d === "int16" ||
    d === "int32" ||
    d === "uint32" ||
    d.includes("f4") ||
    d.includes("f8") ||
    d.includes("i1") ||
    d.includes("i2") ||
    d.includes("i4") ||
    d.includes("u4")
  );
}

/**
 * The `[min, max]` UNION of the layer's server-provided value histograms, or
 * `null` when none are present/usable. `null` means the dtype fallback would be
 * used — the case that mis-windows the data and that client auto-contrast
 * (`LayerBrickPool.autoRange`) covers.
 *
 * The union, not the first anchor: anchors are per-coordinate (`{c: 0}`,
 * `{c: 1}`, …), so the first one carrying a histogram is channel 0's. Standing
 * it in for the whole pool clips every brighter channel — a 2-channel layer
 * with c=0 at [0, 500] and c=1 reaching 30000 would normalize c=1 to 60 and
 * clamp it to blown-out white. The pool range has to span every channel in it,
 * exactly as `accumulateAutoRange` does from the decoded bricks.
 */
export function serverHistogramRange(
  layer: ValueRangeLayer,
): [number, number] | null {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;

  for (const anchor of layer.lens?.activeAnchors ?? []) {
    const vh = anchor.valueHistogram;
    const min = vh?.min;
    const max = vh?.max;
    if (
      min != null &&
      max != null &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > min
    ) {
      if (min < lo) lo = min;
      if (max > hi) hi = max;
    }
  }

  return hi > lo ? [lo, hi] : null;
}

/**
 * Normalize an absolute contrast value into the `[0,1]` range the raymarch math
 * (GLSL `channelNormalize` and its CPU mirrors) applies clim in. `clim` is stored
 * in absolute base-native value units; `min`/`max` are the layer's base-native
 * range (`resolveLayerDataRange` / `pool.minValue`/`maxValue`). `null` means
 * "full range" — `0` for the low bound, `1` for the high bound.
 */
export function climToUnit(
  clim: number | null | undefined,
  min: number,
  max: number,
  fallback: 0 | 1,
): number {
  if (clim == null) return fallback;
  const span = max - min;
  if (span <= 0) return fallback;
  return Math.min(Math.max((clim - min) / span, 0), 1);
}
