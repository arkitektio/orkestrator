import type { SliceGet, SliceSet } from "./sliceTypes";
/**
 * Where in the non-spatial dimensions the scene is currently looking.
 */
export interface DimsSlice {
  currentZ: number;
  setCurrentZ: (z: number) => void;
  /**
   * Scene-wide selected index per COLLAPSIBLE dim NAME (t, tau, …) — the
   * dims folded to one index at pool creation. Missing entry = the lens
   * slice's collapsed default. Consumers clamp per layer. NOT for z: z is a
   * spatial brick axis (page table holds every slab, scrubbing never
   * refetches), whereas changing one of these selections changes the slice
   * SIGNATURE and flushes affected layers wholesale — by design, the data in
   * every brick is different.
   */
  dimSelections: Record<string, number>;
  setDimSelection: (dim: string, index: number) => void;
}

export const createDimsSlice = (
  set: SliceSet<DimsSlice>,
  get: SliceGet<DimsSlice>,
): DimsSlice => ({
  currentZ: 0,
  setCurrentZ: (z) => set({ currentZ: z }),
  dimSelections: {},
  setDimSelection: (dim, index) => {
    if (get().dimSelections[dim] === index) return; // skip no-op writes
    set((state) => ({ dimSelections: { ...state.dimSelections, [dim]: index } }));
  },
});
