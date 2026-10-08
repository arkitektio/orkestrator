import { useMemo, type ReactNode } from "react";
import type { GraphQLErrorLike } from "@/core/data/plot/model/placementErrors";
import {
  PlotScopeProvider,
  type PlotScope,
  type PlotScopeSpec,
} from "@/core/data/plot/scope/PlotScopeProvider";
import type { ChartFragment } from "@/mikro/api/graphql";
import { AttributeServiceProvider } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { lensLabel } from "@/mikro/lenses";
import { chartScopeSignature } from "../platform/model/chartStructure";
import {
  foldChart,
  selectedLayers,
  type ChartLike,
  type FoldedChart,
  type ServedChartLike,
} from "../platform/model/foldChart";
import {
  createChartStore,
  type ChartLayerFragment,
  type ChartStoreApi,
} from "../platform/stores/chartStore";
import { ChartSystemHost } from "./ChartSystemHost";
import { MIN_VISIBLE_SAMPLES } from "./chartSystem";
import { FEATURE_SLICES } from "./featureSlices";

/** The fold is structural (no generated types); the fragments it passes on ARE the chart's. */
const typedRaw = (raw: Record<string, unknown>) => raw as Record<string, ChartLayerFragment>;

/** The system host reads the plot store as the chart's. */
const System = ({ scope }: { scope: PlotScope<ChartStoreApi> }) => (
  <ChartSystemHost scope={{ chart: scope.plot, range: scope.range, viewer: scope.viewer }} />
);

const SPEC: PlotScopeSpec<ChartLike, FoldedChart, ChartStoreApi> = {
  scopeSignatureOf: chartScopeSignature,
  // A chart is created over a world; one without it has no axis to draw along.
  hasWorld: (chart) => chart.worldCoordinateSystem != null,
  fold: (chart, errors, previous) =>
    foldChart(chart, errors, previous?.memo ?? null, (lens) => lensLabel(lens as never)),
  createStore: (chart, folded) =>
    createChartStore({
      chartId: chart.id,
      axis: {
        name: chart.axis.name,
        unit: chart.axis.unit ?? null,
        type: chart.axis.type ?? null,
      },
      worldId: chart.worldCoordinateSystem?.id ?? null,
      layers: folded.layers,
      rawLayers: typedRaw(folded.rawLayers),
      timeOrigin: folded.timeOrigin,
      worldSpan: folded.worldSpan,
    }),
  sync: (plot, folded) =>
    plot.getState().syncLayers(folded.layers, typedRaw(folded.rawLayers), folded.worldSpan),
  minVisibleSamples: MIN_VISIBLE_SAMPLES,
  featureSlices: FEATURE_SLICES,
  // Layers that measure the same thing share one row and one scale: a chart is
  // for comparing values, where a timeline of recordings stacks them.
  layoutMode: "SHARED",
  System,
};

/**
 * Builds and maintains the chart's store scope.
 *
 * The rebuild / fold / phase contract is the plot engine's
 * (`@/core/data/plot/scope/PlotScopeProvider`): rebuild only when the scope
 * signature moves, fold everything else into the live stores, and never let a
 * fold push the phase back to "initializing". This file says what a CHART is to
 * it: how it folds, what its store holds, and which system hosts its drivers.
 *
 * Wraps the WHOLE page, so the stores reach the sidebar too. Mounts the
 * attribute service a series layer reads its table through.
 */
export const ChartProvider = ({
  chart: served,
  placementErrors,
  children,
}: {
  chart: ChartFragment | null | undefined;
  /** The chart query's GraphQL errors — read, not discarded: `asAffine` errors rather than nulls. */
  placementErrors?: readonly GraphQLErrorLike[] | null;
  children: ReactNode;
}) => {
  const chart = useMemo(
    () => (served ? selectedLayers(served as unknown as ServedChartLike) : served),
    [served],
  );
  return (
    <AttributeServiceProvider>
      <PlotScopeProvider subject={chart} spec={SPEC} placementErrors={placementErrors}>
        {children}
      </PlotScopeProvider>
    </AttributeServiceProvider>
  );
};
