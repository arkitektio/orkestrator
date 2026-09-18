import { useCallback } from "react";
import { toast } from "sonner";
import {
  type ColorMap,
  useUpdateEventsLayerMutation,
  useUpdateSpikesLayerMutation,
} from "@/elektro/api/graphql";
import {
  colorByInput,
  filterByInput,
  type ColorByLike,
  type FilterByLike,
} from "./pickerModel";

export type PickerPatch = {
  colorBys?: readonly ColorByLike[];
  filterBys?: readonly FilterByLike[];
  activeColorBy?: number | null;
  activeFilterBys?: readonly number[];
};

/**
 * Write a spikes or events layer's pickers back.
 *
 * NOT optimistic, unlike the style edits: a picker change re-reads parquet, so
 * the round trip is dwarfed by the read it triggers anyway, and the mutation's
 * answer (normalized into Apollo's cache) is the one source of what is active.
 * A picker list is REPLACED WHOLE, so every entry goes back with every field it
 * was read with (`colorByInput` / `filterByInput`).
 */
export const usePickerWrite = (kind: "spikes" | "events", layerId: string) => {
  const [updateSpikes] = useUpdateSpikesLayerMutation();
  const [updateEvents] = useUpdateEventsLayerMutation();

  return useCallback(
    async (patch: PickerPatch): Promise<boolean> => {
      const input = {
        id: layerId,
        // The pure model carries colormap names as strings; the input wants the
        // generated enum, whose values they are.
        colorBys: patch.colorBys?.map((entry) => ({
          ...colorByInput(entry),
          colormap: (entry.colormap ?? null) as ColorMap | null,
        })),
        filterBys: patch.filterBys?.map(filterByInput),
        activeColorBy: patch.activeColorBy,
        activeFilterBys: patch.activeFilterBys ? [...patch.activeFilterBys] : undefined,
      };
      try {
        if (kind === "spikes") await updateSpikes({ variables: { input } });
        else await updateEvents({ variables: { input } });
        return true;
      } catch (error) {
        toast.error(`Could not save the picker: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    },
    [kind, layerId, updateSpikes, updateEvents],
  );
};
