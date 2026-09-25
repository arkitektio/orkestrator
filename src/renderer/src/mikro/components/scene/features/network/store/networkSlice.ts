import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { KonnektionCollectionManager } from "../konnektionManager";

/**
 * The network renderer's slice of the viewer store — the per-layer konnektion
 * managers and their streaming-progress counter.
 *
 * Here rather than in `platform/stores` because it names
 * `KonnektionCollectionManager`. The exact shape `meshSlice.ts` has, and for
 * the same reasons; a scene-wide *selection* would belong in the probe slice
 * rather than here, so that `probe -> network` never becomes an edge.
 */
export interface NetworkSlice {
  /** Per-NetworkLayer konnektion managers (owned by NetworkCollectionLayer),
   * for debug consumers — the network twin of `meshSystems`. */
  networkSystems: Record<string, KonnektionCollectionManager>;
  registerNetworkSystem: (
    layerId: string,
    manager: KonnektionCollectionManager | null,
  ) => void;
  /** Bumped (throttled by the layer) as network cells plan/load. STREAMING
   * cadence — only debug consumers may subscribe (P17). */
  networkVersion: number;
  bumpNetworkVersion: () => void;
}

export const createNetworkSlice: ViewerSliceOf<NetworkSlice> = (set) => ({
  networkSystems: {},
  registerNetworkSystem: (layerId, manager) =>
    set((state) => {
      const networkSystems = { ...state.networkSystems };
      if (manager) networkSystems[layerId] = manager;
      else delete networkSystems[layerId];
      return { networkSystems };
    }),
  networkVersion: 0,
  bumpNetworkVersion: () => set((state) => ({ networkVersion: state.networkVersion + 1 })),
});

export const { useSlice: useNetworkStore, useSliceApi: useNetworkStoreApi } =
  makeViewerSliceHooks<NetworkSlice>();
