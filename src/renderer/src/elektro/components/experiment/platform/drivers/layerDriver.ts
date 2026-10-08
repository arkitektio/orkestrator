import {
  LayerDriverRegistry as CoreLayerDriverRegistry,
  type LayerDriver as CoreLayerDriver,
  type LayerDriverFactory as CoreLayerDriverFactory,
} from "@/core/data/plot/drivers/layerDriver";
import type { LayerState } from "../model/layerModel";

/**
 * The plot engine's driver protocol and registry
 * (`@/core/data/plot/drivers/layerDriver`), typed for elektro's layers.
 */
export type LayerDriver = CoreLayerDriver<LayerState>;
export type LayerDriverFactory = CoreLayerDriverFactory<LayerState>;

export const LayerDriverRegistry = CoreLayerDriverRegistry<LayerState>;
export type LayerDriverRegistry = CoreLayerDriverRegistry<LayerState>;

export { wantsDriver } from "@/core/data/plot/drivers/layerDriver";
