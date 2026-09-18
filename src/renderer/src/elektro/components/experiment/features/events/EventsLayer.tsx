import { BarMesh, TickLines } from "../../platform/marks/BandMarks";
import { useLayerState } from "../traces/useLayerState";
import { useEventsStore } from "./store/eventsSlice";

/**
 * An events layer: draws what its `EventTableDriver` prepared — ticks for
 * instants (or a density strip when they outnumber pixels), shaded bars for
 * intervals, one sub-lane per lane value. Reading, pickers, density and labels
 * are the driver's; this component only draws its own slice entry.
 */
export const EventsLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  const draw = useEventsStore((s) => s.eventDraws[layerId]);
  if (!layer || !draw) return null;
  return (
    <group>
      {draw.intervalQuads.length > 0 && (
        <BarMesh
          layerId={layerId}
          quads={draw.intervalQuads}
          laneCount={draw.laneCount}
          color={layer.color}
          colors={draw.intervalColors}
          opacity={0.3}
        />
      )}
      {draw.density && draw.densityQuads ? (
        <BarMesh layerId={layerId} quads={draw.densityQuads} laneCount={1} color={layer.color} opacity={0.8} />
      ) : (
        <TickLines
          layerId={layerId}
          xs={draw.instants}
          lanes={draw.instantLanes}
          laneCount={draw.laneCount}
          height={0.8}
          color={layer.color}
          colors={draw.instantColors}
          lineWidth={Math.max(1, layer.lineWidth)}
        />
      )}
    </group>
  );
};
