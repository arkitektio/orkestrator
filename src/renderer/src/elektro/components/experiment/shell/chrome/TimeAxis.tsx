import { AxisTicks } from "@/core/data/plot/chrome/AxisTicks";
import { timeAxis } from "../../platform/coords/timeAxis";
import { useExperimentStore } from "../../platform/stores/experimentStore";

/**
 * The time axis along the bottom of the viewport: the plot engine's `AxisTicks`,
 * in the unit of the WORLD's time axis — the timeline's own unit, which is what
 * every position on it is measured in.
 */
export const TimeAxis = () => {
  const unit = useExperimentStore((s) => timeAxis(s.world)?.unit ?? null);
  return <AxisTicks unit={unit} />;
};
