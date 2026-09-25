import { MapPin } from "lucide-react";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/components/ui/button";
import type { LayerState } from "../model/layerModel";
import { useExperimentStore } from "../stores/experimentStore";

/**
 * The "place it" affordance under an UNREGISTERED layer's card — the gap to
 * close, as opposed to UNMAPPABLE (a fact to badge, no button) and CONDITIONAL
 * (a coordinate to pick). Opens `placeexperimentlayer` with the layer's own
 * system, read off its raw fragment whatever its kind.
 */
export const sourceSystemOf = (raw: unknown): { id: string; name?: string | null } | null => {
  const r = raw as {
    lens?: { dataset?: { intrinsicSystem?: { id: string; name?: string | null } | null } } | null;
    sparseDataset?: { coordinateSystem?: { id: string; name?: string | null } | null } | null;
    tableDataset?: { coordinateSystem?: { id: string; name?: string | null } | null } | null;
    annotationCollection?: { coordinateSystem?: { id: string; name?: string | null } | null } | null;
  } | null;
  return (
    r?.lens?.dataset?.intrinsicSystem ??
    r?.sparseDataset?.coordinateSystem ??
    r?.tableDataset?.coordinateSystem ??
    r?.annotationCollection?.coordinateSystem ??
    null
  );
};

export const PlacementFix = ({ layer }: { layer: LayerState }) => {
  const raw = useExperimentStore((s) => s.rawLayers[layer.id]);
  const world = useExperimentStore((s) => s.world) as { id?: string; name?: string | null } | null;
  const { openDialog } = useDialog();
  if (layer.placeability.drawable || layer.placeability.reason !== "unregistered") return null;
  const source = sourceSystemOf(raw);
  if (!source || !world?.id) return null;
  return (
    <Button
      size="xs"
      variant="outline"
      className="w-fit"
      onClick={() =>
        openDialog(
          "placeexperimentlayer",
          { source: source.id, world: world.id!, worldName: world.name ?? null, label: layer.label },
          { size: "medium" },
        )
      }
    >
      <MapPin className="h-3 w-3" /> Place on the timeline…
    </Button>
  );
};
