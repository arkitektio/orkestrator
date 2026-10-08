import { useDialog } from "@/core/dialogs/registry";
import { LayerControlPanel as PlotLayerControlPanel } from "@/core/data/plot/layerui/LayerControlPanel";
import { useLayerWrite } from "../../platform/edits/useLayerWrite";
import type { LayerState } from "../../platform/model/layerModel";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { LAYER_CARDS } from "./cardRegistry";

/**
 * Every layer of the experiment, as cards, in draw order: the plot engine's
 * panel (ordering, the visibility toggle) over the experiment's card registry,
 * its optimistic persisted write, and its add-layer dialog.
 */
export const LayerControlPanel = ({ variant = "sidebar" }: { variant?: "sidebar" | "floating" }) => {
  const experimentId = useExperimentStore((s) => s.experimentId);
  const write = useLayerWrite();
  const { openDialog } = useDialog();
  return (
    <PlotLayerControlPanel<LayerState>
      cards={LAYER_CARDS}
      write={write}
      onAddLayer={() => openDialog("addexperimentlayer", { experiment: experimentId }, { size: "medium" })}
      emptyText="This experiment has no layers."
      addTitle="Add a trace, spikes, events or annotations"
      variant={variant}
    />
  );
};
