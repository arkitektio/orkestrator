import { useEffect, useState } from "react";
import { useElektroParquetEngine } from "@/elektro/components/store/parquetEngine";
import {
  EVENT_COLUMNS,
  eventCountSql,
  eventsSql,
  packEvents,
  windowInTableUnits,
  type EventMarks,
  type EventSource,
} from "../../platform/sources/eventSource";
import { useExperimentStoreApi } from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStoreApi, type LayerReadout } from "../../platform/stores/viewerStore";

/**
 * Reading an events layer's table through the elektro parquet engine.
 *
 * Two strategies, chosen by the table's size (one `COUNT(*)`, answered from the
 * parquet footer):
 *
 *  - **Whole table** when it is small — the common case, trials and stimulus
 *    onsets number in the thousands. One read, cached for the layer's life; a
 *    pan or zoom costs nothing.
 *  - **Windowed** when it is not: each COMMITTED window (never the live one — a
 *    gesture reads nothing) is read with a predicate on the time column, mapped
 *    back into table units through the inverse time map, and a row limit. Row
 *    group statistics keep that cheap. A window that hits the limit says so.
 *
 * Extra SELECT expressions (`extras`) ride along on the same read — the active
 * pickers' columns (or the foreign keys their joins start from) — so colouring
 * and filtering cost no second query of the event table.
 */

export const WHOLE_TABLE_MAX = 50_000;
export const WINDOW_MAX = 20_000;

export type EventMarksResult = {
  marks: EventMarks | null;
  /** The extra columns, by alias, in the same row order as the marks' rows. */
  extra: Record<string, ArrayLike<number> | ArrayLike<string>>;
};

const EMPTY: EventMarksResult = { marks: null, extra: {} };

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

const sourceKey = (source: EventSource | null) =>
  source
    ? JSON.stringify([
        source.store.id,
        source.timeColumn,
        source.stopColumn,
        source.labelColumn,
        source.laneColumn,
        source.timeMap.period,
        source.timeMap.t0,
      ])
    : null;

export const useEventMarks = (
  layerId: string,
  source: EventSource | null,
  extras: readonly { alias: string; sql: string }[] = [],
): EventMarksResult => {
  const engine = useElektroParquetEngine();
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();
  const [result, setResult] = useState<EventMarksResult>(EMPTY);
  const key = sourceKey(source);
  const extraKey = extras.map((e) => `${e.alias}=${e.sql}`).join(";");

  useEffect(() => {
    if (!source || !engine) {
      setResult(EMPTY);
      return;
    }
    let disposed = false;
    let request = 0;
    let unsubscribe: (() => void) | null = null;
    const timeOrigin = experimentApi.getState().timeOrigin;
    const readout = (patch: Partial<LayerReadout>) => viewerApi.getState().patchReadout(layerId, patch);

    const aliases = [
      EVENT_COLUMNS.time,
      source.stopColumn ? EVENT_COLUMNS.stop : null,
      source.labelColumn ? EVENT_COLUMNS.label : null,
      source.laneColumn ? EVENT_COLUMNS.lane : null,
      ...extras.map((e) => e.alias),
    ].filter((a): a is string => a != null);
    const extraSelect = extras.map((e) => `${e.sql} AS ${e.alias}`);

    const read = async (window: { lo: number; hi: number } | null, limit: number | null) => {
      const columns = await engine.readColumnsTyped(
        [source.store],
        (urlOf) =>
          eventsSql(urlOf(source.store.id), source, { window, limit, extra: extraSelect }),
        aliases,
      );
      if (!columns) throw new Error("the parquet engine could not read this table columnwise");
      return columns;
    };

    const land = (columns: Record<string, ArrayLike<number> | ArrayLike<string>>) => {
      const marks = packEvents(
        {
          time: columns[EVENT_COLUMNS.time] as ArrayLike<number>,
          stop: (columns[EVENT_COLUMNS.stop] as ArrayLike<number>) ?? null,
          label: (columns[EVENT_COLUMNS.label] as ArrayLike<string>) ?? null,
          lane: (columns[EVENT_COLUMNS.lane] as ArrayLike<string>) ?? null,
        },
        source.timeMap,
        timeOrigin,
      );
      setResult({ marks, extra: Object.fromEntries(extras.map((e) => [e.alias, columns[e.alias]])) });
      return marks;
    };

    const fail = (error: unknown) => {
      if (disposed) return;
      readout({ loading: false, error: error instanceof Error ? error.message : String(error) });
    };

    readout({ loading: true, error: null });
    void (async () => {
      try {
        const rows = await engine.readAcross([source.store], (urlOf) => eventCountSql(urlOf(source.store.id)));
        if (disposed) return;
        const total = Number(rows[0]?.n ?? 0);

        if (total <= WHOLE_TABLE_MAX) {
          const marks = land(await read(null, null));
          if (disposed) return;
          // The table's own extent joins the experiment's: an events-only
          // experiment would otherwise have no timeline to open on.
          experimentApi.getState().reportSpan(layerId, extentOf(marks, timeOrigin));
          readout({
            loading: false,
            count: marks.count,
            total,
            truncated: false,
            note: marks.lanes.length > 1 ? `${marks.lanes.length} lanes` : null,
          });
          return;
        }

        const readWindow = async () => {
          const mine = ++request;
          const committed = rangeApi.getState().committedRange;
          readout({ loading: true, total });
          try {
            const columns = await read(windowInTableUnits(source.timeMap, committed), WINDOW_MAX + 1);
            if (disposed || mine !== request) return;
            const marks = land(columns);
            readout({ loading: false, count: marks.count, total, truncated: marks.count > WINDOW_MAX, error: null });
          } catch (error) {
            if (mine === request) fail(error);
          }
        };
        await readWindow();
        unsubscribe = rangeApi.subscribe((state, previous) => {
          if (state.committedRange !== previous.committedRange) void readWindow();
        });
      } catch (error) {
        fail(error);
      }
    })();

    return () => {
      disposed = true;
      unsubscribe?.();
      experimentApi.getState().reportSpan(layerId, null);
    };
    // `key` and `extraKey` stand for `source` and `extras`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, extraKey, engine, layerId, rangeApi, viewerApi, experimentApi]);

  return result;
};
