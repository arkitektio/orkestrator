import { describe, expect, it } from "vitest";
import { envelopeWindow, seriesEnvelopeSql, seriesExtentSql, seriesWholeSql } from "./seriesSql";

const columns = { coordinateColumn: "time", valueColumn: 'a"rea' };
const url = "s3://bucket/it's.parquet";

describe("series SQL", () => {
  it("escapes the identifiers and the URL", () => {
    const sql = seriesWholeSql(url, columns);
    expect(sql).toContain('"a""rea"');
    expect(sql).toContain("'s3://bucket/it''s.parquet'");
  });

  it("reads both columns as DOUBLE, in coordinate order, without the rows missing either", () => {
    const sql = seriesWholeSql(url, columns);
    expect(sql).toMatch(/CAST\("time" AS DOUBLE\) AS __x/);
    expect(sql).toMatch(/"time" IS NOT NULL AND "a""rea" IS NOT NULL/);
    expect(sql).toMatch(/ORDER BY __x$/);
  });

  it("asks for the row count and the coordinate's extent in one read", () => {
    expect(seriesExtentSql(url, columns)).toMatch(/COUNT\(\*\) AS n.*MIN\("time"\).*MAX\("time"\)/);
  });

  it("buckets a window into per-bucket extremes", () => {
    const sql = seriesEnvelopeSql(url, columns, { lo: 0, hi: 100, bucket: 0.5 });
    expect(sql).toContain("arg_min(x, y)");
    expect(sql).toContain("arg_max(x, y)");
    expect(sql).toContain("GROUP BY FLOOR((x - 0) / 0.5)");
  });

  it("refuses a non-finite bound rather than writing it into SQL", () => {
    expect(() => seriesEnvelopeSql(url, columns, { lo: NaN, hi: 1, bucket: 1 })).toThrow();
  });
});

describe("envelopeWindow", () => {
  it("snaps the bounds outward to a power-of-two bucket grid", () => {
    const w = envelopeWindow({ lo: 3.3, hi: 103.3 }, 100)!;
    expect(w.bucket).toBe(1);
    expect(w.lo).toBe(3);
    expect(w.hi).toBe(104);
  });

  it("is the same read for a zoom inside a band over the same buckets", () => {
    const a = envelopeWindow({ lo: 3.2, hi: 103.2 }, 100);
    const b = envelopeWindow({ lo: 3.4, hi: 103.6 }, 100);
    expect(a).toEqual(b);
  });

  it("has nothing to read for an empty window or a canvas with no width", () => {
    expect(envelopeWindow({ lo: 1, hi: 1 }, 100)).toBeNull();
    expect(envelopeWindow({ lo: 0, hi: 1 }, 0)).toBeNull();
  });
});
