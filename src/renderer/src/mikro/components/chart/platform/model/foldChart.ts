import type { TraceSource } from "@/core/data/plot/sources/traceSource";
import { worldExtentOf, type Span } from "@/core/data/plot/stores/plotStore";
import {
  kindOfTypename,
  normalizeAnnotationLayer,
  normalizeSeriesLayer,
  normalizeTraceLayer,
  type AnnotationChartLayerLike,
  type ChartLayerState,
  type SeriesChartLayerLike,
  type TraceChartLayerLike,
} from "./chartLayerModel";
import { layerStructureKey, orderedLayers, type ChartLayerStructureLike } from "./chartStructure";

/**
 * Folding a chart fragment into the state the stores hold.
 *
 * Runs on EVERY fragment change — a layer restyled, a refetch after an edit —
 * so it has to be cheap in what it causes downstream. The expensive thing
 * downstream is a layer's read: a trace's tiles are packed against a specific
 * `TraceSource`, a series' rows against a specific `SeriesSource`, and a driver
 * resets (and rereads) when that object changes. So a layer whose structural
 * key did NOT move keeps its previous source objects by identity. Renaming,
 * hiding or recolouring a layer therefore costs no reads at all.
 *
 * Pure — runs in node.
 */

type Kept = { key: string; layer: ChartLayerState };
export type ChartFoldMemo = Map<string, Kept>;

type AnyLayerLike = ChartLayerStructureLike &
  (TraceChartLayerLike | SeriesChartLayerLike | AnnotationChartLayerLike);

export type ChartLike = {
  id: string;
  axis: { name: string; unit?: string | null; type?: string | null };
  worldCoordinateSystem?: { id: string; name?: string | null } | null;
  layers?: readonly AnyLayerLike[] | null;
};

/** A layer of a kind the chart query does not select: only its typename comes back. */
type UnselectedLayerLike = { __typename?: string; id?: undefined };

/** A chart as the server returns it: known layers mixed with unselected ones. */
export type ServedChartLike = Omit<ChartLike, "layers"> & {
  layers?: readonly (AnyLayerLike | UnselectedLayerLike)[] | null;
};

/**
 * Drop the layers this client did not select (a newer server's fourth kind).
 * Everything downstream keys on a layer's id, which an unselected kind does
 * not carry.
 */
export const selectedLayers = (chart: ServedChartLike): ChartLike => {
  const layers = chart.layers;
  if (!layers || layers.every((l) => typeof l.id === "string")) return chart as ChartLike;
  return { ...chart, layers: layers.filter((l): l is AnyLayerLike => typeof l.id === "string") };
};

export type FoldedChart = {
  /** Normalized, in display order. Unknown kinds are dropped. */
  layers: ChartLayerState[];
  /** Every layer's raw fragment, by id. */
  rawLayers: Record<string, unknown>;
  worldSpan: Span | null;
  timeOrigin: number;
  /** The memo to pass to the next fold. */
  memo: ChartFoldMemo;
};

export const foldChart = (
  chart: ChartLike,
  placementErrors: ReadonlyMap<string, string>,
  previous: ChartFoldMemo | null,
  /** What a lens is called on a card; the module's (`lensLabel`), passed in. */
  lensText: (lens: TraceChartLayerLike["lens"]) => string = () => "",
): FoldedChart => {
  const chartAxis = chart.axis.name;
  const memo: ChartFoldMemo = new Map();
  const rawLayers: Record<string, unknown> = {};
  const layers: ChartLayerState[] = [];

  for (const raw of orderedLayers(chart.layers)) {
    const key = layerStructureKey(raw);
    const error = placementErrors.get(raw.id) ?? null;
    const kept = previous?.get(raw.id);
    const same = kept && kept.key === key ? kept.layer : null;
    rawLayers[raw.id] = raw;

    let normalized: ChartLayerState | null = null;
    switch (kindOfTypename(raw.__typename)) {
      case "trace": {
        const layer = raw as TraceChartLayerLike;
        // Same structure: keep the pyramid object, so the layer keeps its tiles.
        normalized = normalizeTraceLayer(layer, chartAxis, lensText(layer.lens), error, same?.source);
        break;
      }
      case "series": {
        const next = normalizeSeriesLayer(raw as SeriesChartLayerLike, chartAxis, error);
        // Same structure: keep the source object (the driver compares identity),
        // and the extent the table reported for it.
        normalized = same?.series && next.series ? { ...next, series: same.series } : next;
        break;
      }
      case "annotation":
        normalized = normalizeAnnotationLayer(raw as AnnotationChartLayerLike, chartAxis, error);
        break;
      default:
        // A kind this client does not know: a newer server — skip, do not guess.
        break;
    }
    if (!normalized) continue;
    memo.set(raw.id, { key, layer: normalized });
    layers.push(normalized);
  }

  const extent = worldExtentOf(layers);
  return { layers, rawLayers, worldSpan: extent.span, timeOrigin: extent.timeOrigin, memo };
};

/** The finest sample step among the chart's traces (a series has none). */
export const finestPeriodOf = (layers: readonly { source: TraceSource | null }[]): number => {
  let finest = Infinity;
  for (const layer of layers) {
    const p = layer.source?.levels[0]?.period;
    if (p && Math.abs(p) < finest) finest = Math.abs(p);
  }
  return Number.isFinite(finest) ? finest : 0;
};
