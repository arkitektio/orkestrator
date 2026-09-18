import { BarMesh, TickLines } from "../../platform/marks/BandMarks";
import { useLayerState } from "../traces/useLayerState";
import { useSpikesStore } from "./store/spikesSlice";

/**
 * A spikes layer: draws what its `SpikeRasterDriver` prepared — one lane per
 * unit, one tick per spike, or a per-unit rate histogram when the layer asks for
 * one (`rateBin`) or the ticks outnumber pixels. Everything else is the driver's.
 */
export const SpikesLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  const draw = useSpikesStore((s) => s.spikeDraws[layerId]);
  if (!layer || !draw || draw.laneCount === 0) return null;
  return draw.density && draw.rateQuads ? (
    <BarMesh layerId={layerId} quads={draw.rateQuads} laneCount={draw.laneCount} color={layer.color} opacity={0.85} />
  ) : (
    <TickLines
      layerId={layerId}
      xs={draw.xs}
      lanes={draw.lanes}
      laneCount={draw.laneCount}
      height={layer.raster?.tickHeight ?? 0.8}
      color={layer.color}
      colors={draw.colors}
      lineWidth={Math.max(1, layer.lineWidth)}
    />
  );
};
