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
 * The card for a spikes layer: how many units and spikes it drew, whether the
 * canvas shows ticks or a rate histogram, and why when it shows nothing. "3 of
 * 400 units" means the spike budget stopped the read; an error names the grant
 * or layout problem.
 */
export const SpikesLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<LayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const pickerProblems = usePickerProblems(layer.id);
  const raw = useRawLayer(layer.id, "SpikesLayer");
  const write = useLayerWrite();
  const message = unplaceableMessage(layer.placeability);

  return (
    <CardShell
      color={layer.color}
      title={layer.label}
      subtitle={["spikes", layer.raster?.valueMode === "AMPLITUDE" ? "amplitude" : null, readout?.note]
        .filter(Boolean)
        .join(" · ")}
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={<LayerMenu layerId={layer.id} label={layer.label} />}
    >
      {message && <div className="text-[11px] text-amber-500">{message}</div>}
      <PlacementFix layer={layer} />
      {!message && layer.sourceFailure && (
        <div className="text-[11px] text-amber-500">Cannot be drawn ({layer.sourceFailure})</div>
      )}
      {layer.spikes && !hidden && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Colour</span>
            <span className="ml-auto">
              <ColorInput value={layer.persisted.color} resolved={layer.color} onCommit={(color) => void write(layer.id, { color })} />
            </span>
          </div>
          <CardFact
            label="Spikes"
            value={
              readout?.count != null
                ? `${readout.count.toLocaleString()}${readout.truncated ? " (budget)" : ""}${readout.loading ? " …" : ""}`
                : readout?.loading
                  ? "…"
                  : null
            }
          />
          {readout?.density && (
            <div className="text-[11px] text-muted-foreground">
              {layer.raster?.rateBin != null ? "Drawn as a rate histogram." : "Too dense to tick — showing firing rate."}
            </div>
          )}
          {raw && (
            <PickerSection
              kind="spikes"
              layerId={layer.id}
              root={raw?.unitTable ?? null}
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
