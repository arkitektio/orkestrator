import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { EventDraw } from "../eventDraw";

/**
 * The events feature's slice: per layer, what its `EventTableDriver` prepared
 * to draw. `EventsLayer` subscribes to its own entry and nothing else.
 */
export type EventsSlice = {
  eventDraws: Record<string, EventDraw>;
  setEventDraw: (layerId: string, draw: EventDraw | null) => void;
};

export const createEventsSlice: ViewerSliceOf<EventsSlice> = (set) => ({
  eventDraws: {},
  setEventDraw: (layerId, draw) =>
    set((state) => {
      if (!draw && !(layerId in state.eventDraws)) return state;
      const next = { ...state.eventDraws };
      if (draw) next[layerId] = draw;
      else delete next[layerId];
      return { eventDraws: next };
    }),
});

const hooks = makeViewerSliceHooks<EventsSlice>();
export const useEventsStore = hooks.useSliceStore;
export const useEventsStoreApi = hooks.useSliceStoreApi;
