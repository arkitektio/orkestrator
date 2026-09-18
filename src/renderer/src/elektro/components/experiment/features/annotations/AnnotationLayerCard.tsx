import { useMemo } from "react";
import type { ExpAnnotationLayerFragment } from "@/elektro/api/graphql";
import { unplaceableMessage } from "../../platform/model/placeable";
import { PlacementFix } from "../../platform/edits/PlacementFix";
import type { LayerState } from "../../platform/model/layerModel";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { CardFact, CardShell, type LayerCardProps } from "../../platform/layerui/cardShell";
import { LayerMenu } from "../../platform/layerui/layerControls";
import { annotationMarks } from "./annotationGeometry";

/**
 * The card for an annotation layer.
 *
 * Its registry entry is `source: "fragment"`: an annotation layer is drawn
 * straight from its collection and is never normalized into marks up front, so
 * the RAW fragment is what its layer reads — and therefore what this card reads
 * too. Counting marks from the
 * same `annotationMarks` the layer uses keeps the card and the canvas in agreement.
 *
 * It says how many row-scoped shapes were drawn by time only. That is a data-model
 * gap (no annotation names the layer whose row its value belongs to), and hiding it
 * would make those shapes look correctly placed when they are not.
 */
export const AnnotationLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<LayerState>) => {
  const raw = useExperimentStore(
    (s) => s.rawLayers[layer.id] as ExpAnnotationLayerFragment | undefined,
  );
  const world = useExperimentStore((s) => s.world);

  const marks = useMemo(
    () =>
      raw
        ? annotationMarks({
            annotations: raw.annotationCollection.annotations,
            system: raw.annotationCollection.coordinateSystem,
            asAffine: raw.asAffine,
            world,
          })
        : null,
    [raw, world],
  );
  const message = unplaceableMessage(layer.placeability);

  return (
    <CardShell
      color={layer.color}
      title={layer.label}
      subtitle="annotations"
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={<LayerMenu layerId={layer.id} label={layer.label} />}
    >
      {message && <div className="text-[11px] text-amber-500">{message}</div>}
      <PlacementFix layer={layer} />
      {marks && (
        <div className="flex flex-col gap-0.5">
          <CardFact label="Events" value={marks.events.length || null} />
          <CardFact label="Epochs" value={marks.epochs.length || null} />
          {marks.rowScoped > 0 && (
            <div className="text-[11px] text-amber-500">
              {marks.rowScoped} row-scoped shape{marks.rowScoped === 1 ? "" : "s"} shown by
              time only — no layer is named for their values.
            </div>
          )}
          {marks.skipped > 0 && (
            <div className="text-[11px] text-muted-foreground">
              {marks.skipped} could not be placed on this timeline.
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
};
