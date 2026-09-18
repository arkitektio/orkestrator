import { useEffect } from "react";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { TraceLines } from "./TraceLines";
import { useLayerState } from "./useLayerState";

/**
 * A trace layer on the timeline: a lens over an array dataset, drawn through the
 * shared multiscale engine (`useTraceTiles` → `TraceLines`).
 *
 * The one thing it adds is the SCALE it starts at. A trace is drawn at fixed gain
 * — the first data it shows sets its clim, and zooming never silently rescales —
 * so which data comes "first" matters. The layer's `climSeed` answers before any
 * tile lands: the persisted clim when someone chose one, else the value range the
 * server measured into its anchors' histograms. Only with neither does the first
 * window decide. A persisted change (an autoscale written back, an edit) moves
 * the seed and is applied here too.
 */
export const TraceLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  const viewerApi = useViewerStoreApi();
  const lo = layer?.climSeed?.lo;
  const hi = layer?.climSeed?.hi;

  useEffect(() => {
    if (lo == null || hi == null) return;
    viewerApi.getState().setClim(layerId, { lo, hi });
  }, [viewerApi, layerId, lo, hi]);

  if (!layer?.source) return null;
  return <TraceLines layer={layer} />;
};
