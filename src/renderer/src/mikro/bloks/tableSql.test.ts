import { describe, expect, it } from "vitest";

import { columnStatSql, conditionSql, countSql, rowsSql } from "./tableSql";

const URL = "s3://bucket/key.parquet";

describe("table blok SQL", () => {
  it("escapes every name and value a blok hands it", () => {
    expect(conditionSql({ column: 'a"b', value: "x' OR 1=1 --" })).toBe(`"a""b" = 'x'' OR 1=1 --'`);
    expect(conditionSql({ column: "n", op: "gte", value: 3 })).toBe(`"n" >= 3`);
    expect(conditionSql({ column: "n", op: "in", value: [1, "b"] })).toBe(`"n" IN (1, 'b')`);
    expect(conditionSql({ column: "n", op: "in", value: [] })).toBe("FALSE");
    expect(conditionSql({ column: "n", op: "isNull" })).toBe(`"n" IS NULL`);
    expect(() => conditionSql({ column: "n", op: "drop" as never })).toThrow(/Unknown filter/);
  });

  it("reads a page, filtered and sorted, with the limit capped", () => {
    expect(
      rowsSql(URL, {
        columns: ["id", "area"],
        where: [{ column: "area", op: "gt", value: 10 }, { column: "label", op: "contains", value: "Cell" }],
        orderBy: "area",
        descending: true,
        limit: 5000,
        offset: 20,
      }),
    ).toBe(
      `SELECT "id", "area" FROM read_parquet('s3://bucket/key.parquet') WHERE "area" > 10 AND contains(lower(CAST("label" AS VARCHAR)), lower('Cell')) ORDER BY "area" DESC NULLS LAST LIMIT 1000 OFFSET 20`,
    );
    expect(rowsSql(URL, { limit: 10 })).toBe(`SELECT * FROM read_parquet('s3://bucket/key.parquet') LIMIT 10 OFFSET 0`);
  });

  it("counts under the same conditions", () => {
    expect(countSql(URL, [{ column: "k", value: true }])).toBe(
      `SELECT count(*) AS n FROM read_parquet('s3://bucket/key.parquet') WHERE "k" = TRUE`,
    );
  });

  it("counts distinct values only when asked", () => {
    expect(columnStatSql(URL, "area", false)).not.toMatch(/DISTINCT/);
    expect(columnStatSql(URL, "area", true)).toMatch(/count\(DISTINCT "area"\) AS n_distinct/);
  });
});
