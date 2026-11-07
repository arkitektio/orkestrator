import { useCallback, useEffect, useMemo } from "react";
import { formatSiValue } from "@/core/data/plot/coords/siFormat";
import { PlaneSegments } from "@/core/data/plot/plane/PlaneMarks";
import { colorsThrough, packDots, packPolyline } from "@/core/data/plot/plane/planeMarks";
import { usePlaneProbe, type PlaneProbe } from "@/core/data/plot/plane/planeProbe";
import { usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import { buildPointIndex } from "@/core/data/plot/plane/pointIndex";
import type { PlaneExtent } from "@/core/data/plot/plane/planeView";
import type { LayerReadout } from "@/core/data/plot/stores/viewerStore";
import { useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { ColorMap, sampleColorMapRgb } from "@/core/data/scene/gpu/colormaps";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { rowSql } from "@/mikro/lib/parquet/valuesSql";
import { drawsLine, drawsMarkers } from "../../platform/model/chartLayerModel";
import { useChartLayer } from "../../platform/stores/chartStore";
import { usePointsData, type PointsSource } from "./usePointsData";

/** The colormap a third column (`zColumn`) is drawn through. */
export const POINTS_Z_COLORMAP = ColorMap.Viridis;

const withUnit = (name: string, unit: string | null) => (unit ? `${name} (${unit})` : name);

const formatCell = (value: unknown): string =>
  typeof value === "number" ? formatSiValue(value) : value == null ? "–" : String(value);

/**
 * A points layer: a table's rows drawn at the values of two columns, coloured
 * by a third when it names one. Drawn as fat-line dots (a round-capped segment
 * through each point), so a million points are one draw call, sized in screen
 * pixels at every zoom, with real alpha.
 */
export const PointsChartLayer = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const source = layer?.values?.kind === "points" ? (layer.values as PointsSource) : null;
  const engine = useAttributeServiceOrNull()?.engine ?? null;
  const viewerApi = useViewerStoreApi();
  const planeApi = usePlaneStoreApi();

  const readout = useCallback(
    (patch: Partial<LayerReadout>) => viewerApi.getState().patchReadout(layerId, patch),
    [viewerApi, layerId],
  );
  const extent = useCallback(
    (box: PlaneExtent | null) => planeApi.getState().reportExtent(layerId, box),
    [planeApi, layerId],
  );
  const data = usePointsData(source, engine, { readout, extent });

  const origin = useMemo(
    () => (data ? { x: (data.extent.x0 + data.extent.x1) / 2, y: (data.extent.y0 + data.extent.y1) / 2 } : { x: 0, y: 0 }),
    [data],
  );
  const dots = useMemo(() => {
    if (!data) return null;
    const rgb = data.zs && data.zRange ? colorsThrough(data.zs, data.zRange.lo, data.zRange.hi, (t) => sampleColorMapRgb(POINTS_Z_COLORMAP, t)) : null;
    const span = Math.max(data.extent.x1 - data.extent.x0, data.extent.y1 - data.extent.y0);
    return packDots(data.xs, data.ys, { origin, span, rgb });
  }, [data, origin]);
  const line = useMemo(() => {
    if (!data || !layer || !drawsLine(layer.mark)) return null;
    // A line through points joins them in order along x, as the server's mark says.
    const order = Array.from(data.xs.keys()).sort((a, b) => data.xs[a] - data.xs[b]);
    return packPolyline(
      order.map((i) => data.xs[i]),
      order.map((i) => data.ys[i]),
      origin,
    );
  }, [data, layer, origin]);

  const index = useMemo(() => (data ? buildPointIndex(data.xs, data.ys) : null), [data]);
  const probe = useMemo<PlaneProbe | null>(() => {
    if (!data || !index || !source || !layer) return null;
    return (at, scale) => {
      const i = index.nearest(at.x, at.y, scale.pxPerX, scale.pxPerY, 24);
      if (i === null) return null;
      const dx = (data.xs[i] - at.x) * scale.pxPerX;
      const dy = (data.ys[i] - at.y) * scale.pxPerY;
      const row = data.rows[i];
      const rows: [string, string][] = [
        [withUnit(source.x, source.units.x), formatSiValue(data.xs[i])],
        [withUnit(source.y, source.units.y), formatSiValue(data.ys[i])],
      ];
      if (source.z && data.zs) rows.push([withUnit(source.z, source.units.z), formatSiValue(data.zs[i])]);
      return {
        layerId,
        title: `${layer.label} · row ${row}`,
        color: layer.solidColor,
        rows,
        distancePx: Math.hypot(dx, dy),
        at: { x: data.xs[i], y: data.ys[i] },
        detail: engine
          ? {
              key: `${layerId}:${row}`,
              load: async () => {
                const read = await engine.readAcross([source.store], (urlOf) => rowSql(urlOf(source.store.id), row));
                const shown = new Set([source.x, source.y, source.z]);
                return Object.entries(read[0] ?? {})
                  .filter(([name]) => !shown.has(name))
                  .slice(0, 12)
                  .map(([name, value]) => [name, formatCell(value)] as const);
              },
            }
          : undefined,
      };
    };
  }, [data, index, source, layer, layerId, engine]);
  usePlaneProbe(layerId, probe);

  useEffect(() => {
    if (!layer) return;
    planeApi.getState().setLegend(layerId, {
      entries: [{ key: layerId, label: layer.label, color: layer.solidColor }],
      scale:
        source?.z && data?.zRange
          ? { title: withUnit(source.z, source.units.z), colormap: POINTS_Z_COLORMAP, lo: data.zRange.lo, hi: data.zRange.hi }
          : null,
    });
  }, [planeApi, layerId, layer, source, data]);
  useEffect(
    () => () => {
      planeApi.getState().reportExtent(layerId, null);
      planeApi.getState().setLegend(layerId, null);
    },
    [planeApi, layerId],
  );

  if (!layer || !dots) return null;
  const drawDots = drawsMarkers(layer.mark) || !drawsLine(layer.mark);
  return (
    <>
      {line && (
        <PlaneSegments
          pairs={line.pairs}
          count={line.count}
          origin={origin}
          color={layer.solidColor}
          width={layer.lineWidth}
          opacity={layer.opacity}
          renderOrder={2}
        />
      )}
      {drawDots && (
        <PlaneSegments
          pairs={dots.pairs}
          count={dots.count}
          origin={origin}
          color={layer.solidColor}
          colors={dots.colors}
          width={layer.markerSize}
          opacity={layer.opacity}
          renderOrder={3}
        />
      )}
    </>
  );
};
