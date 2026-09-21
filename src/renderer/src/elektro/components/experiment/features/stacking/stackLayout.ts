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
 *  - **SHARED**: layers that measure the same thing overlay in one row on ONE
 *    scale — the union of their clims — so amplitudes are directly comparable.
 *  - **OVERLAY**: the same grouping, but each layer keeps its OWN scale and every
 *    channel fills the whole row — so a barely-there signal and a large one are
 *    both visible and their timing lines up. What it shows is timing, not
 *    amplitude; a group of more than one is labelled as a legend, one scale per
 *    layer. Layers with no value scale (spike rasters, event tables) keep rows of
 *    their own below the plots.
 *
 * SHARED and OVERLAY therefore group identically — `groupByDimension` — and differ
 * only in what scale a group is drawn on. That is deliberate: which layers may
 * share an axis is a fact about the data, not a display preference, so there is one
 * answer to it and both modes read it from the same place.
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
  /** Whether OVERLAY may put it in the shared plot: traces yes, rasters/events no. */
  overlayable?: boolean;
};

export type StackLayout = {
  rowCount: number;
  rows: RowInfo[];
  bands: Record<string, Band>;
};

/** Fraction of a row left empty above and below the trace, so rows never touch. */
export const ROW_PADDING = 0.08;

/**
 * The layers that may share an axis, in first-appearance order.
 *
 * Grouped by what they MEASURE, because overlaying two quantities of different
 * kinds says nothing: the lines cannot be compared and no one axis is true for
 * both. The key is the physical dimension (`ArrayDataset.valueDimension`).
 *
 * The complication is that the dimension is often missing while the UNIT is not:
 * it is null whenever the backend calls a unit unstated or arbitrary, and also
 * whenever a trace took its unit from an anchor rather than its dataset
 * (`normalizeTraceLayer`). So this resolves in two passes. The backend derives a
 * dimension FROM the unit, so any layer carrying both TEACHES the rule for that
 * unit — and a layer carrying only the unit can then be keyed by the dimension it
 * must have. That is not a guess but a STRONGER test: two layers in the same unit
 * are necessarily of the same dimension.
 *
 * Failing both, a layer is keyed by its own id — a singleton. A layer whose values
 * are of no stated kind is never guessed into someone else's row.
 */
const groupByDimension = (layers: readonly StackableLayer[]): StackableLayer[][] => {
  // What each unit has been seen to mean. First writer wins; the backend derives
  // the dimension from the unit, so two layers cannot disagree about one unit.
  const dimensionOfUnit = new Map<string, string>();
  for (const view of layers) {
    if (view.valueUnit && view.valueDimension && !dimensionOfUnit.has(view.valueUnit)) {
      dimensionOfUnit.set(view.valueUnit, view.valueDimension);
    }
  }

  const keyOf = (view: StackableLayer): string => {
    const dimension =
      view.valueDimension ?? (view.valueUnit ? dimensionOfUnit.get(view.valueUnit) : undefined);
    if (dimension) return `dim:${dimension}`;
    if (view.valueUnit) return `unit:${view.valueUnit}`;
    return `view:${view.id}`;
  };

  const groups = new Map<string, StackableLayer[]>();
  for (const view of layers) {
    const key = keyOf(view);
    const group = groups.get(key);
    if (group) group.push(view);
    else groups.set(key, [view]);
  }
  return [...groups.values()];
};

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

  if (mode === "OVERLAY") {
    const traces = layers.filter((view) => view.overlayable);
    const rest = layers.filter((view) => !view.overlayable);
    let rowIndex = 0;
    for (const group of groupByDimension(traces)) {
      const units = new Set(group.map((view) => view.valueUnit));
      rows.push({
        index: rowIndex,
        label: group.map((view) => view.label).join(", "),
        // One unit only when every line is in it; otherwise the legend says each.
        // A group shares a DIMENSION, which mV and V both satisfy.
        unit: units.size === 1 ? group[0].valueUnit : null,
        color: group[0].color,
        layerIds: group.map((view) => view.id),
        // A group of one is an ordinary row, not a one-entry legend.
        overlay: group.length > 1 ? true : undefined,
      });
      for (const view of group) {
        // Every channel of every trace uses the WHOLE row, on its layer's own clim.
        for (let c = 0; c < Math.max(1, view.channelCount); c++) {
          bands[bandKey(view.id, c)] = bandIn(rowIndex, 0, 1, [view.id]);
        }
      }
      rowIndex++;
    }
    for (const view of rest) {
      rows.push({
        index: rowIndex,
        label: view.label,
        unit: view.valueUnit,
        color: view.color,
        layerIds: [view.id],
      });
      for (let c = 0; c < Math.max(1, view.channelCount); c++) {
        bands[bandKey(view.id, c)] = bandIn(rowIndex, 0, 1, [view.id]);
      }
      rowIndex++;
    }
    return { rowCount: rows.length, rows, bands };
  }

  // SHARED: the same groups as OVERLAY, drawn on one scale each.
  groupByDimension(layers).forEach((group, rowIndex) => {
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
