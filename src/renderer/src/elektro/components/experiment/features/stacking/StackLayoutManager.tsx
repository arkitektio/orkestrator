import { useEffect } from "react";
import {
  isLayerHidden,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { stackLayout } from "./stackLayout";

/**
 * Keeps the row layout in step with what is drawn.
 *
 * Headless, and a VANILLA subscriber by construction — the pattern mikro uses for
 * `VisibilityManager`: it renders once, never again, and all its reactivity lives
 * in store subscriptions. It recomputes only when the drawn set or the layout mode
 * changes, which is UI cadence; the store then keeps every unchanged band's
 * identity, so a relayout touches only the lines whose rows actually moved.
 *
 * Traces, spike rasters and event tables take rows. Annotations span the whole
 * stack instead.
 */
export const StackLayoutManager = () => {
  const experimentApi = useExperimentStoreApi();
  const viewerApi = useViewerStoreApi();

  useEffect(() => {
    let lastKey = "";

    const recompute = () => {
      const experiment = experimentApi.getState();
      const viewer = viewerApi.getState();
      const drawn = experiment.layers.filter(
        (v) =>
          v.kind !== "annotation" &&
          v.placeability.drawable &&
          // A trace without a pyramid has nothing to put in a row.
          (v.kind !== "trace" || v.source != null) &&
          !isLayerHidden(v),
      );
      const key =
        viewer.layoutMode +
        "|" +
        drawn
          .map((v) => `${v.id}:${v.kind}:${v.channelCount}:${v.valueDimension ?? ""}:${v.label}:${v.color}:${v.channelLabels.join("/")}`)
          .join(",");
      if (key === lastKey) return;
      lastKey = key;

      viewer.setLayout(
        stackLayout(
          drawn.map((v) => ({
            id: v.id,
            label: v.label,
            color: v.color,
            valueUnit: v.valueUnit,
            valueDimension: v.valueDimension,
            channelCount: v.channelCount,
            channelLabels: v.channelLabels,
            overlayable: v.kind === "trace",
          })),
          viewer.layoutMode,
        ),
      );
    };

    recompute();
    const unsubscribeExperiment = experimentApi.subscribe(recompute);
    const unsubscribeViewer = viewerApi.subscribe((state, previous) => {
      if (state.layoutMode !== previous.layoutMode) recompute();
    });
    return () => {
      unsubscribeExperiment();
      unsubscribeViewer();
    };
  }, [experimentApi, viewerApi]);

  return null;
};
