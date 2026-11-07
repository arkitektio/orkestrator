import { useMemo } from "react";
import { LayoutModeToggle } from "@/core/data/plot/chrome/LayoutModeToggle";
import { LoadingBar } from "@/core/data/plot/chrome/LoadingBar";
import { isLayerHidden } from "@/core/data/plot/stores/plotStore";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { useKeepTabLive } from "@/core/tabs/keepLive";
import { cn } from "@/core/util/utils";
import { useChartLayoutWrite } from "../platform/edits/useChartLayoutWrite";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import { chartLayoutOf } from "../platform/model/chartStructure";
import { valuesPanels, type ValuesPanel as ValuesPanelModel } from "../platform/model/valuesPanels";
import { useChartStore } from "../platform/stores/chartStore";
import { ValuesPanel } from "./ValuesPanel";

/**
 * A chart of VALUES: a table's rows drawn at the values of their columns — a
 * scatter of `area` against `volume`, a histogram of `area` per condition, a box
 * per cluster — in one or more panels.
 *
 * Its world (whose rows) is not drawn: position is the measurement. How the
 * layers share the screen is the chart's layout (`valuesPanels`): STACKED, a
 * panel per layer; SHARED, a panel per group of layers whose axes are in the
 * same units. The panels are a responsive grid, and each is the plot engine's
 * plane with its own camera and zoom (`ValuesPanel`).
 *
 * Layers come from the chart store as for an AXIS chart, so cards, optimistic
 * edits and visibility work the same.
 */

const VALUES_MODES = ["STACKED", "SHARED"] as const;

const VALUES_TITLES = {
  STACKED: "Stacked — one panel per layer",
  SHARED: "Shared — layers whose axes are in the same units share a panel",
};

const drawnValueLayers = (layers: readonly ChartLayerState[]) =>
  layers.filter(
    (l) => l.placeability.drawable && !isLayerHidden(l) && (l.kind === "points" || l.kind === "distribution"),
  );

/**
 * `embedded`: beneath an axis plot, whose HUD already carries the chart's
 * layout toggle (all three modes) and its loading bar — so neither twice.
 */
export const ValuesViewport = ({ embedded = false }: { embedded?: boolean }) => {
  const visible = useTabVisible();
  // A frozen tab would drop every panel's GPU context: stay live hidden.
  useKeepTabLive();
  const layoutMode = useViewerStore((s) => s.layoutMode);
  const writeLayout = useChartLayoutWrite();

  // The panels, as a string: the selector runs on every store change, and only a
  // different cut (a layer shown, hidden, re-pointed, restyled to another mark,
  // a layout switch) re-renders. The layer list alone (`drawnLayersKey`) would
  // miss a re-pointed column that moves a layer to another panel.
  const signature = useChartStore((s) =>
    JSON.stringify(valuesPanels(drawnValueLayers(s.layers), chartLayoutOf({ layout: layoutMode }))),
  );
  const panels = useMemo(() => JSON.parse(signature) as ValuesPanelModel[], [signature]);

  return (
    <div className="dark text-foreground relative h-full w-full overflow-hidden rounded-lg bg-black">
      {panels.length > 0 && (
        <div
          className={cn(
            "grid h-full w-full",
            panels.length > 1 &&
              "auto-rows-[minmax(16rem,1fr)] grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-px overflow-y-auto bg-white/10",
          )}
        >
          {panels.map((panel) => (
            <div key={panel.key} className="relative min-h-0 min-w-0 bg-black">
              <ValuesPanel panel={panel} visible={visible} />
            </div>
          ))}
        </div>
      )}
      {panels.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center text-xs text-muted-foreground">
            Nothing in this chart can be drawn yet. The Layers tab says why for each layer, and adds one: points of two
            columns, or the distribution of one.
          </div>
        </div>
      )}
      {/* How the layers share the screen, remembered with the chart. Where the
          axis plot keeps its mode controls: bottom right, above the x axis —
          the top right is each panel's legend. */}
      {!embedded && (
        <div className="pointer-events-auto absolute bottom-12 right-3 z-30 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
          <LayoutModeToggle modes={VALUES_MODES} titles={VALUES_TITLES} onChange={(mode) => void writeLayout(mode)} />
        </div>
      )}
      {!embedded && <LoadingBar />}
    </div>
  );
};
