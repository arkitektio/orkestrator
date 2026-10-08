import { ChartLines } from "../../platform/lines/ChartLines";
import { useChartLayer } from "../../platform/stores/chartStore";

/**
 * A series on the chart: one column of a table against another, drawn as what
 * its `SeriesTableDriver` publishes. This component only draws.
 */
export const SeriesChartLayer = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  if (!layer?.series) return null;
  return <ChartLines layerId={layerId} />;
};
