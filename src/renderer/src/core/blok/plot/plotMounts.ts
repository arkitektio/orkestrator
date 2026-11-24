import * as React from "react";
import type { StoreApi } from "zustand/vanilla";
import type { PlotLayerBase, PlotStoreState, Span } from "@/core/data/plot/stores/plotStore";
import type { RangeStoreApi } from "@/core/data/plot/stores/rangeStore";
import type { ViewerStoreApi } from "@/core/data/plot/stores/viewerStore";

/**
 * What a `Plot` gives the mounts inside it: its axis, its stores, and a row for
 * each. A mount draws in the plot engine's coordinates — x is a position along
 * the plot's axis minus `timeOrigin`, y the row stack — and is laid out like a
 * layer of a chart.
 */

/** A mount as the plot lays it out: one row, labelled and coloured, its values in `valueUnit`. */
export type PlotMountLayer = PlotLayerBase<Record<string, never>> & {
  label: string;
  valueUnit: string | null;
};

export type PlotMountStore = StoreApi<PlotStoreState<PlotMountLayer, Record<string, never>, null>>;

export type PlotAxis = { name: string; type: string; unit: string | null; reference: string | null };

export type PlotMounts = {
  axis: PlotAxis;
  plot: PlotMountStore;
  range: RangeStoreApi;
  viewer: ViewerStoreApi;
  /** Lay out a row for this mount, for as long as it is shown. */
  register: (layer: { id: string; label: string; color: string; valueUnit: string | null }) => () => void;
  /** Where along the axis the mount has data, so a fit frames it; null withdraws it. */
  reportSpan: (id: string, span: Span | null) => void;
  /** Something wrong with a mount, said over the plot (the canvas cannot show a card); null clears it. */
  notice: (id: string, text: string | null) => void;
  notices: () => ReadonlyMap<string, string>;
  subscribeNotices: (listener: () => void) => () => void;
};

export const PlotMountsContext = React.createContext<PlotMounts | null>(null);

/** The plot this mount is in, or null outside one (the catalog places mounts only in a Plot). */
export const usePlotMounts = (): PlotMounts | null => React.useContext(PlotMountsContext);

/** Say `text` over the plot for as long as it is given. */
export const usePlotNotice = (mounts: PlotMounts | null, id: string, text: string | null) => {
  React.useEffect(() => {
    if (!mounts) return;
    mounts.notice(id, text);
    return () => mounts.notice(id, null);
  }, [mounts, id, text]);
};

/** A mount's row: registered on mount, dropped on unmount, relabelled in place. */
export const usePlotRow = (
  mounts: PlotMounts | null,
  id: string,
  label: string,
  color: string,
  valueUnit: string | null,
) => {
  React.useEffect(() => {
    if (!mounts) return;
    return mounts.register({ id, label, color, valueUnit });
  }, [mounts, id, label, color, valueUnit]);
};
