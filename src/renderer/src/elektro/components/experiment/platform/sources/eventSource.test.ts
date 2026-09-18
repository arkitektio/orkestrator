import { describe, expect, it } from "vitest";
import {
  buildEventSource,
  eventTimeColumn,
  eventsSql,
  packEvents,
  windowInTableUnits,
} from "./eventSource";

const TIME = { name: "t", type: "TIME", order: 0 };
const table = {
  id: "tbl",
  name: "trials",
  store: { id: "s1" },
  columns: [
    { name: "t", role: "COORDINATE", axisType: "TIME", dtype: "float64" },
    { name: "kind", role: "LABEL", axisType: null, dtype: "string" },
  ],
  coordinateSystem: { axes: [TIME] },
};
const world = { axes: [{ name: "time", type: "TIME", order: 0 }] };
// Table seconds → world ms, offset by 1000 ms.
const asAffine = { matrix: [[1000, 1000]], inputAxes: ["t"], outputAxes: ["time"], total: true };

describe("eventTimeColumn", () => {
  it("takes the layer's choice, then the TIME coordinate column", () => {
    expect(eventTimeColumn(table, "onset")).toBe("onset");
    expect(eventTimeColumn(table, null)).toBe("t");
    expect(eventTimeColumn({ ...table, columns: [] }, null)).toBeNull();
  });
});

describe("buildEventSource", () => {
  it("places the time column on the world clock", () => {
    const result = buildEventSource({ table, asAffine, world });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.timeMap).toMatchObject({ period: 1000, t0: 1000 });
  });

  it("says why it cannot", () => {
    expect(buildEventSource({ table: { ...table, columns: [] }, asAffine, world })).toEqual({
      ok: false,
      reason: "no-time-column",
    });
    expect(buildEventSource({ table, asAffine: null, world })).toEqual({ ok: false, reason: "no-placement" });
  });
});

describe("eventsSql", () => {
  const source = {
    store: { id: "s1" },
    timeColumn: "t",
    stopColumn: "t_end",
    labelColumn: "kind",
    laneColumn: null,
    timeMap: { period: 1000, t0: 0 },
  };

  it("reads overlapping intervals in a window, quoted and limited", () => {
    const sql = eventsSql("s3://b/k.parquet", source, { window: { lo: 1, hi: 2 }, limit: 10 });
    expect(sql).toContain(`FROM read_parquet('s3://b/k.parquet')`);
    expect(sql).toContain(`"t" <= 2`);
    expect(sql).toContain(`COALESCE("t_end", "t") >= 1`);
    expect(sql).toContain(`CAST("kind" AS VARCHAR) AS __label`);
    expect(sql).toContain(`CAST(COALESCE("t_end", "t") AS DOUBLE) AS __stop`);
    expect(sql).toMatch(/LIMIT 10$/);
  });

  it("maps a world window back into table units", () => {
    expect(windowInTableUnits({ period: 1000, t0: 1000 }, { start: 2000, end: 4000 })).toEqual({ lo: 1, hi: 3 });
  });
});

describe("packEvents", () => {
  it("splits instants from intervals and keeps lanes stable", () => {
    const marks = packEvents(
      {
        time: [1, 2, 3],
        stop: [null, 2.5, 3],
        label: ["a", "b", "c"],
        lane: ["right", "left", "right"],
      },
      { period: 10, t0: 100 },
      100,
    );
    expect(Array.from(marks.instants)).toEqual([10, 30]);
    expect(Array.from(marks.intervals)).toEqual([20, 25]);
    expect(marks.lanes).toEqual(["left", "right"]);
    expect(Array.from(marks.instantLanes)).toEqual([1, 1]);
    expect(Array.from(marks.intervalLanes)).toEqual([0]);
    expect(marks.labels).toEqual(["a", "b", "c"]);
    expect(Array.from(marks.intervalRows)).toEqual([1]);
  });
});
