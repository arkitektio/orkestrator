import { unplaceableMessage } from "../../platform/model/placeable";
import { PlacementFix } from "../../platform/edits/PlacementFix";
import type { LayerState } from "../../platform/model/layerModel";
import { CardFact, CardShell, type LayerCardProps } from "../../platform/layerui/cardShell";
import { LayerMenu } from "../../platform/layerui/layerControls";
import type { AnnotationMarks } from "./annotationGeometry";
import { useAnnotationMarks } from "./store/annotationSlice";

/** Distinct value shapes — one shape drawn in two rows is still one annotation. */
const shapeCount = (marks: AnnotationMarks): number =>
  new Set(marks.rows.flatMap((row) => row.shapes.map((shape) => shape.id))).size;

/**
 * The card for an annotation layer.
 *
 * Its registry entry is `source: "fragment"`: an annotation layer is drawn
 * straight from its collection and is never normalized into marks up front, so
 * the RAW fragment is what its layer reads — and therefore what this card reads
 * too. Counting marks from the
 * same `annotationMarks` the layer uses keeps the card and the canvas in agreement.
 *
 * It says how many row-scoped shapes were drawn by time only — a value
 * collection whose lens no trace in this experiment reads has no row to draw
 * them in, and hiding that would make them look correctly placed when they are
 * not.
 */
export const AnnotationLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<LayerState>) => {
  const marks = useAnnotationMarks(layer.id) ?? null;
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
          <CardFact label="Shapes" value={shapeCount(marks) || null} />
          {marks.rowScoped > 0 && (
            <div className="text-[11px] text-amber-500">
              {marks.rowScoped} row-scoped shape{marks.rowScoped === 1 ? "" : "s"} shown by
              time only — no trace here reads the lens they were drawn over.
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
