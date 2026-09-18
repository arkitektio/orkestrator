import { makeViewerSliceHooks, type ViewerSliceOf } from "../stores/viewerStore";
import type { PickerValuesService } from "./pickerValuesService";

/**
 * The pickers' slice of the viewer store: the scope's `PickerValuesService`
 * (so a card's editor reads the same table cache the drivers fill) and, per
 * layer, why its active entries cannot be drawn — which a card shows.
 */
export type PickerSlice = {
  pickerService: PickerValuesService | null;
  setPickerService: (service: PickerValuesService | null) => void;
  pickerProblems: Record<string, Record<string, string>>;
  setPickerProblems: (layerId: string, problems: Record<string, string> | null) => void;
};

const NONE: Record<string, string> = {};

export const createPickerSlice: ViewerSliceOf<PickerSlice> = (set) => ({
  pickerService: null,
  setPickerService: (pickerService) => set({ pickerService }),
  pickerProblems: {},
  setPickerProblems: (layerId, problems) =>
    set((state) => {
      const empty = !problems || Object.keys(problems).length === 0;
      if (empty && !(layerId in state.pickerProblems)) return state;
      const next = { ...state.pickerProblems };
      if (empty) delete next[layerId];
      else next[layerId] = problems!;
      return { pickerProblems: next };
    }),
});

const hooks = makeViewerSliceHooks<PickerSlice>();
export const usePickerStore = hooks.useSliceStore;
export const usePickerStoreApi = hooks.useSliceStoreApi;

/** One layer's picker problems (a stable empty object when there are none). */
export const usePickerProblems = (layerId: string): Record<string, string> =>
  usePickerStore((s) => s.pickerProblems[layerId] ?? NONE);
