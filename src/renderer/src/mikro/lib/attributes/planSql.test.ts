import { describe, expect, it } from "vitest";
import { isProjection, projectColumns, tableHopSql } from "./planSql";
import { namesHop, tableHop } from "./__fixtures__/plans";

const wide = () =>
  tableHop({
    lookup: {
      kind: "TABLE",
      store: { id: "pq1", bucket: "b", key: "morph.parquet" },
      keyColumns: [
        { axis: "t", column: { name: "t", dtype: "BIGINT" } },
        { axis: "i", column: { name: "i", dtype: "BIGINT" } },
      ],
      attributes: [
        { name: "area", dtype: "DOUBLE" },
        { name: "mean intensity", dtype: "DOUBLE" },
        { name: 'odd"name', dtype: "VARCHAR" },
      ],
    },
  });

describe("tableHopSql", () => {
  it("derives the server's statement: quoted attributes, URL-first bind, keys in order", () => {
    const statement = tableHopSql(tableHop());
    expect(statement.sql).toBe('SELECT "area" FROM read_parquet(?) WHERE "t" = ? AND "i" = ?');
    expect(statement.selected).toEqual(["area"]);
    expect(statement.shapeKey).toBe("");
  });

  it("projects to the user's columns, dropping unknown names, keeping declared order", () => {
    const statement = tableHopSql(wide(), { columns: ['odd"name', "area", "nope"] });
    expect(statement.sql).toBe(
      'SELECT "area", "odd""name" FROM read_parquet(?) WHERE "t" = ? AND "i" = ?',
    );
    expect(statement.shapeKey).toBe('#area,odd"name');
    expect(isProjection(wide(), ["area"])).toBe(true);
  });

  it("treats an empty or complete projection as the declared list", () => {
    expect(projectColumns(wide(), [])).toEqual(["area", "mean intensity", 'odd"name']);
    expect(projectColumns(wide(), ["zzz"])).toEqual(["area", "mean intensity", 'odd"name']);
    expect(isProjection(wide(), ["area", "mean intensity", 'odd"name'])).toBe(false);
    expect(tableHopSql(wide(), { columns: [] }).shapeKey).toBe("");
  });

  it("binds a MANY key as an IN list and selects the keys too", () => {
    const statement = tableHopSql(namesHop(), { many: { axis: "gene", count: 3 } });
    expect(statement.sql).toBe(
      'SELECT "gene", "symbol" FROM read_parquet(?) WHERE "gene" IN (?, ?, ?)',
    );
    expect(statement.selected).toEqual(["gene", "symbol"]);
  });

  it("does not select a key twice when it is also a declared attribute", () => {
    const hop = tableHop({
      lookup: {
        kind: "TABLE",
        store: { id: "pq1", bucket: "b", key: "k" },
        keyColumns: [{ axis: "i", column: { name: "i", dtype: "BIGINT" } }],
        attributes: [
          { name: "i", dtype: "BIGINT" },
          { name: "area", dtype: "DOUBLE" },
        ],
      },
    });
    expect(tableHopSql(hop, { many: { axis: "i", count: 2 } }).sql).toBe(
      'SELECT "i", "area" FROM read_parquet(?) WHERE "i" IN (?, ?)',
    );
  });

  it("refuses a MANY axis the hop does not bind, or an empty list", () => {
    expect(() => tableHopSql(tableHop(), { many: { axis: "gene", count: 2 } })).toThrow();
    expect(() => tableHopSql(tableHop(), { many: { axis: "i", count: 0 } })).toThrow();
  });
});
