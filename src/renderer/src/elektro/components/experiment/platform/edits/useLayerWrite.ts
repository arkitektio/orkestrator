import { useCallback } from "react";
import { toast } from "sonner";
import {
  useUpdateEventsLayerMutation,
  useUpdateLayerMutation,
  useUpdateSpikesLayerMutation,
  useUpdateTraceLayerMutation,
} from "@/elektro/api/graphql";
import type { PersistedLayer } from "../model/layerModel";
import { useExperimentStoreApi } from "../stores/experimentStore";

/**
 * Write a layer edit back — optimistically.
 *
 * The edit lands in the store's overlay at once (`patchLayer`), so the timeline
 * and the panel change on the click, not on the round trip; the mutation's
 * result then updates Apollo's normalized cache, the scene query re-emits, and
 * the provider's fold drops the patch once the server agrees. A failed write
 * rolls back exactly its own fields and says so.
 *
 * Which mutation: the kind-agnostic `updateLayer` when only shared fields
 * (visibility, order, opacity, name) change; the per-kind update when a field
 * only that kind has (colour, width, clim) is in the patch. Every edit is
 * CONTENT — no structural signature moves, so no tile refetches.
 *
 * A null in an update input means "leave it", so a field cannot be CLEARED
 * through here; nothing offers that.
 */

const SHARED = ["name", "visible", "order", "opacity"] as const;

const pick = <T extends object, K extends keyof T>(from: T, keys: readonly K[]): Partial<Pick<T, K>> => {
  const out: Partial<Pick<T, K>> = {};
  for (const key of keys) if (key in from) out[key] = from[key];
  return out;
};

export const useLayerWrite = () => {
  const api = useExperimentStoreApi();
  const [updateLayer] = useUpdateLayerMutation();
  const [updateTrace] = useUpdateTraceLayerMutation();
  const [updateSpikes] = useUpdateSpikesLayerMutation();
  const [updateEvents] = useUpdateEventsLayerMutation();

  return useCallback(
    async (layerId: string, patch: Partial<PersistedLayer>): Promise<boolean> => {
      const layer = api.getState().layers.find((l) => l.id === layerId);
      if (!layer) return false;
      const rollback = api.getState().patchLayer(layerId, patch);

      const shared = pick(patch, SHARED);
      const color = patch.color ? [...patch.color] : undefined;
      const onlyShared = Object.keys(patch).every((key) =>
        (SHARED as readonly string[]).includes(key),
      );

      try {
        if (onlyShared) {
          await updateLayer({ variables: { input: { id: layerId, ...shared } } });
        } else if (layer.kind === "trace") {
          await updateTrace({
            variables: {
              input: {
                id: layerId,
                ...shared,
                color,
                lineWidth: patch.lineWidth ?? undefined,
                climMin: patch.climMin ?? undefined,
                climMax: patch.climMax ?? undefined,
              },
            },
          });
        } else if (layer.kind === "spikes") {
          await updateSpikes({
            variables: {
              input: {
                id: layerId,
                ...shared,
                color,
                climMin: patch.climMin ?? undefined,
                climMax: patch.climMax ?? undefined,
              },
            },
          });
        } else if (layer.kind === "events") {
          await updateEvents({ variables: { input: { id: layerId, ...shared, color } } });
        } else {
          // An annotation layer has only the shared fields.
          await updateLayer({ variables: { input: { id: layerId, ...shared } } });
        }
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
    [api, updateLayer, updateTrace, updateSpikes, updateEvents],
  );
};
