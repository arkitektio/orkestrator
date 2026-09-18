import { unplaceableMessage } from "../../platform/model/placeable";
import { PlacementFix } from "../../platform/edits/PlacementFix";
import { PickerSection } from "../../platform/pickers/PickerSection";
import { usePickerProblems } from "../../platform/pickers/pickerSlice";
import { useRawLayer } from "../../platform/stores/experimentStore";
import type { LayerState } from "../../platform/model/layerModel";
import { useLayerWrite } from "../../platform/edits/useLayerWrite";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { CardFact, CardShell, type LayerCardProps } from "../../platform/layerui/cardShell";
import { ColorInput, LayerMenu } from "../../platform/layerui/layerControls";

/**
 * The card for an events layer: which columns it reads, how many events it
 * drew of how many there are, and whether what is on screen is the events or
 * their density. The readout is the diagnostic — "0 of 12,000" with an error is
 * a grant or a column problem, "20,000 of 1.2 M, truncated" is a zoom-in hint.
 */
export const EventsLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<LayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const pickerProblems = usePickerProblems(layer.id);
  const raw = useRawLayer(layer.id, "EventsLayer");
  const write = useLayerWrite();
  const message = unplaceableMessage(layer.placeability);
  const events = layer.events;

  const countLine =
    readout && readout.count != null
      ? readout.total != null && readout.total !== readout.count
        ? `${readout.count.toLocaleString()} of ${readout.total.toLocaleString()}${readout.truncated ? " (window limit)" : ""}`
        : readout.count.toLocaleString()
      : null;

  return (
    <CardShell
      color={layer.color}
      title={layer.label}
      subtitle={["events", readout?.note].filter(Boolean).join(" · ")}
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={<LayerMenu layerId={layer.id} label={layer.label} />}
    >
      {message && <div className="text-[11px] text-amber-500">{message}</div>}
      <PlacementFix layer={layer} />
      {!message && layer.sourceFailure && (
        <div className="text-[11px] text-amber-500">Cannot be drawn ({layer.sourceFailure})</div>
      )}
      {events && !hidden && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Colour</span>
            <span className="ml-auto">
              <ColorInput value={layer.persisted.color} onCommit={(color) => void write(layer.id, { color })} />
            </span>
          </div>
          <CardFact
            label="Columns"
            value={[events.timeColumn, events.stopColumn, events.labelColumn, events.laneColumn]
              .filter(Boolean)
              .join(" · ")}
          />
          <CardFact label="Events" value={countLine ? `${countLine}${readout?.loading ? " …" : ""}` : readout?.loading ? "…" : null} />
          {readout?.density && (
            <div className="text-[11px] text-muted-foreground">Too many to draw one by one — showing their density.</div>
          )}
          {raw && (
            <PickerSection
              kind="events"
              layerId={layer.id}
              root={raw?.tableDataset ?? null}
              colorBys={raw.colorBys}
              filterBys={raw.filterBys}
              activeColorBy={raw.activeColorBy ?? null}
              activeFilterBys={raw.activeFilterBys}
              problems={pickerProblems}
            />
          )}
          {readout?.error && (
            <div className="truncate text-[11px] text-destructive" title={readout.error}>
              {readout.error}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
};
