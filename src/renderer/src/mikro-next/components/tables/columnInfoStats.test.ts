// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import type { ParquetQueryEngine } from "@/lib/parquet/parquetEngine";
import { ColumnControl, ColumnRole } from "@/mikro-next/api/graphql";

import {
  clearColumnStatsCache,
  readColumnValueStats,
  readColumnValueStatsCached,
} from "./columnInfoStats";

const store = { id: "store-a" };

/** Answers each statement by what it selects, and counts the scans. */
const fakeEngine = (options: { failSummary?: boolean; failAll?: boolean } = {}) => {
  const sqls: string[] = [];
  const engine = {
    readAcross: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
    ) => {
      const sql = buildSql(() => "s3://b/k");
      sqls.push(sql);
      if (options.failAll) throw new Error("boom");
      if (sql.includes("count(DISTINCT")) {
        if (options.failSummary) throw new Error("no DISTINCT over STRUCT");
        return [{ n_rows: 4n, n_non_null: 3n, n_distinct: 2n }];
      }
      if (sql.includes("min(")) return [{ lo: 0, hi: 10 }];
      if (sql.includes("SELECT DISTINCT")) return [{ value: "a" }, { value: "b" }];
      // histogram bins
      return [{ bin: 0, n: 2n }];
    },
  } as unknown as ParquetQueryEngine;
  return { engine, sqls };
};

beforeEach(() => {
  clearColumnStatsCache();
});

describe("readColumnValueStats", () => {
  it("reads a domain and a histogram for a measure column", async () => {
    const { engine, sqls } = fakeEngine();
    const stats = await readColumnValueStats(engine, store, {
      name: "area",
      role: ColumnRole.Attribute,
    });
    expect(stats.control).toBe(ColumnControl.Measure);
    expect(stats.domain).toEqual({ min: 0, max: 10 });
    expect(stats.histogram?.[0]).toBe(2);
    expect(stats.distinct).toBeNull();
    expect(stats.summary).toEqual({ rows: 4, nonNull: 3, distinct: 2 });
    expect(sqls.some((sql) => sql.includes("SELECT DISTINCT"))).toBe(false);
  });

  it("reads the distinct set for a categorical column", async () => {
    const { engine, sqls } = fakeEngine();
    const stats = await readColumnValueStats(engine, store, {
      name: "label",
      role: ColumnRole.Label,
    });
    expect(stats.control).toBe(ColumnControl.Categorical);
    expect(stats.distinct).toEqual({ values: ["a", "b"], truncated: false });
    expect(stats.domain).toBeNull();
    expect(sqls.some((sql) => sql.includes("min("))).toBe(false);
  });

  it("keeps the domain when only the summary fails", async () => {
    const { engine } = fakeEngine({ failSummary: true });
    const stats = await readColumnValueStats(engine, store, {
      name: "area",
      role: ColumnRole.Coordinate,
    });
    expect(stats.summary).toBeNull();
    expect(stats.domain).toEqual({ min: 0, max: 10 });
  });
});

describe("readColumnValueStatsCached", () => {
  const column = { name: "area", role: ColumnRole.Attribute };

  it("scans once per store and column, and shares an in-flight read", async () => {
    const { engine, sqls } = fakeEngine();
    const first = readColumnValueStatsCached(engine, store, column);
    const second = readColumnValueStatsCached(engine, store, column);
    expect(second).toBe(first);
    await first;
    const scans = sqls.length;
    await readColumnValueStatsCached(engine, store, column);
    expect(sqls.length).toBe(scans);
  });

  it("keys on the store, so another table's column of the same name is its own read", async () => {
    const { engine, sqls } = fakeEngine();
    await readColumnValueStatsCached(engine, store, column);
    const scans = sqls.length;
    await readColumnValueStatsCached(engine, { id: "store-b" }, column);
    expect(sqls.length).toBeGreaterThan(scans);
  });

  it("evicts a failed read so the next open retries", async () => {
    const failing = fakeEngine({ failAll: true });
    await expect(
      readColumnValueStatsCached(failing.engine, store, column),
    ).rejects.toThrow("boom");
    const { engine, sqls } = fakeEngine();
    const stats = await readColumnValueStatsCached(engine, store, column);
    expect(stats.domain).toEqual({ min: 0, max: 10 });
    expect(sqls.length).toBeGreaterThan(0);
  });
});
