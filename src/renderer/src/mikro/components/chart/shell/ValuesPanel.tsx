import { Canvas } from "@react-three/fiber";
import { Maximize2, Redo2, Undo2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { PlaneCamera } from "@/core/data/plot/plane/PlaneCamera";
import { PlaneFrame, type PlaneAxisSpec, type PlanePick } from "@/core/data/plot/plane/PlaneFrame";
import { PlaneLegend, type LegendEntry, type LegendScale } from "@/core/data/plot/plane/PlaneLegend";
import { PlaneProbeProvider, PlaneTooltip, usePlaneProbeAt } from "@/core/data/plot/plane/planeProbe";
import { createPlaneStore, PlaneStoreContext, usePlaneStore, usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import { pixelOf } from "@/core/data/plot/plane/planeView";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { Button } from "@/core/ui/button";
import { DistributionChartLayer } from "../features/distribution/DistributionChartLayer";
import { PointsChartLayer } from "../features/points/PointsChartLayer";
import type { ValuesPanel as ValuesPanelModel } from "../platform/model/valuesPanels";
import { useChartStore, useChartStoreApi } from "../platform/stores/chartStore";

/** A factory, not a renderer: each panel's canvas builds its own from it. */
const rendererFactory = createWebGPURendererFactory({ label: "chart-values" });

const LAYERS = {
  points: PointsChartLayer,
  distribution: DistributionChartLayer,
} as const;

/**
 * One panel of a chart of VALUES: a plane of its own — store, camera, canvas,
 * gestures, tooltip, legend, fit and undo — over the layers the layout put in
 * it (`valuesPanels`).
 *
 * Everything a plane holds is per plane (`createPlaneStore`), so the panels
 * zoom independently, and a layer finds its plane through the nearest store:
 * the layers themselves do not know there is more than one.
 */
export const ValuesPanel = ({ panel, visible }: { panel: ValuesPanelModel; visible: boolean }) => {
  const plane = useMemo(() => createPlaneStore(), []);
  return (
    <PlaneStoreContext.Provider value={plane}>
      {/* Per panel: a hover asks only this plane's layers, in this plane's space. */}
      <PlaneProbeProvider>
        <Plane panel={panel} visible={visible} />
      </PlaneProbeProvider>
    </PlaneStoreContext.Provider>
  );
};

const Plane = ({ panel, visible }: { panel: ValuesPanelModel; visible: boolean }) => {
  // A box plot's x axis is its groups: the first of this panel's layers that
  // reported any (they share a group column by construction).
  const categories = usePlaneStore((s) => {
    const owner = panel.layers.find((l) => l.id in s.xCategories);
    return owner ? s.xCategories[owner.id] : null;
  });
  const axes = useMemo((): { x: PlaneAxisSpec; y: PlaneAxisSpec } => {
    const { x, y, categorical } = panel.axes;
    return {
      x: categorical ? { title: x, categories: categories ?? [], centred: true } : { title: x },
      y: { title: y },
    };
  }, [panel.axes, categories]);

  const legends = usePlaneStore((s) => s.legends);
  const { entries, scale } = useMemo(() => {
    const all: LegendEntry[] = [];
    // Two grouped layers in one panel group by the same column, so the same
    // group reads in the same colour: say it once.
    const seen = new Set<string>();
    let found: LegendScale | null = null;
    for (const layer of panel.layers) {
      const legend = legends[layer.id];
      if (!legend) continue;
      for (const entry of legend.entries) {
        const said = `${entry.label}|${entry.color}`;
        if (seen.has(said)) continue;
        seen.add(said);
        all.push(entry);
      }
      found = found ?? legend.scale;
    }
    return { entries: all, scale: found };
  }, [panel.layers, legends]);

  // A click pins the row under it (what the Probe tab follows); a click on
  // nothing that names a row lets go of the pin.
  const chartApi = useChartStoreApi();
  const probeAt = usePlaneProbeAt();
  const onPick = useCallback(
    (pick: PlanePick) => {
      const hit = probeAt(pick);
      chartApi.setState({
        pinnedRow: hit?.pick
          ? { layerId: hit.layerId, table: hit.pick.table, id: hit.pick.id, label: hit.title, color: hit.color, at: hit.at }
          : null,
      });
    },
    [probeAt, chartApi],
  );

  return (
    <div className="relative h-full w-full">
      <PlaneFrame
        x={axes.x}
        y={axes.y}
        onPick={onPick}
        overlay={
          <>
            <PlaneLegend entries={entries} scale={scale} />
            <PinnedRing layerIds={panel.layers.map((l) => l.id)} />
            <PlaneTooltip xLabel={axes.x.title} yLabel={axes.y.title} />
          </>
        }
      >
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <PlaneCamera />
          {panel.layers.map((layer) => {
            const Layer = LAYERS[layer.kind as keyof typeof LAYERS];
            return Layer ? <Layer key={layer.id} layerId={layer.id} /> : null;
          })}
        </Canvas>
      </PlaneFrame>
      <PlaneControls />
    </div>
  );
};

/** The pinned point, ringed where it sits — in the panel that draws its layer only. */
const PinnedRing = ({ layerIds }: { layerIds: readonly string[] }) => {
  const pinned = useChartStore((s) => s.pinnedRow);
  const live = usePlaneStore((s) => s.live);
  const size = usePlaneStore((s) => s.sizePx);
  if (!pinned?.at || !layerIds.includes(pinned.layerId)) return null;
  const at = pixelOf(live, size, pinned.at.x, pinned.at.y);
  if (at.px < 0 || at.py < 0 || at.px > size.width || at.py > size.height) return null;
  return (
    <span
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ring-2 ring-black/60"
      style={{ left: at.px, top: at.py, boxShadow: `0 0 0 4px ${pinned.color}` }}
      title={`Pinned: ${pinned.label}`}
    />
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
