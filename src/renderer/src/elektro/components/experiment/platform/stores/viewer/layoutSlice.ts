import type { ViewerGet, ViewerSet } from "./sliceTypes";

/**
 * Layout: which band of world y each (layer, channel) is drawn in, the rows
 * the chrome labels, and the clims that map values into bands.
 */

export type LayoutMode = "STACKED" | "SHARED" | "OVERLAY";

/** The value range a row maps to its full height. */
export type Clim = { lo: number; hi: number };

/**
 * Where one channel of one view is drawn: a band of world y, and whose clims map
 * values into it.
 *
 * `climIds` is one view in STACKED mode and the whole group in SHARED mode, where
 * views of the same physical dimension overlay on one axis and must therefore share
 * one scale — otherwise two traces in the same row would each be stretched to
 * fill it and their amplitudes would be incomparable, which is the one thing
 * overlaying them was for.
 */
export type Band = { bottom: number; top: number; climIds: string[] };

export type RowInfo = {
  /** Row index, 0 at the top. */
  index: number;
  label: string;
  unit: string | null;
  color: string;
  layerIds: string[];
  /** Per sub-band label (STACKED, multi-channel): what each channel is called. */
  channelLabels?: (string | null)[];
  /**
   * OVERLAY's trace row: its layers share the row but NOT a scale, so the row is
   * labelled as a legend (one entry per layer, each with its own scale) rather
   * than by one name and one unit.
   */
  overlay?: boolean;
};

export type TraceStats = {
  /** Index into the view's levels of the finest level being drawn. */
  levelIndex: number;
  /** The `DataArray.level` of it. */
  level: number;
  levelCount: number;
  /**
   * Level index DRAWN at the centre of the window — the served level, which lags
   * the target while finer tiles are still in flight. Null before anything lands.
   */
  centerLevelIndex: number | null;
  /** The level the plan is refining towards (0 = finest). */
  targetLevelIndex: number;
  /** Finest samples per drawn sample at the centre (1 = full resolution). */
  centerFactor: number | null;
  tilesPlanned: number;
  tilesResident: number;
  /** Fraction of the visible window covered by resident data. */
  coverage: number;
  residentBytes: number;
  valueMin: number | null;
  valueMax: number | null;
  loading: boolean;
  error: string | null;
};

export const bandKey = (layerId: string, channel: number): string => `${layerId}:${channel}`;

export type LayoutSlice = {
  layoutMode: LayoutMode;
  rowCount: number;
  rows: RowInfo[];
  bands: Record<string, Band>;
  /** Held fixed once seeded — fixed gain; change only on autoscale or an edit. */
  clims: Record<string, Clim>;
  /** Bumped by every `setLayout` — the scalar a band-reading overlay subscribes to. */
  layoutVersion: number;
  /**
   * Bumped by every clim that actually changed — the scalar a SCALE-reading
   * overlay subscribes to (P17: `clims` is a per-layer record, so nothing
   * renders from the whole of it). `layoutVersion` does not cover this: a clim
   * moves on a seed, an autoscale or an edit without any relayout.
   */
  climVersion: number;
  setLayoutMode: (mode: LayoutMode) => void;
  setLayout: (layout: { rowCount: number; rows: RowInfo[]; bands: Record<string, Band> }) => void;
  /** Seed a layer's clim from its first data. A no-op once one is set. */
  seedClim: (layerId: string, clim: Clim) => void;
  setClim: (layerId: string, clim: Clim) => void;
  /**
   * Rescale a layer (or every layer) to the range currently resident. Returns
   * the clims it set, so a caller can persist them.
   */
  autoscale: (layerId?: string) => Record<string, Clim>;
};

/**
 * A clim that can actually be drawn. A flat trace (lo === hi) would divide by zero
 * in the row map; pad it so a constant line sits in the middle of its row.
 */
export const drawableClim = (clim: Clim): Clim => {
  if (clim.hi > clim.lo) return clim;
  const pad = Math.max(Math.abs(clim.lo) * 0.05, 1e-6);
  return { lo: clim.lo - pad, hi: clim.hi + pad };
};

/** Replace a record entry only if it changed, so unchanged keys keep identity. */
export const sameBand = (a: Band | undefined, b: Band): boolean =>
  a !== undefined &&
  a.bottom === b.bottom &&
  a.top === b.top &&
  a.climIds.length === b.climIds.length &&
  a.climIds.every((id, i) => id === b.climIds[i]);

/**
 * The effective value range for a band: the union of the clims it names. Null when
 * none of them has been seeded yet — the layer then draws nothing rather than
 * guessing a scale that would snap on the first real data.
 */
export const effectiveClim = (
  clims: Record<string, Clim>,
  band: Pick<Band, "climIds">,
): Clim | null => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const id of band.climIds) {
    const c = clims[id];
    if (!c) continue;
    if (c.lo < lo) lo = c.lo;
    if (c.hi > hi) hi = c.hi;
  }
  return lo <= hi ? drawableClim({ lo, hi }) : null;
};


export const createLayoutSlice = (set: ViewerSet, get: ViewerGet): LayoutSlice => ({
  layoutMode: "STACKED",
  rowCount: 0,
  rows: [],
  bands: {},
  clims: {},
  layoutVersion: 0,
  climVersion: 0,
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setLayout: ({ rowCount, rows, bands }) => {
    // Keep the identity of every band that did not move. Layers bind to their
    // band imperatively; a relayout that re-allocated all of them would make
    // every layer rewrite its matrix and request a frame for nothing.
    const previous = get().bands;
    const merged: Record<string, Band> = {};
    for (const [key, band] of Object.entries(bands)) {
      merged[key] = sameBand(previous[key], band) ? previous[key] : band;
    }
    set((state) => ({ rowCount, rows, bands: merged, layoutVersion: state.layoutVersion + 1 }));
  },
  seedClim: (layerId, clim) => {
    if (get().clims[layerId]) return;
    set((state) => ({
      clims: { ...state.clims, [layerId]: drawableClim(clim) },
      climVersion: state.climVersion + 1,
    }));
  },
  setClim: (layerId, clim) =>
    set((state) => ({
      clims: { ...state.clims, [layerId]: drawableClim(clim) },
      climVersion: state.climVersion + 1,
    })),
  autoscale: (layerId) => {
    const { stats, clims } = get();
    const next = { ...clims };
    const changed: Record<string, Clim> = {};
    const ids = layerId ? [layerId] : Object.keys(stats);
    for (const id of ids) {
      const s = stats[id];
      if (!s || s.valueMin == null || s.valueMax == null) continue;
      next[id] = changed[id] = drawableClim({ lo: s.valueMin, hi: s.valueMax });
    }
    // Nothing resident yet: no write, so no overlay redraw for nothing.
    if (Object.keys(changed).length > 0) {
      set((state) => ({ clims: next, climVersion: state.climVersion + 1 }));
    }
    return changed;
  },
});
