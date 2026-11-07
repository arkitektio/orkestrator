import { Canvas } from "@react-three/fiber";
import { Maximize2, Redo2, Undo2 } from "lucide-react";
import { useMemo } from "react";
import { LoadingBar } from "@/core/data/plot/chrome/LoadingBar";
import { PlaneCamera } from "@/core/data/plot/plane/PlaneCamera";
import { PlaneFrame, type PlaneAxisSpec } from "@/core/data/plot/plane/PlaneFrame";
import { PlaneLegend, type LegendEntry, type LegendScale } from "@/core/data/plot/plane/PlaneLegend";
import { PlaneProbeProvider, PlaneTooltip } from "@/core/data/plot/plane/planeProbe";
import { createPlaneStore, PlaneStoreContext, usePlaneStore, usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import { drawnLayersKey, isLayerHidden } from "@/core/data/plot/stores/plotStore";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { useKeepTabLive } from "@/core/tabs/keepLive";
import { Button } from "@/core/ui/button";
import { DistributionChartLayer } from "../features/distribution/DistributionChartLayer";
import { PointsChartLayer } from "../features/points/PointsChartLayer";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import { useChartStore, useChartStoreApi } from "../platform/stores/chartStore";

/**
 * A chart of VALUES: a table's rows drawn at the values of their columns, on a
 * plane of two equal axes -- a scatter of `area` against `volume`, a histogram
 * of `area` per condition, a box per cluster.
 *
 * Its world (whose rows) is not drawn: position is the measurement. The view is
 * the plot engine's plane (`@/core/data/plot/plane`): its own camera, axes,
 * gestures, tooltip and legend, on the same WebGPU renderer as every other
 * canvas. Layers come from the chart store as for an AXIS chart, so cards,
 * optimistic edits and visibility work the same.
 */

const rendererFactory = createWebGPURendererFactory({ label: "chart-values" });

const withUnit = (name: string, unit: string | null | undefined) => (unit ? `${name} · ${unit}` : name);

/** What the axes say, read off the first drawn layer (a VALUES chart holds one kind). */
const axesOf = (layer: ChartLayerState | undefined, categories: readonly string[] | null): { x: PlaneAxisSpec; y: PlaneAxisSpec } => {
  const values = layer?.values;
  if (!values) return { x: {}, y: {} };
  if (values.kind === "points") {
    return { x: { title: withUnit(values.x, values.units.x) }, y: { title: withUnit(values.y, values.units.y) } };
  }
  if (layer.mark === "BOX") {
    return {
      x: { title: values.group ?? null, categories: categories ?? [], centred: true },
      y: { title: withUnit(values.value, values.unit) },
    };
  }
  return {
    x: { title: withUnit(values.value, values.unit) },
    y: { title: values.group ? "fraction of the group's rows" : "rows" },
  };
};

export const ValuesViewport = () => {
  const plane = useMemo(() => createPlaneStore(), []);
  return (
    <PlaneStoreContext.Provider value={plane}>
      <PlaneProbeProvider>
        <ValuesPlane />
      </PlaneProbeProvider>
    </PlaneStoreContext.Provider>
  );
};

const LAYERS = {
  points: PointsChartLayer,
  distribution: DistributionChartLayer,
} as const;

const ValuesPlane = () => {
  const visible = useTabVisible();
  useKeepTabLive();
  const key = useChartStore(drawnLayersKey);
  const api = useChartStoreApi();
  const drawn = useMemo(
    () => api.getState().layers.filter((l) => l.placeability.drawable && !isLayerHidden(l) && (l.kind === "points" || l.kind === "distribution")),
    // The key stands for the array (the two-plane idiom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, api],
  );
  const first = useChartStore((s) => s.layers.find((l) => l.id === drawn[0]?.id));
  const categories = usePlaneStore((s) => s.xCategories);
  const axes = useMemo(() => axesOf(first, categories), [first, categories]);
  const legends = usePlaneStore((s) => s.legends);
  const { entries, scale } = useMemo(() => {
    const all: LegendEntry[] = [];
    let found: LegendScale | null = null;
    for (const layer of drawn) {
      const legend = legends[layer.id];
      if (!legend) continue;
      all.push(...legend.entries);
      found = found ?? legend.scale;
    }
    return { entries: all, scale: found };
  }, [drawn, legends]);

  return (
    <div className="dark text-foreground relative h-full w-full overflow-hidden rounded-lg bg-black">
      <PlaneFrame
        x={axes.x}
        y={axes.y}
        overlay={
          <>
            <PlaneLegend entries={entries} scale={scale} />
            <PlaneTooltip xLabel={axes.x.title} yLabel={axes.y.title} />
          </>
        }
      >
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <PlaneCamera />
          {drawn.map((layer) => {
            const Layer = LAYERS[layer.kind as keyof typeof LAYERS];
            return <Layer key={layer.id} layerId={layer.id} />;
          })}
        </Canvas>
      </PlaneFrame>
      {drawn.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center text-xs text-muted-foreground">
            Nothing in this chart can be drawn yet. The Layers tab says why for each layer, and adds one: points of two
            columns, or the distribution of one.
          </div>
        </div>
      )}
      <PlaneControls />
      <LoadingBar />
    </div>
  );
};

const PlaneControls = () => {
  const api = usePlaneStoreApi();
  const canUndo = usePlaneStore((s) => s.history.length > 0);
  const canRedo = usePlaneStore((s) => s.future.length > 0);
  const button = "h-6 w-6 p-0 text-foreground/60 hover:text-foreground";
  return (
    <div className="absolute left-[72px] top-3 flex gap-0.5 rounded-md border border-white/10 bg-zinc-950/70 p-0.5 backdrop-blur">
      <Button size="icon" variant="ghost" className={button} title="Fit the data (double-click the plot)" onClick={() => api.getState().fit()}>
        <Maximize2 className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className={button} disabled={!canUndo} title="Back to the previous view" onClick={() => api.getState().undo()}>
        <Undo2 className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className={button} disabled={!canRedo} title="Forward again" onClick={() => api.getState().redo()}>
        <Redo2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
