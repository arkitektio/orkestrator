import { describe, expect, it } from "vitest";
import { filterPredicate, whereClause } from "./filterSql";
import { boxSql, cellsSql, defaultBins, distributionExtentSql, histogramSql, pointsExtentSql, pointsSql, POINTS_MAX } from "./valuesSql";

const URL = "s3://b/k.parquet";

describe("row filters", () => {
  it("bounds a numeric column inclusively, either side open", () => {
    expect(filterPredicate({ column: "area", min: 50 })).toBe('TRY_CAST("area" AS DOUBLE) >= 50');
    expect(filterPredicate({ column: "area", min: 1, max: 2 })).toBe('(TRY_CAST("area" AS DOUBLE) >= 1 AND TRY_CAST("area" AS DOUBLE) <= 2)');
  });
  it("keeps the listed values, or all but them", () => {
    expect(filterPredicate({ column: "condition", values: ["ctrl"] })).toBe(`CAST("condition" AS VARCHAR) IN ('ctrl')`);
    expect(filterPredicate({ column: "condition", values: ["ctrl"], exclude: true })).toBe(
      `NOT COALESCE(CAST("condition" AS VARCHAR) IN ('ctrl'), FALSE)`,
    );
  });
  it("leaves out a rule that keeps everything, or reads another table", () => {
    expect(filterPredicate({ column: "area" })).toBeNull();
    expect(filterPredicate({ column: "track", min: 1, joinPath: [{ table: "2", column: "id" }] })).toBeNull();
    expect(whereClause([{ column: "area" }])).toBe("TRUE");
  });
  it("escapes identifiers and literals", () => {
    expect(filterPredicate({ column: 'we"ird', values: ["it's"] })).toBe(`CAST("we""ird" AS VARCHAR) IN ('it''s')`);
  });
});

describe("points", () => {
  it("reads the box and the count of drawable rows", () => {
    const sql = pointsExtentSql(URL, { x: "area", y: "volume" }, [{ column: "area", min: 50 }]);
    expect(sql).toContain('MIN(TRY_CAST("area" AS DOUBLE)) AS x0');
    expect(sql).toContain('TRY_CAST("volume" AS DOUBLE) IS NOT NULL');
    expect(sql).toContain('TRY_CAST("area" AS DOUBLE) >= 50');
  });
  it("samples above the cap, and carries the row number", () => {
    expect(pointsSql(URL, { x: "a", y: "b" }, [], 10)).not.toContain("SAMPLE");
    expect(pointsSql(URL, { x: "a", y: "b", z: "c" }, [], POINTS_MAX + 1)).toContain(`USING SAMPLE reservoir(${POINTS_MAX} ROWS)`);
    expect(pointsSql(URL, { x: "a", y: "b" }, [], 10)).toContain("file_row_number");
  });
});

describe("distributions", () => {
  it("groups by a column, or reads one group", () => {
    expect(distributionExtentSql(URL, "area", "condition", [])).toContain(`COALESCE(CAST("condition" AS VARCHAR), '∅') AS g`);
    expect(distributionExtentSql(URL, "area", null, [])).toContain(`'all' AS g`);
  });
  it("bins over one shared domain, the top edge folded into the last bin", () => {
    const sql = histogramSql(URL, "area", null, [], { lo: 0, hi: 10 }, 5);
    expect(sql).toContain("LEAST(4, GREATEST(0, CAST(FLOOR((TRY_CAST(\"area\" AS DOUBLE) - 0) / 2) AS BIGINT)))");
  });
  it("reads five numbers per group for a box", () => {
    expect(boxSql(URL, "area", "c", [])).toContain("quantile_cont(TRY_CAST(\"area\" AS DOUBLE), 0.5) AS q2");
  });
  it("picks a sensible number of bins", () => {
    expect(defaultBins(4)).toBe(10);
    expect(defaultBins(1_000_000)).toBe(80);
  });
});

describe("grid cells", () => {
  it("reads row, column and value members", () => {
    const sql = cellsSql(URL, { row: "cell", column: "c", value: "mean" }, [], 100);
    expect(sql).toContain('TRY_CAST("cell" AS DOUBLE) AS r');
    expect(sql).toContain("LIMIT 100");
  });
});
