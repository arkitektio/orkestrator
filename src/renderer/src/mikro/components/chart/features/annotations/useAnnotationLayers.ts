import { useMemo } from "react";
import { isDrawingSurface } from "../../platform/model/chartMarks";
import { useChartStore, useChartStoreApi } from "../../platform/stores/chartStore";

/**
 * The ids of the chart's annotation layers, in draw order, as ONE scalar the
 * overlay and the panel subscribe to (P17): the list changes when a layer is
 * added, removed, hidden or re-placed, not on every fold.
 */
export const useAnnotationLayerIds = (options: { visibleOnly: boolean }): string[] => {
  const key = useChartStore((s) =>
    s.layers
      .filter((l) => l.kind === "annotation" && (!options.visibleOnly || (l.visible && l.marks?.space != null)))
      .map((l) => l.id)
      .join("|"),
  );
  return useMemo(() => (key ? key.split("|") : []), [key]);
};

/**
 * The layer new marks are drawn into: the first shown annotation layer whose
 * collection is a drawing surface (it gives a mark a height). Null when the
 * chart has none — there is then nothing to draw on until one is added.
 */
export const useDrawingTargetId = (): string | null =>
  useChartStore(
    (s) =>
      s.layers.find((l) => l.kind === "annotation" && l.visible && isDrawingSurface(l.marks?.space ?? null))
        ?.id ?? null,
  );

/** Read the target layer when a shape is committed, not on every render. */
export const useDrawingTargetGetter = () => {
  const api = useChartStoreApi();
  return (layerId: string | null) => (layerId ? (api.getState().layerIndex.get(layerId) ?? null) : null);
};
