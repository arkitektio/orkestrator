import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { SpikeDraw } from "../spikeDraw";

/** The spikes feature's slice: per layer, what its `SpikeRasterDriver` prepared to draw. */
export type SpikesSlice = {
  spikeDraws: Record<string, SpikeDraw>;
  setSpikeDraw: (layerId: string, draw: SpikeDraw | null) => void;
};

export const createSpikesSlice: ViewerSliceOf<SpikesSlice> = (set) => ({
  spikeDraws: {},
  setSpikeDraw: (layerId, draw) =>
    set((state) => {
      if (!draw && !(layerId in state.spikeDraws)) return state;
      const next = { ...state.spikeDraws };
      if (draw) next[layerId] = draw;
      else delete next[layerId];
      return { spikeDraws: next };
    }),
});

const hooks = makeViewerSliceHooks<SpikesSlice>();
export const useSpikesStore = hooks.useSliceStore;
export const useSpikesStoreApi = hooks.useSliceStoreApi;
