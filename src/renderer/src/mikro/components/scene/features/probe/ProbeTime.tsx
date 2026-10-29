import { formatClock, timeOfIndex, wallClockAt } from "@/core/data/scene/coords/axisTime";
import type { AxisCoords } from "@/mikro/lib/coords/axisPath";
import { selectionsFor } from "../../platform/model/worldSelections";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * When a probed value was taken: for each of the layer's world-timed dims, the
 * frame's coordinate on the world axis and, when the world space has an epoch,
 * its wall-clock reading (`wall_clock = epoch + t * unit`).
 *
 * `coords` pins the frame — a probe point keeps the frame it was pinned on, so it
 * must not follow the slider. Without it (the live readout) the frame is the one
 * on screen now, read through `selectionsFor` like every other consumer.
 *
 * Renders nothing for a layer that is not world-timed.
 */
export const ProbeTime = ({
  layerId,
  coords,
  compact = false,
}: {
  layerId: string;
  coords?: AxisCoords | null;
  compact?: boolean;
}) => {
  const instants = useViewerStore((state) => state.layerAxisInstants[layerId]);
  const dimSelections = useViewerStore((state) => state.dimSelections);
  const worldSelections = useViewerStore((state) => state.worldSelections);
  const layerAxisInstants = useViewerStore((state) => state.layerAxisInstants);
  const world = useSceneStore((state) => state.transformContext.worldCoordinateSystem);

  if (!instants || instants.length === 0) return null;
  const current = coords ? null : selectionsFor({ dimSelections, worldSelections, layerAxisInstants }, layerId);

  const readings = instants.flatMap((entry) => {
    const index = coords?.[entry.dim] ?? current?.[entry.dim] ?? entry.indices[0];
    const t = timeOfIndex(entry, index);
    if (t === null) return [];
    const unit = String(world?.axes?.find((axis) => axis.name === entry.worldAxis)?.unit ?? "").trim();
    const clock = wallClockAt(world?.epoch ?? null, t, unit);
    return [{ key: `${entry.dim}->${entry.worldAxis}`, axis: entry.worldAxis, index, t, unit, clock }];
  });
  if (readings.length === 0) return null;

  if (compact) {
    return (
      <>
        {readings.map((reading) => (
          <span
            key={reading.key}
            className="font-mono text-foreground/50"
            title={reading.clock ? reading.clock.toISOString() : `${reading.t} ${reading.unit}`}
          >
            {reading.clock ? formatClock(reading.clock) : `${reading.axis}=${reading.t}`}
          </span>
        ))}
      </>
    );
  }

  return (
    <>
      {readings.map((reading) => (
        <div key={reading.key} className="flex items-baseline justify-between gap-3">
          <span className="text-foreground/50">Time</span>
          <span
            className="font-mono text-foreground/90"
            title={reading.clock ? reading.clock.toISOString() : undefined}
          >
            {reading.axis} {reading.index} · {reading.t}
            {reading.unit ? ` ${reading.unit}` : ""}
            {reading.clock ? ` (${formatClock(reading.clock)})` : ""}
          </span>
        </div>
      ))}
    </>
  );
};
