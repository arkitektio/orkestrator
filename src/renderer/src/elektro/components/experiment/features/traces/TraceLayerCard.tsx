import { Scaling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayerWrite } from "../../platform/edits/useLayerWrite";
import { unplaceableMessage } from "../../platform/model/placeable";
import { PlacementFix } from "../../platform/edits/PlacementFix";
import type { LayerState } from "../../platform/model/layerModel";
import { formatValue } from "../../platform/probe/formatValue";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { CardFact, CardShell, type LayerCardProps } from "../../platform/layerui/cardShell";
import { ColorInput, LayerMenu, LineWidthSelect } from "../../platform/layerui/layerControls";

/**
 * The card for a trace layer.
 *
 * Reads the NORMALIZED `LayerState` (its registry entry is `source: "layerState"`):
 * the clim, the pyramid readout and the placement verdict are what the renderer
 * uses, and a card editing anything else would disagree with the line on screen.
 *
 * Shows where the layer is in its pyramid — which level is being drawn out of how
 * many, and how much of the window is covered — because "why is this blocky?" and
 * "why is part of it missing?" are the two questions a multiscale trace prompts,
 * and both are answered by one line here.
 *
 * Edits (colour, width, autoscale) are written back optimistically: autoscale
 * rescales to what is on screen AND persists that range as the layer's clim, so
 * the next visit opens at the same scale.
 */
export const TraceLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<LayerState>) => {
  const stats = useViewerStore((s) => s.stats[layer.id]);
  const clim = useViewerStore((s) => s.clims[layer.id]);
  const viewerApi = useViewerStoreApi();
  const write = useLayerWrite();
  const message = unplaceableMessage(layer.placeability);

  const levelLine =
    stats && stats.levelIndex >= 0
      ? stats.levelIndex === 0
        ? `raw · ${stats.levelCount} level${stats.levelCount === 1 ? "" : "s"}`
        : `level ${stats.level} of ${stats.levelCount}`
      : null;

  const channels = layer.channelLabels.filter(Boolean).join(", ");

  const autoscale = () => {
    const set = viewerApi.getState().autoscale(layer.id)[layer.id];
    if (set) void write(layer.id, { climMin: set.lo, climMax: set.hi });
  };

  return (
    <CardShell
      color={layer.color}
      title={layer.label}
      subtitle={
        [
          layer.siteLabel && layer.siteLabel !== layer.label ? layer.siteLabel : null,
          layer.channelCount > 1 ? `${layer.channelCount} ch` : null,
          layer.valueUnit,
          layer.duration,
        ]
          .filter(Boolean)
          .join(" · ") || null
      }
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={
        <>
          {layer.source && (
            <Button
              size="icon-xs"
              variant="ghost"
              title="Autoscale to what is on screen, and keep that scale"
              onClick={autoscale}
            >
              <Scaling />
            </Button>
          )}
          <LayerMenu layerId={layer.id} label={layer.label} />
        </>
      }
    >
      {message && (
        <div
          className={
            layer.placeability.drawable
              ? "text-[11px] text-muted-foreground"
              : "text-[11px] text-amber-500"
          }
          title={
            !layer.placeability.drawable ? layer.placeability.detail ?? undefined : undefined
          }
        >
          {message}
          {layer.sourceFailure ? ` (${layer.sourceFailure})` : ""}
        </div>
      )}
      <PlacementFix layer={layer} />
      {!message && layer.sourceFailure && (
        <div className="text-[11px] text-amber-500">Cannot be drawn ({layer.sourceFailure})</div>
      )}
      {layer.source && !hidden && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Style</span>
            <span className="ml-auto flex items-center gap-1.5">
              <ColorInput value={layer.persisted.color} onCommit={(color) => void write(layer.id, { color })} />
              <LineWidthSelect
                value={layer.lineWidth}
                onCommit={(lineWidth) => void write(layer.id, { lineWidth })}
              />
            </span>
          </div>
          <CardFact label="Channels" value={channels || null} />
          <CardFact label="Drawn from" value={levelLine} />
          <CardFact
            label="Coverage"
            value={stats ? `${Math.round(stats.coverage * 100)}%${stats.loading ? " …" : ""}` : null}
          />
          <CardFact
            label="Scale"
            value={clim ? `${formatValue(clim.lo)} … ${formatValue(clim.hi)}` : null}
          />
          {stats?.error && (
            <div className="truncate text-[11px] text-destructive" title={stats.error}>
              {stats.error}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
};
