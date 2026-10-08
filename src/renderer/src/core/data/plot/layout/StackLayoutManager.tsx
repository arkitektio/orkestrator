import { useEffect, useRef } from "react";
import { usePlotStoreApi, type AnyPlotLayer } from "../stores/plotStore";
import { useViewerStoreApi } from "../stores/viewerStore";
import { stackLayout, type StackableLayer } from "./stackLayout";

/**
 * Keeps the row layout in step with what is drawn.
 *
 * Headless, and a VANILLA subscriber by construction — the pattern mikro uses for
 * `VisibilityManager`: it renders once, never again, and all its reactivity lives
 * in store subscriptions. It recomputes only when the drawn set or the layout mode
 * changes, which is UI cadence; the store then keeps every unchanged band's
 * identity, so a relayout touches only the lines whose rows actually moved.
 *
 * WHICH layers take a row, and what each is called, is the module's: `rowOf`
 * returns a layer's row entry, or null for one that takes none (hidden,
 * undrawable, or — like annotations — spanning the whole stack instead).
 */
export const StackLayoutManager = <L extends AnyPlotLayer>({
  rowOf,
}: {
  rowOf: (layer: L) => StackableLayer | null;
}) => {
  const plotApi = usePlotStoreApi();
  const viewerApi = useViewerStoreApi();
  // Read on each recompute: a new closure must not resubscribe.
  const rowOfRef = useRef(rowOf);
  rowOfRef.current = rowOf;

  useEffect(() => {
    let lastKey = "";

    const recompute = () => {
      const viewer = viewerApi.getState();
      const rows: StackableLayer[] = [];
      for (const layer of plotApi.getState().layers) {
        const row = rowOfRef.current(layer as L);
        if (row) rows.push(row);
      }
      // Everything a row entry says can decide the layout or its labels — the
      // unit as much as the id: a layer whose dimension is unknown falls through
      // to its unit (`groupByDimension`), so a unit-only change must relayout.
      const key = viewer.layoutMode + "|" + JSON.stringify(rows);
      if (key === lastKey) return;
      lastKey = key;
      viewer.setLayout(stackLayout(rows, viewer.layoutMode));
    };

    recompute();
    const unsubscribePlot = plotApi.subscribe(recompute);
    const unsubscribeViewer = viewerApi.subscribe((state, previous) => {
      if (state.layoutMode !== previous.layoutMode) recompute();
    });
    return () => {
      unsubscribePlot();
      unsubscribeViewer();
    };
  }, [plotApi, viewerApi]);

  return null;
};
