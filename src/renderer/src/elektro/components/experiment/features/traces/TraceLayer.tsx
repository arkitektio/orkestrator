import { TraceLines } from "./TraceLines";
import { useLayerState } from "./useLayerState";

/**
 * A trace layer on the timeline: draws what its `TraceTileDriver` (created by
 * the experiment system's registry) publishes. Reading, residency, packing and
 * the clim seed are the driver's — this component only draws.
 */
export const TraceLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  if (!layer?.source) return null;
  return <TraceLines layer={layer} />;
};
