import { PlotModeControls } from "@/core/data/plot/chrome/PlotModeControls";
import { useAutoscale } from "../../platform/edits/useAutoscale";
import { useExperimentStore } from "../../platform/stores/experimentStore";

/**
 * The renderer-owned HUD, bottom-right, above the time axis: the plot engine's
 * controls, with the experiment's autoscale (which persists the scale) and its
 * own answer to "can marks be drawn here" — a synthesized run or segment scene
 * has no experiment to draw them on.
 */
export const ExperimentModeControls = () => {
  const annotatable = useExperimentStore((s) => s.annotatable);
  const autoscale = useAutoscale();
  return (
    <PlotModeControls
      annotatable={annotatable}
      onAutoscale={() => autoscale()}
      fitTitle="Fit the whole experiment (double-click the plot)"
    />
  );
};
