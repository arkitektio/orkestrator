import type { AxisInstants } from "@/core/data/scene/coords/axisTime";
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
   *
   * Only for dims that do NOT reach the world. A dim whose frames have a world
   * coordinate (`layerAxisInstants`) is scrubbed in world units instead, and
   * read per layer through `selectionsFor` — never straight off this record.
   */
  dimSelections: Record<string, number>;
  setDimSelection: (dim: string, index: number) => void;
  /**
   * Scene-wide selected coordinate per WORLD axis (t in seconds, …). Each layer
   * shows its own frame at this coordinate — the last one at or before it —
   * which is what lets a 20 Hz movie and an event-triggered one scrub together.
   */
  worldSelections: Record<string, number>;
  setWorldSelection: (axis: string, value: number) => void;
  /**
   * Per layer: where its frames sit along the world axes it does not render,
   * published by `WorldTimeHost` once the layer's placement (and, for a lookup,
   * its array of instants) is in hand.
   */
  layerAxisInstants: Record<string, readonly AxisInstants[]>;
  setLayerAxisInstants: (layerId: string, instants: readonly AxisInstants[] | null) => void;
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
  worldSelections: {},
  setWorldSelection: (axis, value) => {
    if (get().worldSelections[axis] === value) return;
    set((state) => ({ worldSelections: { ...state.worldSelections, [axis]: value } }));
  },
  layerAxisInstants: {},
  setLayerAxisInstants: (layerId, instants) => {
    const current = get().layerAxisInstants;
    if (instants === null || instants.length === 0) {
      if (!(layerId in current)) return;
      const { [layerId]: _removed, ...rest } = current;
      set({ layerAxisInstants: rest });
      return;
    }
    if (sameInstants(current[layerId], instants)) return;
    set({ layerAxisInstants: { ...current, [layerId]: instants } });
  },
});

/** Value equality, so a republish of identical instants re-runs no selector. */
const sameInstants = (
  a: readonly AxisInstants[] | undefined,
  b: readonly AxisInstants[],
): boolean =>
  a !== undefined &&
  a.length === b.length &&
  a.every(
    (entry, i) =>
      entry.dim === b[i].dim &&
      entry.worldAxis === b[i].worldAxis &&
      entry.times.length === b[i].times.length &&
      entry.times.every((time, k) => time === b[i].times[k]) &&
      entry.indices.every((index, k) => index === b[i].indices[k]),
  );
