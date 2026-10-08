import type { AffinePlacementLike } from "@/core/data/plot/coords/timeMap";
import {
  buildAxisTraceSource,
  type DataArrayLike,
  type SliceLike,
  type SourceResult,
} from "@/core/data/plot/sources/traceSource";
import {
  axisNamesOf,
  channelAxisName,
  timeAxisName,
  type CoordinateSystemLike,
} from "../coords/timeAxis";

/**
 * Turning a lens view into something the timeline can read from.
 *
 * The composition itself — the placement, the lens' slices, the pyramid — is
 * the plot engine's (`@/core/data/plot/sources/traceSource`). What is elektro's
 * is how the axes are FOUND: elektro's `Lens` publishes no `renderAxes`, so the
 * lens' (or the dataset's) coordinate system is the axis-selection source, and
 * every lookup is by `AxisType`, never by position.
 */

export type {
  DataArrayLike,
  SliceLike,
  SourceFailure,
  SourceResult,
  TileRead,
  TraceRead,
  TraceSource,
  ZarrStoreLike,
} from "@/core/data/plot/sources/traceSource";
export { planTraceRead, tileReadsFor } from "@/core/data/plot/sources/traceSource";

export type LensLike = {
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  slices?: readonly SliceLike[] | null;
  coordinateSystem?: CoordinateSystemLike | null;
  dataset: {
    axisNames?: readonly string[] | null;
    shape?: readonly number[] | null;
    intrinsicSystem?: CoordinateSystemLike | null;
    dataArrays?: readonly DataArrayLike[] | null;
  };
};

/**
 * The dataset's own axis order.
 *
 * Preferring `axisNames` over the coordinate system's axes because that field is
 * defined as "the axis names, in ARRAY order" — which is the order a store's
 * `shape` and a chunk's strides are in. The system's axes are declared in the same
 * order, but only `axisNames` promises it.
 */
const datasetAxisOrder = (lens: LensLike): string[] => {
  const declared = lens.dataset.axisNames;
  if (declared?.length) return [...declared];
  return axisNamesOf(lens.dataset.intrinsicSystem);
};

export const buildTraceSource = (args: {
  lens: LensLike;
  /** The view's `asAffine`, or null when the server could not condense one. */
  asAffine: AffinePlacementLike | null | undefined;
  /** The experiment's world, whose TIME axis the placement lands on. */
  world?: CoordinateSystemLike | null;
  shapeRatioFallback?: boolean;
  /**
   * `TraceLayer.channelIndex`: the one channel of the LENS' channel run to draw.
   * Null draws every channel the lens covers, stacked.
   */
  channelIndex?: number | null;
}): SourceResult => {
  const { lens, world } = args;

  // The lens' own system names the INPUT side of the placement; the world names
  // the output side. Collapsing the two is how a placement silently degrades.
  const lensSystem = lens.coordinateSystem ?? lens.dataset.intrinsicSystem;
  const inputTimeAxis = timeAxisName(lensSystem);
  const outputTimeAxis = timeAxisName(world);
  if (!inputTimeAxis || !outputTimeAxis) return { ok: false, reason: "no-time-axis" };

  const channelAxis = channelAxisName(lens.dataset.intrinsicSystem);

  return buildAxisTraceSource({
    lens,
    asAffine: args.asAffine,
    datasetAxisNames: datasetAxisOrder(lens),
    along: {
      lens: inputTimeAxis,
      // The dataset's time axis need not be named as the lens' is.
      dataset: timeAxisName(lens.dataset.intrinsicSystem) ?? inputTimeAxis,
      world: outputTimeAxis,
    },
    series: channelAxis
      ? { lens: channelAxisName(lensSystem) ?? channelAxis, dataset: channelAxis }
      : null,
    seriesIndex: args.channelIndex ?? null,
    shapeRatioFallback: args.shapeRatioFallback,
  });
};
