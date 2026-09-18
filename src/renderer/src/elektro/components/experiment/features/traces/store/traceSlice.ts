import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { PackedChannel } from "../tracePacking";

/**
 * The trace feature's slice of the viewer store: per layer, the packed polylines
 * its `TraceTileDriver` published — what `TraceLines` uploads, and nothing else.
 *
 * Lives in the feature (it names `PackedChannel`) and joins the ONE viewer store
 * at composition, like mikro's `BrickSlice`. Read it through `useTraceStore`.
 * `version` bumps on every publish, so a subscriber compares one number.
 */
export type TracePacked = { channels: PackedChannel[]; version: number };

export type TraceSlice = {
  packed: Record<string, TracePacked>;
  setPacked: (layerId: string, channels: PackedChannel[] | null) => void;
};

export const createTraceSlice: ViewerSliceOf<TraceSlice> = (set) => ({
  packed: {},
  setPacked: (layerId, channels) =>
    set((state) => {
      const next = { ...state.packed };
      if (channels) next[layerId] = { channels, version: (state.packed[layerId]?.version ?? 0) + 1 };
      else if (layerId in next) delete next[layerId];
      else return state;
      return { packed: next };
    }),
});

const hooks = makeViewerSliceHooks<TraceSlice>();
export const useTraceStore = hooks.useSliceStore;
export const useTraceStoreApi = hooks.useSliceStoreApi;
