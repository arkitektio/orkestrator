import { useEffect, useState } from "react";
import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import type { PlaneExtent } from "@/core/data/plot/plane/planeView";
import type { LayerReadout } from "@/core/data/plot/stores/viewerStore";
import { POINT_COLUMNS, POINTS_MAX, pointsExtentSql, pointsSql } from "@/mikro/lib/parquet/valuesSql";
import type { ValuesSource } from "../../platform/model/chartLayerModel";

export type PointsSource = Extract<ValuesSource, { kind: "points" }>;

/** What a points layer holds once read: parallel columns, one entry per drawn row. */
export type PointsData = {
  xs: Float64Array;
  ys: Float64Array;
  zs: Float64Array | null;
  /** The table row each point came from (what a tooltip reads the rest of the row by). */
  rows: Float64Array;
  /** Each point's row id — the table's INDEX value, in its own type — or null when the table has no INDEX. */
  ids: ArrayLike<number | bigint | string> | null;
  extent: PlaneExtent;
  zRange: { lo: number; hi: number } | null;
  total: number;
};

const asF64 = (column: ArrayLike<number> | ArrayLike<string> | undefined): Float64Array =>
  column instanceof Float64Array ? column : Float64Array.from((column ?? []) as ArrayLike<number>, Number);

/**
 * Read a points layer's rows, once per source: an extent read (count and box,
 * so the view can open on the data before the points arrive), then the
 * columns -- whole up to `POINTS_MAX` rows, a reproducible sample beyond.
 *
 * The source object is the fold's memo: a restyle keeps it, so only a change of
 * columns, filters or table reads again. Progress and failures go to the
 * layer's readout, where its card shows them.
 */
export const usePointsData = (
  source: PointsSource | null,
  engine: ParquetQueryEngine | null,
  callbacks: {
    readout: (patch: Partial<LayerReadout>) => void;
    extent: (extent: PlaneExtent | null) => void;
  },
): PointsData | null => {
  // Held with the source it was read from: a new source shows nothing until
  // its own rows arrive, without a reset in the effect.
  const [held, setHeld] = useState<{ source: PointsSource; data: PointsData } | null>(null);
  const { readout, extent } = callbacks;

  useEffect(() => {
    if (!source) return;
    if (!engine) {
      readout({ loading: false, error: "the parquet engine is not ready" });
      return;
    }
    let cancelled = false;
    const columns = { x: source.x, y: source.y, z: source.z, id: source.indexColumn };
    readout({ loading: true, error: null, note: null });
    (async () => {
      const head = await engine.readAcross([source.store], (urlOf) => pointsExtentSql(urlOf(source.store.id), columns, source.filters));
      if (cancelled) return;
      const total = Number(head[0]?.n ?? 0);
      if (total === 0) {
        extent(null);
        readout({ loading: false, total: 0, count: 0, note: "no row has a value in every column drawn" });
        return;
      }
      const box: PlaneExtent = { x0: Number(head[0].x0), x1: Number(head[0].x1), y0: Number(head[0].y0), y1: Number(head[0].y1) };
      extent(box);
      const names = [
        POINT_COLUMNS.x,
        POINT_COLUMNS.y,
        ...(source.z ? [POINT_COLUMNS.z] : []),
        POINT_COLUMNS.row,
        ...(source.indexColumn ? [POINT_COLUMNS.id] : []),
      ];
      const read = await engine.readColumnsTyped(
        [source.store],
        (urlOf) => pointsSql(urlOf(source.store.id), columns, source.filters, total),
        names,
      );
      if (cancelled || !read) return;
      const zs = source.z ? asF64(read[POINT_COLUMNS.z]) : null;
      const zRange = source.z ? { lo: Number(head[0].z0), hi: Number(head[0].z1) } : null;
      const xs = asF64(read[POINT_COLUMNS.x]);
      const ids = source.indexColumn
        ? ((read[POINT_COLUMNS.id] as ArrayLike<number | bigint | string> | undefined) ?? null)
        : null;
      setHeld({
        source,
        data: { xs, ys: asF64(read[POINT_COLUMNS.y]), zs, rows: asF64(read[POINT_COLUMNS.row]), ids, extent: box, zRange, total },
      });
      readout({
        loading: false,
        total,
        count: xs.length,
        note: total > POINTS_MAX ? `a sample of ${POINTS_MAX.toLocaleString()} of ${total.toLocaleString()} rows` : null,
      });
    })().catch((error: unknown) => {
      if (!cancelled) readout({ loading: false, error: error instanceof Error ? error.message : String(error) });
    });
    return () => {
      cancelled = true;
    };
    // `readout`/`extent` are stable per layer (the caller memoizes them).
  }, [source, engine, readout, extent]);

  return held && held.source === source ? held.data : null;
};
