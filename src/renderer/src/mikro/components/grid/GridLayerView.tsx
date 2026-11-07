import { useEffect, useMemo, useState } from "react";
import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { formatSiValue } from "@/core/data/plot/coords/siFormat";
import { PlaneImage } from "@/core/data/plot/plane/PlaneMarks";
import { usePlaneProbe, type PlaneProbe } from "@/core/data/plot/plane/planeProbe";
import { usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import { ColorMap, sampleColorMapRgb } from "@/core/data/scene/gpu/colormaps";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { useMikro } from "@/mikro/api/funcs";
import type { GridCellsLayerFragment, GridHeatmapLayerFragment } from "@/mikro/api/graphql";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { createWindowReader } from "@/mikro/lib/zarr/windowReader";
import { cellAt, rectOf, rgbaOf } from "./gridModel";
import { readArrayHeatmap, readCells, readSparseHeatmap, type GridRead, type GridWorld } from "./gridReaders";
import { useGridStoreApi } from "./gridStore";
import { withUnit } from "@/core/util/units";

export type GridLayerFragment = GridHeatmapLayerFragment | GridCellsLayerFragment;

/** What decides a read: the data and its placement. Colour, range and opacity are looks. */
export const gridLayerReadKey = (layer: GridLayerFragment): string =>
  JSON.stringify({
    id: layer.id,
    lens: layer.lens.id,
    affine: layer.asAffine,
    value: layer.__typename === "CellsGridLayer" ? layer.valueColumn : null,
    filters: layer.__typename === "CellsGridLayer" ? layer.windowFilters : null,
  });

export const colormapOf = (layer: { colormap?: string | null }): ColorMap =>
  (Object.values(ColorMap) as string[]).includes(layer.colormap ?? "") ? (layer.colormap as ColorMap) : ColorMap.Viridis;

/**
 * One grid layer on the plane: read once per structure into a raster of its
 * members, coloured on the CPU through its colormap and drawn as one texture,
 * never smoothed. The hover reads the raster.
 */
export const GridLayerView = ({ layer, world, memberText }: { layer: GridLayerFragment; world: GridWorld; memberText: (axis: "row" | "col", m: number) => string }) => {
  const client = useMikro() as MikroClient | undefined;
  const datalayer = useDatalayerEndpoint();
  const engine = useAttributeServiceOrNull()?.engine ?? null;
  const gridApi = useGridStoreApi();
  const planeApi = usePlaneStoreApi();
  const key = gridLayerReadKey(layer);
  // Held with the read key it answers, so a structural change shows nothing until its own read lands.
  const [held, setHeld] = useState<{ key: string; read: GridRead } | null>(null);
  const read = held && held.key === key ? held.read : null;

  useEffect(() => {
    let cancelled = false;
    const patch = gridApi.getState().patch;
    patch(layer.id, { loading: true, error: null, note: null });
    const reader = createWindowReader(() => (client && datalayer ? { client, datalayer } : null));
    (async (): Promise<GridRead> => {
      if (layer.__typename === "CellsGridLayer") {
        if (!engine) throw new Error("the parquet engine is not ready");
        return readCells(layer, world, engine);
      }
      const lens = layer.lens;
      if (lens.__typename === "ArrayLens") return readArrayHeatmap(layer, lens, world, reader);
      if (lens.__typename === "SparseLens") {
        if (!client || !datalayer) throw new Error("the datalayer is not ready");
        return readSparseHeatmap(layer, lens, world, { client, datalayer });
      }
      throw new Error(`a ${lens.__typename ?? "lens"} is not drawn in a grid`);
    })()
      .then((result) => {
        if (cancelled) return;
        setHeld({ key, read: result });
        patch(layer.id, { loading: false, note: result.note, lo: result.raster.lo, hi: result.raster.hi });
      })
      .catch((error: unknown) => {
        if (!cancelled) patch(layer.id, { loading: false, error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
      reader.dispose();
    };
    // The key stands for everything the read depends on in `layer`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, client, datalayer, engine, gridApi, world.rowAxis, world.columnAxis]);

  const raster = read?.raster ?? null;
  const rect = useMemo(() => (raster ? rectOf(raster) : null), [raster]);
  useEffect(() => {
    planeApi.getState().reportExtent(layer.id, rect);
  }, [planeApi, layer.id, rect]);
  useEffect(
    () => () => {
      planeApi.getState().reportExtent(layer.id, null);
      gridApi.getState().drop(layer.id);
    },
    [planeApi, gridApi, layer.id],
  );

  const colormap = colormapOf(layer);
  const lo = layer.min ?? raster?.lo ?? 0;
  const hi = layer.max ?? raster?.hi ?? 1;
  const rgba = useMemo(
    () => (raster ? rgbaOf(raster, lo, hi, (t) => sampleColorMapRgb(colormap, t)) : null),
    [raster, lo, hi, colormap],
  );

  const valueLabel = layer.__typename === "CellsGridLayer" ? withUnit(layer.valueColumn, layer.valueUnit) : "value";
  const probe = useMemo<PlaneProbe | null>(() => {
    if (!raster) return null;
    return (at) => {
      const cell = cellAt(raster, at.x, at.y);
      if (!cell || Number.isNaN(cell.value)) return null;
      const binned = raster.rowStep > 1 || raster.colStep > 1;
      const rows: [string, string][] = [
        [world.rowAxis, memberText("row", cell.row)],
        ...(world.columnAxis ? ([[world.columnAxis, memberText("col", cell.col)]] as [string, string][]) : []),
        [binned ? `${valueLabel} (largest)` : valueLabel, formatSiValue(cell.value)],
      ];
      const [r, g, b] = sampleColorMapRgb(colormap, (cell.value - lo) / (hi - lo || 1));
      return {
        layerId: layer.id,
        title: layer.name ?? layer.lens.name ?? "layer",
        color: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
        rows,
        distancePx: 0,
        at: null,
      };
    };
  }, [raster, world, memberText, valueLabel, colormap, lo, hi, layer.id, layer.name, layer.lens.name]);
  usePlaneProbe(layer.id, probe);

  if (!raster || !rgba || !rect) return null;
  return <PlaneImage rgba={rgba} columns={raster.cols} rows={raster.rows} rect={rect} opacity={layer.opacity} renderOrder={layer.order} />;
};
