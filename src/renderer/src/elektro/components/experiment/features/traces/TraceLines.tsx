import type { LayerState } from "../../platform/model/layerModel";
import { PackedLine } from "@/core/data/plot/lines/PackedLine";
import type { PackedChannel } from "@/core/data/plot/lines/tracePacking";
import { useTraceStore } from "@/core/data/plot/lines/traceSlice";
import { useChannelColors } from "../../platform/stores/channelColors";

const NO_CHANNELS: PackedChannel[] = [];

/**
 * Draws what the layer's `TraceTileDriver` published — one fat line per channel
 * (the plot engine's `PackedLine`, which owns the buffer and the band binding).
 * Subscribes to its OWN entry of the trace slice, which changes when tiles land
 * or the committed window moves (UI cadence); the layout binds imperatively.
 */
export const TraceLines = ({ layer }: { layer: LayerState }) => {
  const channels = useTraceStore((s) => s.packed[layer.id]?.channels ?? NO_CHANNELS);
  // One colour per channel where the setting says so (see `useChannelColors`).
  const colors = useChannelColors(layer.id);
  return (
    <>
      {channels.map((packed, channel) => (
        <PackedLine
          key={channel}
          layerId={layer.id}
          channel={channel}
          color={colors[channel] ?? layer.color}
          lineWidth={layer.lineWidth}
          packed={packed}
        />
      ))}
    </>
  );
};
