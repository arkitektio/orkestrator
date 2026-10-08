import { useCallback } from "react";
import { toast } from "@/core/notify";
import { ChartMark, useUpdateChartLayerMutation } from "@/mikro/api/graphql";
import type { PersistedChartLayer } from "../model/chartLayerModel";
import { useChartStoreApi } from "../stores/chartStore";

/**
 * Write a layer edit back — optimistically.
 *
 * The edit lands in the store's overlay at once (`patchLayer`), so the chart
 * and the panel change on the click, not on the round trip; the mutation's
 * result then updates Apollo's normalized cache, the chart query re-emits, and
 * the provider's fold drops the patch once the server agrees. A failed write
 * rolls back exactly its own fields and says so.
 *
 * One mutation for every kind (`updateChartLayer`): a chart layer carries view
 * state only, and that is all it changes. Every edit is CONTENT — no structural
 * key moves, so nothing is reread.
 *
 * A null in the input means "leave it", so a field cannot be CLEARED through
 * here; nothing offers that.
 */
export const useChartLayerWrite = () => {
  const api = useChartStoreApi();
  const [updateLayer] = useUpdateChartLayerMutation();

  return useCallback(
    async (layerId: string, patch: Partial<PersistedChartLayer>): Promise<boolean> => {
      const layer = api.getState().layerIndex.get(layerId);
      if (!layer) return false;
      const rollback = api.getState().patchLayer(layerId, patch);
      try {
        await updateLayer({
          variables: {
            input: {
              id: layerId,
              name: patch.name ?? undefined,
              visible: patch.visible,
              order: patch.order,
              opacity: patch.opacity,
              color: patch.color ? [...patch.color] : undefined,
              mark: patch.mark as ChartMark | undefined,
              lineWidth: patch.lineWidth ?? undefined,
              markerSize: patch.markerSize ?? undefined,
            },
          },
        });
        return true;
      } catch (error) {
        rollback();
        toast.error(
          `Could not save the change to ${layer.label}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return false;
      }
    },
    [api, updateLayer],
  );
};
