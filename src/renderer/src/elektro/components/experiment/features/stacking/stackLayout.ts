import {
  bandKey,
  type Band,
  type LayoutMode,
  type RowInfo,
} from "../../platform/stores/viewerStore";

/**
 * Assigning layers to rows on the y axis.
 *
 * World y is laid out in ROW UNITS, top down: row `r` occupies `[-(r+1), -r]`, so
 * the camera frames the whole stack with `top = 0, bottom = -rowCount`. Values are
 * mapped into a row by the trace layer's object matrix, never by rewriting its
 * buffer — so changing a clim, a layout mode or a row count costs a matrix write
 * and a frame, not a repack.
 *
 *  - **STACKED** (the default, and the oscilloscope convention): one row per drawn
 *    layer; a multi-channel trace splits its row into sub-bands, one per channel.
 *    Each layer scales to its own clim, which is necessary anyway because units
 *    differ per layer (mV next to pA).
 *  - **SHARED**: traces of the same physical dimension (`ArrayDataset.valueDimension`)
 *    overlay in one row on ONE scale — the union of their clims — so amplitudes are
 *    directly comparable. A layer with no known dimension (a spike raster, an event
 *    table) gets a row of its own rather than being guessed into someone else's.
 *
 * Pure — no store, no React — so the rules are pinned by tests.
 */

export type StackableLayer = {
  id: string;
  label: string;
  color: string;
  valueUnit: string | null;
  valueDimension: string | null;
  channelCount: number;
  channelLabels?: (string | null)[];
};

export type StackLayout = {
  rowCount: number;
  rows: RowInfo[];
  bands: Record<string, Band>;
};

/** Fraction of a row left empty above and below the trace, so rows never touch. */
export const ROW_PADDING = 0.08;

const bandIn = (
  rowIndex: number,
  slot: number,
  slots: number,
  climIds: string[],
): Band => {
  const rowTop = -rowIndex;
  const inner = 1 - 2 * ROW_PADDING;
  const slotHeight = inner / Math.max(1, slots);
  const top = rowTop - ROW_PADDING - slot * slotHeight;
  return { top, bottom: top - slotHeight, climIds };
};

export const stackLayout = (
  layers: readonly StackableLayer[],
  mode: LayoutMode,
): StackLayout => {
  const rows: RowInfo[] = [];
  const bands: Record<string, Band> = {};

  if (mode === "STACKED") {
    layers.forEach((view, rowIndex) => {
      rows.push({
        index: rowIndex,
        label: view.label,
        unit: view.valueUnit,
        color: view.color,
        layerIds: [view.id],
        channelLabels: view.channelCount > 1 ? view.channelLabels : undefined,
      });
      const channels = Math.max(1, view.channelCount);
      for (let c = 0; c < channels; c++) {
        bands[bandKey(view.id, c)] = bandIn(rowIndex, c, channels, [view.id]);
      }
    });
    return { rowCount: rows.length, rows, bands };
  }

  // SHARED: group by dimension, preserving the order a group first appears in.
  const groups = new Map<string, StackableLayer[]>();
  for (const view of layers) {
    const key = view.valueDimension ? `dim:${view.valueDimension}` : `view:${view.id}`;
    const group = groups.get(key);
    if (group) group.push(view);
    else groups.set(key, [view]);
  }

  [...groups.values()].forEach((group, rowIndex) => {
    const climIds = group.map((v) => v.id);
    rows.push({
      index: rowIndex,
      label: group.map((v) => v.label).join(", "),
      unit: group[0].valueUnit,
      color: group[0].color,
      layerIds: climIds,
    });
    for (const view of group) {
      // Overlaid: every channel of every view uses the WHOLE row on the shared scale.
      for (let c = 0; c < Math.max(1, view.channelCount); c++) {
        bands[bandKey(view.id, c)] = bandIn(rowIndex, 0, 1, climIds);
      }
    }
  });
  return { rowCount: rows.length, rows, bands };
};
