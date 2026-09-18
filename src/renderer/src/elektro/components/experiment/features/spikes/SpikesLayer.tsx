import { useEffect, useMemo } from "react";
import { Color } from "three";
import type { ExpSpikesLayerFragment } from "@/elektro/api/graphql";
import { sampleColorMapRgb, type ColorMap } from "@/lib/scene/gpu/colormaps";
import { BarMesh, TickLines } from "../../platform/marks/BandMarks";
import { activeEntries, colorResolver, rulesKeep } from "../../platform/pickers/pickerModel";
import { usePickerValues } from "../../platform/pickers/usePickerValues";
import { unitIdColumn } from "../../platform/sources/unitTable";
import { countInWindow, laneRateQuads, rateBinWidth, shouldDrawDensity } from "../../platform/marks/density";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useRangeStore } from "../../platform/stores/rangeStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useLayerState } from "../traces/useLayerState";
import { useSpikeRaster } from "./useSpikeRaster";

/**
 * A spikes layer: a raster, one lane per unit, one tick per spike.
 *
 *  - Colour: the active colour-by (a unit-table column, possibly through a
 *    join) when there is one; else AMPLITUDE through the layer's colormap
 *    between its clim (or the amplitudes' own range); else the layer's colour.
 *  - Rows: units the active filter-bys drop are not drawn (AND across rules).
 *  - A per-unit RATE HISTOGRAM instead of ticks when the layer asks for one
 *    (`rateBin`) or when there are more ticks in view than the canvas can show
 *    — never more marks than pixels, the rule the trace pyramid follows. Its
 *    bins are `rateBin` wide, or one pixel when zoomed out past that.
 *
 * Spikes are read once per layer (`useSpikeRaster`); what follows the COMMITTED
 * window is only the density choice and the histogram, both CPU-cheap.
 */

/** Ticks per pixel column beyond which the raster turns into a rate histogram. */
const TICKS_PER_PIXEL = 4;

export const SpikesLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  const raw = useExperimentStore((s) => s.rawLayers[layerId]) as ExpSpikesLayerFragment | undefined;
  const unitTable = raw?.unitTable ?? null;

  // The active pickers, keyed by unit index: one walk from the unit table each.
  const pickers = useMemo(() => (raw ? activeEntries(raw) : { colorBy: null, filters: [] }), [raw]);
  const root = useMemo(
    () =>
      unitTable
        ? { id: unitTable.id, store: unitTable.store, idColumn: unitIdColumn(unitTable, layer?.spikes?.unitAxis) }
        : null,
    [unitTable, layer?.spikes?.unitAxis],
  );
  const pickerEntries = useMemo(
    () => [...(pickers.colorBy ? [pickers.colorBy] : []), ...pickers.filters],
    [pickers],
  );
  const { maps } = usePickerValues(root, pickerEntries, 0);

  const keep = useMemo(() => {
    const rules = pickers.filters
      .filter((f) => maps[f.key])
      .map((f) => ({ filter: f.entry, valueOf: (unit: unknown) => maps[f.key].get(unit) }));
    return {
      key: JSON.stringify(rules.map((r) => r.filter)),
      keepUnit: rules.length > 0 ? (unit: number) => rulesKeep(rules, unit) : null,
    };
  }, [pickers.filters, maps]);

  const raster = useSpikeRaster(
    layerId,
    layer?.spikes ?? null,
    unitTable,
    layer?.raster?.rowOrderColumn ?? null,
    keep,
  );
  const committed = useRangeStore((s) => s.committedRange);
  const timeOrigin = useExperimentStore((s) => s.timeOrigin);
  const widthPx = useViewerStore((s) => s.viewportPx.width);
  const viewerApi = useViewerStoreApi();

  const start = committed.start - timeOrigin;
  const end = committed.end - timeOrigin;
  const settings = layer?.raster;

  const inView = useMemo(() => (raster ? countInWindow(raster.xs, start, end) : 0), [raster, start, end]);
  const density = settings?.rateBin != null || shouldDrawDensity(inView, widthPx * TICKS_PER_PIXEL);

  const rateQuads = useMemo(() => {
    if (!raster || !density) return null;
    const bin = rateBinWidth(settings?.rateBin ?? null, { start, end }, widthPx);
    return laneRateQuads(raster.xs, raster.lanes, raster.laneCount, start, end, bin);
  }, [raster, density, settings?.rateBin, start, end, widthPx]);

  const colorByMap = pickers.colorBy ? maps[pickers.colorBy.key] ?? null : null;
  const pickerColors = useMemo(() => {
    if (!raster || !pickers.colorBy || !colorByMap) return null;
    const resolve = colorResolver(pickers.colorBy.entry, [...colorByMap.values()], (colormap, t) =>
      sampleColorMapRgb(colormap as ColorMap | null, t),
    );
    const laneRgb = Array.from(raster.unitOfLane, (unit) => resolve(colorByMap.get(unit)));
    const colors = new Float32Array(raster.xs.length * 3);
    const base = baseRgb(layer?.color ?? "#ffffff");
    raster.lanes.forEach((lane, i) => colors.set(laneRgb[lane] ?? base, i * 3));
    return colors;
  }, [raster, pickers.colorBy, colorByMap, layer?.color]);

  const amplitudeColors = useMemo(() => {
    if (!raster || settings?.valueMode !== "AMPLITUDE" || raster.values.length === 0) return null;
    let lo = layer?.climSeed?.lo ?? Infinity;
    let hi = layer?.climSeed?.hi ?? -Infinity;
    if (!layer?.climSeed) {
      for (const v of raster.values) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const span = hi > lo ? hi - lo : 1;
    const colors = new Float32Array(raster.values.length * 3);
    raster.values.forEach((v, i) => {
      colors.set(sampleColorMapRgb((settings.colormap ?? null) as ColorMap | null, (v - lo) / span), i * 3);
    });
    return colors;
  }, [raster, settings?.valueMode, settings?.colormap, layer?.climSeed]);

  useEffect(() => {
    if (viewerApi.getState().readouts[layerId]?.density !== density) {
      viewerApi.getState().patchReadout(layerId, { density });
    }
  }, [viewerApi, layerId, density, raster]);

  if (!layer || !raster || raster.laneCount === 0) return null;
  return density && rateQuads ? (
    <BarMesh layerId={layerId} quads={rateQuads} laneCount={raster.laneCount} color={layer.color} opacity={0.85} />
  ) : (
    <TickLines
      layerId={layerId}
      xs={raster.xs}
      lanes={raster.lanes}
      laneCount={raster.laneCount}
      height={settings?.tickHeight ?? 0.8}
      color={layer.color}
      colors={pickerColors ?? amplitudeColors}
      lineWidth={Math.max(1, layer.lineWidth)}
    />
  );
};

/** A CSS colour as 0–1 RGB, via a throwaway canvas-free parse. */
const baseRgb = (css: string): [number, number, number] => {
  const color = new Color().setStyle(css);
  return [color.r, color.g, color.b];
};
