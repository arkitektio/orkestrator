import { ChannelTag } from "../../features/metadata/ChannelMetadata";
import { ROW_PADDING } from "../../features/stacking/stackLayout";
import { formatValue } from "../../platform/probe/formatValue";
import { useChannelColors } from "../../platform/stores/channelColors";
import { useLayerState } from "../../platform/stores/experimentStore";
import { coloursChannels } from "../../platform/model/channelColor";
import type { RowInfo } from "../../platform/stores/viewer/layoutSlice";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Row labels. Down the LEFT edge: which layer each row is, in its colour, with
 * its unit and current scale — or, for OVERLAY's one plot, a legend of every
 * layer in it, each with its own scale. Down the RIGHT edge, level with each channel:
 * what it is called and where it was recorded — a `ChannelTag` that unfolds
 * into everything known about that channel, right underneath it.
 *
 * Rows are laid out in equal fractions of the viewport height (see `stackLayout`),
 * so this is plain percentage positioning — no camera math, and it re-renders only
 * when the layout or a clim changes, which is UI cadence.
 */
export const RowLabels = () => {
  // `rows` is replaced only by a relayout (UI cadence); each row's scale is its
  // own per-key subscription below, so a clim change re-renders one label.
  const rows = useViewerStore((s) => s.rows);
  const rowCount = useViewerStore((s) => s.rowCount);
  const layoutMode = useViewerStore((s) => s.layoutMode);

  if (rowCount === 0) return null;
  return (
    <div className="pointer-events-none absolute top-0 bottom-12 left-0 w-full">
      {rows.map((row) =>
        layoutMode === "STACKED" && row.layerIds.length === 1 ? (
          // Keyed by WHAT the row is, not where: a relayout must not hand one
          // channel's unfolded state to another.
          <StackedTags key={`tags:${row.layerIds[0]}`} layerId={row.layerIds[0]} row={row} rowCount={rowCount} />
        ) : (
          <div
            key={`tags:${row.layerIds.join("|")}`}
            className="absolute right-2 flex flex-col items-end gap-0.5"
            style={{ top: `calc(${((row.index + ROW_PADDING) / rowCount) * 100}% + 2px)` }}
          >
            {row.layerIds.map((id) => (
              <ListedTags key={id} layerId={id} />
            ))}
          </div>
        ),
      )}
      {rows.map((row) =>
        row.overlay ? (
          // One plot, several scales: a legend, one entry per layer.
          <div
            key={row.index}
            className="absolute left-2 flex max-w-[40%] flex-col gap-0.5"
            style={{ top: `calc(${(row.index / rowCount) * 100}% + 4px)` }}
          >
            {row.layerIds.map((id) => (
              <LegendEntry key={id} layerId={id} />
            ))}
          </div>
        ) : (
        <div
          key={row.index}
          className="absolute left-2 flex max-w-[40%] items-center gap-1.5"
          style={{ top: `calc(${(row.index / rowCount) * 100}% + 4px)` }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="truncate text-[11px] font-medium text-foreground/90 drop-shadow">
            {row.label}
          </span>
          {row.unit && (
            <RowScale layerId={row.layerIds.length === 1 ? row.layerIds[0] : null} unit={row.unit} />
          )}
        </div>
        ),
      )}
    </div>
  );
};

/** One line of the overlay legend: a layer's colour, name, and its own scale. */
const LegendEntry = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  if (!layer) return null;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
      <span className="truncate text-[11px] font-medium text-foreground/90 drop-shadow">
        {layer.label}
      </span>
      {layer.valueUnit && <RowScale layerId={layerId} unit={layer.valueUnit} />}
    </div>
  );
};

/** A trace layer's drawn channels, as (slot, label, site); empty for any other kind. */
const useChannels = (layerId: string) => {
  const layer = useLayerState(layerId);
  const colors = useChannelColors(layerId);
  // A dot on the tag only when channels are told apart by colour — and a lone
  // channel is already the layer's colour, which the row label shows.
  const layoutMode = useViewerStore((s) => s.layoutMode);
  if (!layer || layer.kind !== "trace") return [];
  const individual = coloursChannels(layer.persisted.channelColoring, layoutMode);
  const count = Math.max(1, layer.channelLabels.length, layer.channelSites.length);
  return Array.from({ length: count }, (_, slot) => ({
    slot,
    label: layer.channelLabels[slot] ?? null,
    site: layer.channelSites[slot] ?? null,
    color: individual && count > 1 ? (colors[slot] ?? null) : null,
  }));
};

/**
 * STACKED splits a multi-channel row into sub-bands, so each channel's tag sits
 * level with its own band.
 */
const StackedTags = ({ layerId, row, rowCount }: { layerId: string; row: RowInfo; rowCount: number }) => {
  const channels = useChannels(layerId);
  const band = (1 - 2 * ROW_PADDING) / Math.max(1, channels.length);
  return (
    <>
      {channels.map(({ slot, label, site, color }) => (
        <div
          key={slot}
          className="absolute right-2"
          style={{ top: `calc(${((row.index + ROW_PADDING + slot * band) / rowCount) * 100}% + 2px)` }}
        >
          <ChannelTag layerId={layerId} slot={slot} label={label} site={site} color={color} />
        </div>
      ))}
    </>
  );
};

/**
 * Where a row overlays several layers or channels on one scale (SHARED) there
 * is no band to line up with, so the tags list down from the row's top.
 */
const ListedTags = ({ layerId }: { layerId: string }) => {
  const channels = useChannels(layerId);
  return (
    <>
      {channels.map(({ slot, label, site, color }) => (
        <ChannelTag key={slot} layerId={layerId} slot={slot} label={label} site={site} color={color} />
      ))}
    </>
  );
};

/** A row's unit and current scale — subscribed per layer, so only its label re-renders. */
const RowScale = ({ layerId, unit }: { layerId: string | null; unit: string }) => {
  const lo = useViewerStore((s) => (layerId ? s.clims[layerId]?.lo : undefined));
  const hi = useViewerStore((s) => (layerId ? s.clims[layerId]?.hi : undefined));
  return (
    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
      {lo != null && hi != null ? `${formatValue(lo)}…${formatValue(hi)} ${unit}` : unit}
    </span>
  );
};
