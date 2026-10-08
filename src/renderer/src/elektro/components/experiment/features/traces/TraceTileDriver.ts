import type { StoreApi } from "zustand/vanilla";
import {
  TileLineDriver,
  type TileLineDriverEnv,
} from "@/core/data/plot/lines/TileLineDriver";
import type { LayerDriver } from "../../platform/drivers/layerDriver";
import type { LayerState } from "../../platform/model/layerModel";
import type { ExperimentStoreState } from "../../platform/stores/experimentStore";

export { PACK_MARGIN, type ReadWindow } from "@/core/data/plot/lines/TileLineDriver";

export type TraceDriverEnv = Omit<TileLineDriverEnv, "origin"> & {
  experimentApi: StoreApi<ExperimentStoreState>;
};

/**
 * One trace layer's tile pipeline: plan → read → residency → pack → publish.
 *
 * The pipeline is the plot engine's (`@/core/data/plot/lines/TileLineDriver`,
 * the rank-1 counterpart of mikro's brick residency); this is it bound to an
 * experiment, whose store holds the origin every packed x is relative to.
 */
export class TraceTileDriver extends TileLineDriver<LayerState> implements LayerDriver {
  constructor(layer: LayerState, env: TraceDriverEnv) {
    const { experimentApi, ...rest } = env;
    super(layer, { ...rest, origin: () => experimentApi.getState().timeOrigin });
  }
}
