import type { ViewerGet, ViewerSet } from "./sliceTypes";

/** The hovered time, and what each layer draws there for the readout. */

/** What a trace layer has drawn, for the probe to read back. */
export type ProbeChannel = {
  /** time − timeOrigin, ascending. */
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
  /** The points are a per-pixel min/max envelope, not the samples. */
  decimated?: boolean;
};

export type ProbeSlice = {
  /** World time under the pointer, or null. Coalesced to one write per frame. */
  hoverTime: number | null;
  setHoverTime: (time: number | null) => void;
  /**
   * Per layer, the channels it currently draws. A plain Map MUTATED IN PLACE —
   * it changes whenever tiles land, and copying it per landing is waste — with
   * `probeVersion` as the scalar a reader subscribes to (P17), so the readout
   * refreshes when what is drawn changes, not only when the pointer moves.
   */
  probeSources: Map<string, ProbeChannel[]>;
  probeVersion: number;
  /** Publish (or, with null, withdraw) what a layer draws, and bump the version. */
  publishProbe: (layerId: string, channels: ProbeChannel[] | null) => void;
};


export const createProbeSlice = (set: ViewerSet, get: ViewerGet): ProbeSlice => ({
  hoverTime: null,
  setHoverTime: (hoverTime) => {
    if (get().hoverTime === hoverTime) return;
    set({ hoverTime });
  },
  probeSources: new Map(),
  probeVersion: 0,
  publishProbe: (layerId, channels) => {
    const sources = get().probeSources;
    if (channels) sources.set(layerId, channels);
    else if (!sources.delete(layerId)) return;
    set((state) => ({ probeVersion: state.probeVersion + 1 }));
  },
});
