import { useCallback, useEffect, useMemo, useState } from "react";
import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import { formatSiValue } from "@/core/data/plot/coords/siFormat";
import { groupColor } from "@/core/data/plot/plane/PlaneLegend";
import { PlaneQuads, PlaneSegments } from "@/core/data/plot/plane/PlaneMarks";
import { hexToLinear, packQuads, packSegments, srgbToLinear } from "@/core/data/plot/plane/planeMarks";
import { usePlaneProbe, type PlaneProbe } from "@/core/data/plot/plane/planeProbe";
import { usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import type { LayerReadout } from "@/core/data/plot/stores/viewerStore";
import { useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { boxSql, defaultBins, distributionExtentSql, histogramSql } from "@/mikro/lib/parquet/valuesSql";
import type { ChartLayerState, ValuesSource } from "../../platform/model/chartLayerModel";
import { useChartLayer } from "../../platform/stores/chartStore";
import { boxGeometry, histogramGeometry, type BoxStats, type Group, type HistogramBin } from "./distributionModel";

export type DistributionSource = Extract<ValuesSource, { kind: "distribution" }>;

type Summary =
  | { kind: "histogram"; groups: Group[]; bins: HistogramBin[]; domain: { lo: number; hi: number }; binCount: number }
  | { kind: "box"; boxes: BoxStats[] };

/**
 * Read what a distribution draws: the groups and the value's range first, then
 * the summary its mark needs -- counts per (group, bin), or five numbers per
 * group. DuckDB does the summarising; only the summary crosses into JS.
 */
const useSummary = (
  source: DistributionSource | null,
  box: boolean,
  engine: ParquetQueryEngine | null,
  readout: (patch: Partial<LayerReadout>) => void,
): Summary | null => {
  // Held with what it was read for, so a new source or mark shows nothing until its own summary arrives.
  const [held, setHeld] = useState<{ source: DistributionSource; box: boolean; summary: Summary } | null>(null);
  useEffect(() => {
    if (!source) return;
    if (!engine) return readout({ loading: false, error: "the parquet engine is not ready" });
    let cancelled = false;
    readout({ loading: true, error: null, note: null });
    (async () => {
      const url = (urlOf: (id: string) => string) => urlOf(source.store.id);
      if (box) {
        const rows = await engine.readAcross([source.store], (urlOf) => boxSql(url(urlOf), source.value, source.group, source.filters));
        if (cancelled) return;
        const boxes = rows.map((r) => ({
          group: String(r.g),
          n: Number(r.n),
          lo: Number(r.lo),
          q1: Number(r.q1),
          q2: Number(r.q2),
          q3: Number(r.q3),
          hi: Number(r.hi),
        }));
        setHeld({ source, box, summary: { kind: "box", boxes } });
        readout({ loading: false, total: boxes.reduce((a, b) => a + b.n, 0), count: boxes.length, note: null });
        return;
      }
      const head = await engine.readAcross([source.store], (urlOf) => distributionExtentSql(url(urlOf), source.value, source.group, source.filters));
      if (cancelled) return;
      const groups = head.map((r) => ({ name: String(r.g), n: Number(r.n) }));
      const total = groups.reduce((a, g) => a + g.n, 0);
      if (total === 0) {
        readout({ loading: false, total: 0, count: 0, note: "no row has a value in this column" });
        return;
      }
      const lo = Math.min(...head.map((r) => Number(r.lo)));
      let hi = Math.max(...head.map((r) => Number(r.hi)));
      if (!(hi > lo)) hi = lo + 1;
      const binCount = source.bins ?? defaultBins(total);
      const read = await engine.readAcross([source.store], (urlOf) =>
        histogramSql(url(urlOf), source.value, source.group, source.filters, { lo, hi }, binCount),
      );
      if (cancelled) return;
      const bins = read.map((r) => ({ group: String(r.g), bin: Number(r.b), n: Number(r.n) }));
      setHeld({ source, box, summary: { kind: "histogram", groups, bins, domain: { lo, hi }, binCount } });
      readout({ loading: false, total, count: total, note: `${binCount} bins` });
    })().catch((error: unknown) => {
      if (!cancelled) readout({ loading: false, error: error instanceof Error ? error.message : String(error) });
    });
    return () => {
      cancelled = true;
    };
  }, [source, box, engine, readout]);
  return held && held.source === source && held.box === box ? held.summary : null;
};

const ORIGIN = { x: 0, y: 0 };

const colorOfGroup = (layer: ChartLayerState, grouped: boolean, index: number) => (grouped ? groupColor(index) : layer.solidColor);

/** CSS colour (hex or rgb()/hsl() via a canvas-free parse) → linear RGB; non-hex falls back to white-ish. */
const linearOf = (css: string): [number, number, number] => {
  if (css.startsWith("#")) return hexToLinear(css);
  const rgb = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(css);
  if (rgb) return [srgbToLinear(+rgb[1] / 255), srgbToLinear(+rgb[2] / 255), srgbToLinear(+rgb[3] / 255)];
  const hsl = /hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/.exec(css);
  if (hsl) {
    const [h, s, l] = [+hsl[1] / 360, +hsl[2] / 100, +hsl[3] / 100];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t: number) => {
      const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
      return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
    };
    return [srgbToLinear(hue(h + 1 / 3)), srgbToLinear(hue(h)), srgbToLinear(hue(h - 1 / 3))];
  }
  return [0.8, 0.8, 0.8];
};

/** Per-segment colours (6 floats each) from a group per segment. */
const segmentColors = (groupOf: readonly number[], colorOf: (g: number) => [number, number, number]) => {
  const out = new Float32Array(groupOf.length * 6);
  groupOf.forEach((g, i) => {
    const [r, gg, b] = colorOf(g);
    out.set([r, gg, b, r, gg, b], i * 6);
  });
  return out;
};

/**
 * A distribution layer: one column of a table's rows summarised, as a
 * HISTOGRAM (bars over the value, one overlaid series per group) or a BOX (one
 * box per group, side by side). Bars and bodies are filled quads at the layer's
 * opacity, outlines fat lines at full strength.
 */
export const DistributionChartLayer = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const source = layer?.values?.kind === "distribution" ? (layer.values as DistributionSource) : null;
  const box = layer?.mark === "BOX";
  const engine = useAttributeServiceOrNull()?.engine ?? null;
  const viewerApi = useViewerStoreApi();
  const planeApi = usePlaneStoreApi();
  const readout = useCallback((patch: Partial<LayerReadout>) => viewerApi.getState().patchReadout(layerId, patch), [viewerApi, layerId]);
  const summary = useSummary(source, box, engine, readout);
  const grouped = !!source?.group;

  const drawn = useMemo(() => {
    if (!layer || !summary) return null;
    const colorOf = (g: number) => linearOf(colorOfGroup(layer, grouped, g));
    if (summary.kind === "histogram") {
      const geometry = histogramGeometry(summary.groups, summary.bins, summary.domain, summary.binCount);
      const rgb = new Float32Array(geometry.barGroup.length * 3);
      geometry.barGroup.forEach((g, i) => rgb.set(colorOf(g), i * 3));
      return {
        kind: "histogram" as const,
        summary,
        geometry,
        quads: packQuads(geometry.quads, ORIGIN, rgb, [1, 1, 1]),
        lines: packSegments(geometry.outline, ORIGIN),
        lineColors: segmentColors(geometry.outlineGroup, colorOf),
        extent: { x0: summary.domain.lo, x1: summary.domain.hi, y0: 0, y1: geometry.maxHeight || 1 },
        categories: null,
      };
    }
    const geometry = boxGeometry(summary.boxes);
    const rgb = new Float32Array(summary.boxes.length * 3);
    summary.boxes.forEach((_, i) => rgb.set(colorOf(i), i * 3));
    return {
      kind: "box" as const,
      summary,
      geometry,
      quads: packQuads(geometry.quads, ORIGIN, rgb, [1, 1, 1]),
      lines: packSegments(geometry.segments, ORIGIN),
      lineColors: segmentColors(geometry.segmentGroup, colorOf),
      extent: { x0: 0, x1: Math.max(1, summary.boxes.length), y0: geometry.extent.y0, y1: geometry.extent.y1 },
      categories: summary.boxes.map((b) => b.group),
    };
  }, [layer, summary, grouped]);

  const groupNames = useMemo(
    () => (!drawn ? null : drawn.kind === "box" ? drawn.summary.boxes.map((b) => b.group) : drawn.summary.groups.map((g) => g.name)),
    [drawn],
  );
  useEffect(() => {
    const plane = planeApi.getState();
    plane.reportExtent(layerId, drawn?.extent ?? null);
    plane.setXCategories(drawn?.categories ?? null);
  }, [drawn, planeApi, layerId]);
  useEffect(() => {
    if (!layer) return;
    planeApi.getState().setLegend(
      layerId,
      grouped && groupNames
        ? { entries: groupNames.map((name, i) => ({ key: `${layerId}:${name}`, label: name, color: groupColor(i) })), scale: null }
        : { entries: [{ key: layerId, label: layer.label, color: layer.solidColor }], scale: null },
    );
  }, [planeApi, layerId, layer, grouped, groupNames]);
  useEffect(
    () => () => {
      const plane = planeApi.getState();
      plane.reportExtent(layerId, null);
      plane.setXCategories(null);
      plane.setLegend(layerId, null);
    },
    [planeApi, layerId],
  );

  const probe = useMemo<PlaneProbe | null>(() => {
    if (!drawn || !layer || !source) return null;
    if (drawn.kind === "box") {
      const boxes = drawn.summary.boxes;
      return (at) => {
        const i = Math.floor(at.x);
        const b = boxes[i];
        if (!b || at.y < b.lo - (b.hi - b.lo) * 0.1 || at.y > b.hi + (b.hi - b.lo) * 0.1) return null;
        return {
          layerId,
          title: `${source.group ? b.group : layer.label}`,
          color: colorOfGroup(layer, grouped, i),
          rows: [
            ["rows", b.n.toLocaleString()],
            ["max", formatSiValue(b.hi)],
            ["upper quartile", formatSiValue(b.q3)],
            ["median", formatSiValue(b.q2)],
            ["lower quartile", formatSiValue(b.q1)],
            ["min", formatSiValue(b.lo)],
          ],
          distancePx: 0,
          at: null,
        };
      };
    }
    const { geometry, summary: s } = drawn;
    return (at) => {
      const k = Math.floor((at.x - s.domain.lo) / geometry.width);
      if (k < 0 || k >= s.binCount) return null;
      const heights = s.groups.map((_, g) => geometry.heights[g * s.binCount + k]);
      const top = Math.max(...heights);
      if (at.y < 0 || at.y > top * 1.05 + geometry.maxHeight * 0.02) return null;
      const lo = s.domain.lo + k * geometry.width;
      const unit = source.unit ? ` ${source.unit}` : "";
      const format = (h: number) => (geometry.normalized ? `${(h * 100).toFixed(1)} %` : h.toLocaleString());
      return {
        layerId,
        title: `${source.value} ${formatSiValue(lo)} – ${formatSiValue(lo + geometry.width)}${unit}`,
        color: layer.solidColor,
        rows: s.groups.map((g, i) => [s.groups.length > 1 ? g.name : "rows", format(heights[i])] as const),
        distancePx: 0,
        at: null,
      };
    };
  }, [drawn, layer, source, layerId, grouped]);
  usePlaneProbe(layerId, probe);

  if (!layer || !drawn) return null;
  // Overlaid groups need to show through each other.
  const fill = drawn.kind === "histogram" && grouped ? Math.min(layer.opacity, 0.45) : layer.opacity * 0.7;
  return (
    <>
      <PlaneQuads positions={drawn.quads.positions} colors={drawn.quads.colors} count={drawn.quads.count} origin={ORIGIN} opacity={fill} />
      <PlaneSegments
        pairs={drawn.lines.pairs}
        count={drawn.lines.count}
        origin={ORIGIN}
        color="#ffffff"
        colors={drawn.lineColors}
        width={Math.max(1, layer.lineWidth)}
        opacity={1}
      />
    </>
  );
};
