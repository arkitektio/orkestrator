import { PlotLayerRenderer } from "@/core/data/plot/layers/PlotLayerRenderer";
import { LAYER_RENDERERS } from "./layerRegistry";

/**
 * Dispatches every drawn layer to its component: the plot engine's dispatcher
 * (the one place placement is gated), over the experiment's own registry.
 */
export const LayerRenderer = () => <PlotLayerRenderer renderers={LAYER_RENDERERS} />;
