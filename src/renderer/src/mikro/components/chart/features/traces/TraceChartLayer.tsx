import { ChartLines } from "../../platform/lines/ChartLines";
import { useChartLayer } from "../../platform/stores/chartStore";

/**
 * A trace on the chart: an array read along one axis, drawn as what its tile
 * driver (built by the chart system's registry) publishes. Reading, residency,
 * packing and the scale's seed are the driver's — this component only draws.
 */
export const TraceChartLayer = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  if (!layer?.source) return null;
  return <ChartLines layerId={layerId} />;
};
