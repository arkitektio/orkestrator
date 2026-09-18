import { Color } from "three";
import type { StoreApi } from "zustand/vanilla";
import type { ParquetQueryEngine } from "@/lib/parquet/parquetEngine";
import { sampleColorMapRgb, type ColorMap } from "@/lib/scene/gpu/colormaps";
import type { LayerDriver } from "../../platform/drivers/layerDriver";
import type { LayerState } from "../../platform/model/layerModel";
import { activeEntries, type PickerEntry } from "../../platform/pickers/pickerModel";
import type { PickerSlice } from "../../platform/pickers/pickerSlice";
import type { PickerValuesService } from "../../platform/pickers/pickerValuesService";
import {
  EVENT_COLUMNS,
  eventCountSql,
  eventsSql,
  packEvents,
  windowInTableUnits,
  type EventMarks,
  type EventSource,
} from "../../platform/sources/eventSource";
import type { ExperimentStoreState } from "../../platform/stores/experimentStore";
import { rawLayerOf } from "../../platform/stores/layerFragments";
import type { RangeState } from "../../platform/stores/rangeStore";
import type { LayerReadout, ViewerState } from "../../platform/stores/viewerStore";
import {
  eventDrawFor,
  filterMarks,
  markColors,
  markLabelsFor,
  pickerValueAt,
  rowFilter,
} from "./eventDraw";
import type { EventsSlice } from "./store/eventsSlice";

/** Tables up to this many rows are read whole, once; bigger ones per window. */
export const WHOLE_TABLE_MAX = 50_000;
/** Rows per windowed read before the card says the window was cut short. */
export const WINDOW_MAX = 20_000;

export type EventsDriverEnv = {
  experimentApi: StoreApi<ExperimentStoreState>;
  rangeApi: StoreApi<RangeState>;
  viewerApi: StoreApi<ViewerState & EventsSlice & PickerSlice>;
  engine: () => ParquetQueryEngine | null;
  pickers: () => PickerValuesService | null;
};

type Active = ReturnType<typeof activeEntries>;

const readKeyOf = (source: EventSource | null, extras: readonly { alias: string; sql: string }[]) =>
  source
    ? JSON.stringify([
        source.store.id,
        source.timeColumn,
        source.stopColumn,
        source.labelColumn,
        source.laneColumn,
        source.timeMap.period,
        source.timeMap.t0,
        extras.map((e) => `${e.alias}=${e.sql}`),
      ])
    : null;

/** World extent of a set of marks (they are stored relative to `timeOrigin`). */
const extentOf = (marks: EventMarks, timeOrigin: number): { start: number; end: number } | null => {
  let start = Infinity;
  let end = -Infinity;
  for (const x of marks.instants) {
    if (x < start) start = x;
    if (x > end) end = x;
  }
  for (const x of marks.intervals) {
    if (x < start) start = x;
    if (x > end) end = x;
  }
  if (!(end >= start)) return null;
  // An instant alone has no width; give the window something to open on.
  if (end === start) end = start + 1;
  return { start: start + timeOrigin, end: end + timeOrigin };
};

/**
 * One events layer's pipeline: read the table, apply the pickers, and publish
 * what to draw — the counterpart of the trace driver for parquet event tables.
 *
 *  - **Reading.** One `COUNT(*)` (answered from the footer) picks the strategy:
 *    a small table is read WHOLE once, and pan/zoom costs nothing; a big one is
 *    read per COMMITTED window with a row limit, the window mapped back into
 *    table units. Stale windowed reads are dropped by a request counter.
 *  - **Pickers.** Each active entry's column (or the foreign key its join
 *    starts from) rides along on the same read; joined values come from the
 *    shared `PickerValuesService`. Filters drop rows (AND), the colour-by
 *    colours marks; problems go to the picker slice for the card.
 *  - **Drawing.** On every read, picker change, commit or width change the
 *    driver recomputes the draw (`eventDraw.ts`) and publishes it, its readout
 *    (the FILTERED count), its labels when there is room, and — for a whole
 *    table — its extent, so an events-only experiment has a timeline.
 */
export class EventTableDriver implements LayerDriver {
  private layer: LayerState;
  private active: Active = { colorBy: null, filters: [] };
  private extras: { alias: string; sql: string }[] = [];
  private readKey: string | null = null;
  private pickerKey = "";
  private windowed = false;
  private total: number | null = null;
  private marks: EventMarks | null = null;
  private extra: Record<string, ArrayLike<unknown>> = {};
  private maps: Record<string, Map<unknown, unknown>> = {};
  private request = 0;
  private disposed = false;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(
    layer: LayerState,
    private readonly env: EventsDriverEnv,
  ) {
    this.layer = layer;
    this.unsubscribes.push(
      env.rangeApi.subscribe((state, previous) => {
        if (state.committedRange === previous.committedRange) return;
        if (this.windowed) void this.readWindow();
        this.derive();
      }),
      env.viewerApi.subscribe((state, previous) => {
        if (state.viewportPx.width !== previous.viewportPx.width) this.derive();
      }),
    );
    this.update(layer, true);
  }

  update(layer: LayerState, first = false): void {
    const colorChanged = !first && layer.color !== this.layer.color;
    this.layer = layer;
    const raw = rawLayerOf(this.env.experimentApi.getState().rawLayers, layer.id, "EventsLayer");
    this.active = raw ? activeEntries(raw) : { colorBy: null, filters: [] };
    this.extras = this.entries().map(({ key, entry }) => ({
      alias: `__p_${key}`,
      sql: `"${((entry.joinPath ?? [])[0]?.column ?? entry.column).replaceAll('"', '""')}"`,
    }));

    const readKey = readKeyOf(layer.events, this.extras);
    if (readKey !== this.readKey) {
      this.readKey = readKey;
      void this.restartRead();
    }
    const pickerKey = JSON.stringify(this.entries().map((e) => [e.key, e.entry]));
    if (pickerKey !== this.pickerKey) {
      this.pickerKey = pickerKey;
      void this.loadPickers();
    } else if (colorChanged) {
      this.derive();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.request++;
    for (const unsubscribe of this.unsubscribes) unsubscribe();
    const viewer = this.env.viewerApi.getState();
    viewer.setEventDraw(this.layer.id, null);
    viewer.setPickerProblems(this.layer.id, null);
    this.env.experimentApi.getState().reportSpan(this.layer.id, null);
  }

  // --- reading ---------------------------------------------------------------

  private entries(): { key: string; entry: PickerEntry }[] {
    return [...(this.active.colorBy ? [this.active.colorBy] : []), ...this.active.filters];
  }

  private readout(patch: Partial<LayerReadout>): void {
    if (!this.disposed) this.env.viewerApi.getState().patchReadout(this.layer.id, patch);
  }

  private async read(source: EventSource, window: { lo: number; hi: number } | null, limit: number | null) {
    const engine = this.env.engine();
    if (!engine) throw new Error("the parquet engine is not ready");
    const aliases = [
      EVENT_COLUMNS.time,
      source.stopColumn ? EVENT_COLUMNS.stop : null,
      source.labelColumn ? EVENT_COLUMNS.label : null,
      source.laneColumn ? EVENT_COLUMNS.lane : null,
      ...this.extras.map((e) => e.alias),
    ].filter((a): a is string => a != null);
    const extraSelect = this.extras.map((e) => `${e.sql} AS ${e.alias}`);
    const columns = await engine.readColumnsTyped(
      [source.store],
      (urlOf) => eventsSql(urlOf(source.store.id), source, { window, limit, extra: extraSelect }),
      aliases,
    );
    if (!columns) throw new Error("the parquet engine could not read this table columnwise");
    return columns;
  }

  private land(source: EventSource, columns: Record<string, ArrayLike<number> | ArrayLike<string>>): EventMarks {
    const marks = packEvents(
      {
        time: columns[EVENT_COLUMNS.time] as ArrayLike<number>,
        stop: (columns[EVENT_COLUMNS.stop] as ArrayLike<number>) ?? null,
        label: (columns[EVENT_COLUMNS.label] as ArrayLike<string>) ?? null,
        lane: (columns[EVENT_COLUMNS.lane] as ArrayLike<string>) ?? null,
      },
      source.timeMap,
      this.env.experimentApi.getState().timeOrigin,
    );
    this.marks = marks;
    this.extra = Object.fromEntries(this.extras.map((e) => [e.alias, columns[e.alias]]));
    this.derive();
    return marks;
  }

  private async restartRead(): Promise<void> {
    const mine = ++this.request;
    const source = this.layer.events;
    this.marks = null;
    this.windowed = false;
    this.env.viewerApi.getState().setEventDraw(this.layer.id, null);
    if (!source) return;
    const engine = this.env.engine();
    if (!engine) {
      this.readout({ loading: false, error: "the parquet engine is not ready" });
      return;
    }
    this.readout({ loading: true, error: null });
    try {
      const rows = await engine.readAcross([source.store], (urlOf) => eventCountSql(urlOf(source.store.id)));
      if (this.disposed || mine !== this.request) return;
      this.total = Number(rows[0]?.n ?? 0);
      if (this.total <= WHOLE_TABLE_MAX) {
        const columns = await this.read(source, null, null);
        if (this.disposed || mine !== this.request) return;
        const marks = this.land(source, columns);
        // The table's own extent joins the experiment's: an events-only
        // experiment would otherwise have no timeline to open on.
        const timeOrigin = this.env.experimentApi.getState().timeOrigin;
        this.env.experimentApi.getState().reportSpan(this.layer.id, extentOf(marks, timeOrigin));
        this.readout({
          loading: false,
          total: this.total,
          truncated: false,
          note: marks.lanes.length > 1 ? `${marks.lanes.length} lanes` : null,
        });
        return;
      }
      this.windowed = true;
      await this.readWindow();
    } catch (error) {
      if (mine === this.request) this.readout({ loading: false, error: errorText(error) });
    }
  }

  private async readWindow(): Promise<void> {
    const source = this.layer.events;
    if (!source) return;
    const mine = ++this.request;
    const committed = this.env.rangeApi.getState().committedRange;
    this.readout({ loading: true, total: this.total });
    try {
      const columns = await this.read(source, windowInTableUnits(source.timeMap, committed), WINDOW_MAX + 1);
      if (this.disposed || mine !== this.request) return;
      const marks = this.land(source, columns);
      this.readout({ loading: false, truncated: marks.count > WINDOW_MAX, error: null });
    } catch (error) {
      if (mine === this.request) this.readout({ loading: false, error: errorText(error) });
    }
  }

  // --- pickers and drawing -----------------------------------------------------

  private async loadPickers(): Promise<void> {
    const entries = this.entries();
    const service = this.env.pickers();
    const raw = rawLayerOf(this.env.experimentApi.getState().rawLayers, this.layer.id, "EventsLayer");
    const key = this.pickerKey;
    if (!service || !raw || entries.length === 0) {
      this.maps = {};
      this.env.viewerApi.getState().setPickerProblems(this.layer.id, null);
      this.derive();
      return;
    }
    const table = raw.tableDataset;
    const values = await service.values(table, entries, 1);
    if (this.disposed || key !== this.pickerKey) return;
    this.maps = values.maps;
    this.env.viewerApi.getState().setPickerProblems(this.layer.id, values.problems);
    this.derive();
  }

  private derive(): void {
    const marks = this.marks;
    if (this.disposed || !marks) return;
    const valueFor = (key: string, entry: PickerEntry) => (row: number) =>
      pickerValueAt(entry, this.extra[`__p_${key}`], this.maps[key], row);

    const filtered = filterMarks(
      marks,
      rowFilter(this.active.filters.map(({ key, entry }) => ({ entry, valueAt: valueFor(key, entry) }))),
    );
    const base = new Color().setStyle(this.layer.color);
    const colors = this.active.colorBy
      ? markColors(
          filtered,
          this.active.colorBy.entry,
          valueFor(this.active.colorBy.key, this.active.colorBy.entry),
          [base.r, base.g, base.b],
          (colormap, t) => sampleColorMapRgb(colormap as ColorMap | null, t),
        )
      : null;

    const timeOrigin = this.env.experimentApi.getState().timeOrigin;
    const committed = this.env.rangeApi.getState().committedRange;
    const window = { start: committed.start - timeOrigin, end: committed.end - timeOrigin };
    const viewer = this.env.viewerApi.getState();
    const draw = eventDrawFor(filtered, colors, window, viewer.viewportPx.width);
    viewer.setEventDraw(this.layer.id, draw);
    this.readout({ count: draw.count, density: draw.density });
    viewer.setMarkLabels(
      this.layer.id,
      this.layer.events?.labelColumn && !draw.density ? markLabelsFor(filtered, window, timeOrigin) : null,
    );
  }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
