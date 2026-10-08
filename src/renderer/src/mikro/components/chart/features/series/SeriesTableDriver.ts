import type { StoreApi } from "zustand/vanilla";
import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import type { LayerDriver } from "@/core/data/plot/drivers/layerDriver";
import { PACK_MARGIN } from "@/core/data/plot/lines/TileLineDriver";
import { packPoints } from "@/core/data/plot/lines/pointPacking";
import { stepped } from "@/core/data/plot/lines/steps";
import type { TraceSlice } from "@/core/data/plot/lines/traceSlice";
import type { Span } from "@/core/data/plot/stores/plotStore";
import type { RangeState } from "@/core/data/plot/stores/rangeStore";
import type { LayerReadout, ViewerState } from "@/core/data/plot/stores/viewerStore";
import type { ChartLayerState, SeriesSource } from "../../platform/model/chartLayerModel";
import {
  ENVELOPE_COLUMNS,
  SERIES_COLUMNS,
  envelopeWindow,
  seriesEnvelopeSql,
  seriesExtentSql,
  seriesWholeSql,
} from "./seriesSql";

/**
 * Tables up to this many rows are read whole, once (two float64 columns: 32 MB
 * at the cap). Generous on purpose: a windowed read on a table NOT written in
 * coordinate order scans the whole column on every settled gesture, and holding
 * the rows makes pan and zoom free instead.
 */
export const WHOLE_TABLE_MAX = 2_000_000;

export type SeriesDriverEnv = {
  /** The plot store's origin, and where a layer's extent is reported. */
  plotApi: StoreApi<{ timeOrigin: number; reportSpan: (layerId: string, span: Span | null) => void }>;
  rangeApi: StoreApi<RangeState>;
  viewerApi: StoreApi<ViewerState & TraceSlice>;
  engine: () => ParquetQueryEngine | null;
};

/** Parallel, ascending along the chart's axis. */
type Points = { xs: Float64Array; ys: Float64Array };

/** Coordinate-column values → positions along the chart's axis, ascending. */
const placed = (x: ArrayLike<number>, y: ArrayLike<number>, source: SeriesSource): Points => {
  const { t0, period } = source.axisMap;
  const n = x.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  // A negative step runs the chart's axis backwards against the column: the
  // rows arrive in column order, so they are written in reverse.
  const reverse = period < 0;
  for (let i = 0; i < n; i++) {
    const at = reverse ? n - 1 - i : i;
    xs[at] = t0 + period * x[i];
    ys[at] = y[i];
  }
  return { xs, ys };
};

/** Envelope rows → points, each bucket's two extremes in the order they occur. */
const envelopePoints = (
  columns: Record<string, ArrayLike<number> | ArrayLike<string>>,
): { x: Float64Array; y: Float64Array } => {
  const minX = columns[ENVELOPE_COLUMNS.minX] as ArrayLike<number>;
  const minY = columns[ENVELOPE_COLUMNS.minY] as ArrayLike<number>;
  const maxX = columns[ENVELOPE_COLUMNS.maxX] as ArrayLike<number>;
  const maxY = columns[ENVELOPE_COLUMNS.maxY] as ArrayLike<number>;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < minX.length; i++) {
    const minFirst = minX[i] <= maxX[i];
    x.push(minFirst ? minX[i] : maxX[i]);
    y.push(minFirst ? minY[i] : maxY[i]);
    if (minX[i] !== maxX[i]) {
      x.push(minFirst ? maxX[i] : minX[i]);
      y.push(minFirst ? maxY[i] : minY[i]);
    }
  }
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
};

/**
 * One series layer's pipeline: read the table, place its rows along the
 * chart's axis, and publish a line — the trace driver's counterpart for a
 * parquet table.
 *
 *  - **Reading.** One extent read (row count, first and last coordinate) picks
 *    the strategy and reports the layer's extent, so a series-only chart has a
 *    range to open on. A table within `WHOLE_TABLE_MAX` is read WHOLE once, and
 *    pan and zoom then cost nothing. A larger one is read per COMMITTED window
 *    as a per-bucket min/max envelope, the buckets quantised so a zoom inside a
 *    band rereads nothing. Stale reads are dropped by a request counter.
 *  - **Drawing.** On every read, commit or width change it packs what it holds
 *    to the pixel grid and publishes into the SAME slice a trace does
 *    (`traceSlice.packed`), so one component draws both. The first data seeds
 *    the layer's scale, which is then held (fixed gain).
 *
 * Output goes to the store, never to React state.
 */
export class SeriesTableDriver implements LayerDriver<ChartLayerState> {
  private layer: ChartLayerState;
  private source: SeriesSource | null = null;
  private whole: Points | null = null;
  private windowed = false;
  private envelope: { key: string; points: Points } | null = null;
  private total: number | null = null;
  private request = 0;
  private disposed = false;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(
    layer: ChartLayerState,
    private readonly env: SeriesDriverEnv,
  ) {
    this.layer = layer;
    this.unsubscribes.push(
      env.rangeApi.subscribe((state, previous) => {
        if (state.committedRange === previous.committedRange) return;
        if (this.windowed) void this.readEnvelope();
        this.publish();
      }),
      env.viewerApi.subscribe((state, previous) => {
        if (state.viewportPx.width === previous.viewportPx.width) return;
        if (this.windowed) void this.readEnvelope();
        this.publish();
      }),
    );
    this.setSource(layer.series);
  }

  update(layer: ChartLayerState): void {
    const previous = this.layer;
    this.layer = layer;
    // Content edits keep the source object (the fold's memo); only a structural
    // change — a re-registration, another column — brings a new one.
    if (layer.series !== this.source) this.setSource(layer.series);
    // The join is content: repack what is held, read nothing.
    else if (layer.lineShape !== previous.lineShape) this.publish();
  }

  dispose(): void {
    this.disposed = true;
    this.request++;
    for (const unsubscribe of this.unsubscribes) unsubscribe();
    this.env.viewerApi.getState().setPacked(this.layer.id, null);
    this.env.plotApi.getState().reportSpan(this.layer.id, null);
  }

  // --- reading ---------------------------------------------------------------

  private readout(patch: Partial<LayerReadout>): void {
    if (!this.disposed) this.env.viewerApi.getState().patchReadout(this.layer.id, patch);
  }

  private fail(error: unknown): void {
    this.readout({ loading: false, error: error instanceof Error ? error.message : String(error) });
  }

  /** A new source invalidates everything held: those rows were placed by the old map. */
  private setSource(source: SeriesSource | null): void {
    this.source = source;
    this.whole = null;
    this.envelope = null;
    this.windowed = false;
    this.total = null;
    this.env.viewerApi.getState().setPacked(this.layer.id, null);
    void this.restart();
  }

  private async restart(): Promise<void> {
    const mine = ++this.request;
    const source = this.source;
    if (!source) return;
    const engine = this.env.engine();
    if (!engine) return this.readout({ loading: false, error: "the parquet engine is not ready" });

    this.readout({ loading: true, error: null });
    try {
      const rows = await engine.readAcross([source.store], (urlOf) =>
        seriesExtentSql(urlOf(source.store.id), source),
      );
      if (this.disposed || mine !== this.request) return;
      const total = Number(rows[0]?.n ?? 0);
      this.total = total;
      const lo = Number(rows[0]?.lo);
      const hi = Number(rows[0]?.hi);
      if (total > 0 && Number.isFinite(lo) && Number.isFinite(hi)) {
        const a = source.axisMap.t0 + source.axisMap.period * lo;
        const b = source.axisMap.t0 + source.axisMap.period * hi;
        // A single row has no width; give the window something to open on.
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        this.env.plotApi
          .getState()
          .reportSpan(this.layer.id, { start, end: end > start ? end : start + 1 });
      }
      if (total === 0) {
        return this.readout({ loading: false, total: 0, count: 0, note: "the table has no rows to draw" });
      }

      if (total <= WHOLE_TABLE_MAX) {
        const columns = await engine.readColumnsTyped(
          [source.store],
          (urlOf) => seriesWholeSql(urlOf(source.store.id), source),
          [SERIES_COLUMNS.x, SERIES_COLUMNS.y],
        );
        if (this.disposed || mine !== this.request) return;
        if (!columns) throw new Error("the parquet engine could not read this table columnwise");
        this.whole = placed(
          columns[SERIES_COLUMNS.x] as ArrayLike<number>,
          columns[SERIES_COLUMNS.y] as ArrayLike<number>,
          source,
        );
        this.readout({ loading: false, total, count: total, density: false });
        this.publish();
        return;
      }

      this.windowed = true;
      await this.readEnvelope();
    } catch (error) {
      if (this.disposed || mine !== this.request) return;
      this.fail(error);
    }
  }

  /** The committed window (plus the pack margin) in coordinate-column units. */
  private columnWindow(): { lo: number; hi: number; bucket: number } | null {
    const source = this.source;
    if (!source) return null;
    const committed = this.env.rangeApi.getState().committedRange;
    const width = committed.end - committed.start;
    const { t0, period } = source.axisMap;
    const a = (committed.start - width * PACK_MARGIN - t0) / period;
    const b = (committed.end + width * PACK_MARGIN - t0) / period;
    const widthPx = this.env.viewerApi.getState().viewportPx.width * (1 + 2 * PACK_MARGIN);
    return envelopeWindow({ lo: Math.min(a, b), hi: Math.max(a, b) }, widthPx);
  }

  private async readEnvelope(): Promise<void> {
    const source = this.source;
    const window = this.columnWindow();
    if (!source || !window) return;
    const key = `${window.lo}:${window.hi}:${window.bucket}`;
    // The same buckets: nothing new to read.
    if (this.envelope?.key === key) return;
    const engine = this.env.engine();
    if (!engine) return;
    const mine = ++this.request;
    this.readout({ loading: true, error: null });
    try {
      const names = Object.values(ENVELOPE_COLUMNS);
      const columns = await engine.readColumnsTyped(
        [source.store],
        (urlOf) => seriesEnvelopeSql(urlOf(source.store.id), source, window),
        names,
      );
      if (this.disposed || mine !== this.request) return;
      if (!columns) throw new Error("the parquet engine could not read this table columnwise");
      const { x, y } = envelopePoints(columns);
      this.envelope = { key, points: placed(x, y, source) };
      this.readout({ loading: false, total: this.total, count: null, density: true });
      this.publish();
    } catch (error) {
      if (this.disposed || mine !== this.request) return;
      this.fail(error);
    }
  }

  // --- drawing ---------------------------------------------------------------

  private publish(): void {
    const points = this.whole ?? this.envelope?.points ?? null;
    if (this.disposed || !points) return;
    const viewer = this.env.viewerApi.getState();
    const committed = this.env.rangeApi.getState().committedRange;
    // Packed a margin beyond the committed window, as a trace is: the camera
    // follows the live window during a gesture.
    const width = committed.end - committed.start;
    const window = {
      start: committed.start - width * PACK_MARGIN,
      end: committed.end + width * PACK_MARGIN,
    };
    const line = packPoints(points.xs, points.ys, this.env.plotApi.getState().timeOrigin, {
      window,
      widthPx: viewer.viewportPx.width * (1 + 2 * PACK_MARGIN),
    });
    const packed = this.layer.lineShape === "steps" ? stepped(line) : line;

    // Fixed gain: the first data sets the scale, and it is then held.
    if (packed.valueMin != null && packed.valueMax != null) {
      viewer.seedClim(this.layer.id, { lo: packed.valueMin, hi: packed.valueMax });
    }
    // The range currently drawn, which is what an explicit autoscale rescales to.
    // A table has no pyramid: the level fields say "all of it, at full detail".
    viewer.setStats(this.layer.id, {
      levelIndex: 0,
      level: 0,
      levelCount: 1,
      centerLevelIndex: 0,
      targetLevelIndex: 0,
      centerFactor: 1,
      tilesPlanned: 0,
      tilesResident: 0,
      coverage: 1,
      residentBytes: 0,
      valueMin: packed.valueMin,
      valueMax: packed.valueMax,
      loading: false,
      error: null,
    });
    viewer.publishProbe(this.layer.id, [packed]);
    viewer.setPacked(this.layer.id, [packed]);
  }
}
