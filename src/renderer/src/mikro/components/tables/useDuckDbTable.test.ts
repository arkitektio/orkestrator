// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import {
  RunSequence,
  loadDuckDbTablePage,
  resolveCountCacheKey,
  type DuckDbBatch,
  type DuckDbParquetSource,
  type DuckDbQuerySender,
} from "./useDuckDbTable";

const TABLE: DuckDbParquetSource = {
  store: { id: "store-1" },
  columns: [{ name: "id" }, { name: "label" }],
};
const PARQUET_URL = "s3://bucket/table.parquet";

// A connection whose `send` yields one batch per statement, recording every
// statement so a test can count the scans a load actually issued.
const mockConnection = (rowsFor: (sql: string) => unknown[]) => {
  const sent: string[] = [];
  const connection: DuckDbQuerySender = {
    send: vi.fn(async (sql: string) => {
      sent.push(sql);
      const batch: DuckDbBatch = { toArray: () => rowsFor(sql) };
      return (async function* () {
        yield batch;
      })();
    }),
  };
  return { connection, sent };
};

const rowsFor = (sql: string) =>
  sql.startsWith("SELECT COUNT(*)")
    ? [{ total_row_count: 42n }]
    : [{ id: 1n, label: "a" }, { id: 2n, label: "b" }];

const baseArgs = {
  parquetUrl: PARQUET_URL,
  table: TABLE,
  search: "",
  columnFilters: {},
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 2 },
};

describe("RunSequence", () => {
  it("only the latest ticket is current", () => {
    const runs = new RunSequence();
    const first = runs.begin();
    expect(runs.isCurrent(first)).toBe(true);

    const second = runs.begin();
    expect(runs.isCurrent(first)).toBe(false);
    expect(runs.isCurrent(second)).toBe(true);
  });
});

describe("resolveCountCacheKey", () => {
  it("changes with search and column filters but not with page or sort", () => {
    const base = resolveCountCacheKey(TABLE, PARQUET_URL, "", {});
    expect(resolveCountCacheKey(TABLE, PARQUET_URL, "", {})).toBe(base);
    expect(resolveCountCacheKey(TABLE, PARQUET_URL, "x", {})).not.toBe(base);
    expect(
      resolveCountCacheKey(TABLE, PARQUET_URL, "", { label: "b" }),
    ).not.toBe(base);
    expect(resolveCountCacheKey(TABLE, "s3://other", "", {})).not.toBe(base);
  });
});

describe("loadDuckDbTablePage", () => {
  it("runs COUNT(*) and the page query on a cold cache, normalizing bigints", async () => {
    const { connection, sent } = mockConnection(rowsFor);

    const page = await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      countCache: null,
    });

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatch(/^SELECT COUNT\(\*\)/);
    expect(sent[1]).toMatch(/LIMIT 2 OFFSET 0$/);
    expect(page?.totalRowCount).toBe(42);
    expect(page?.rows).toEqual([
      { id: 1, label: "a" },
      { id: 2, label: "b" },
    ]);
    expect(page?.countCache).toEqual({
      key: resolveCountCacheKey(TABLE, PARQUET_URL, "", {}),
      total: 42,
    });
  });

  it("skips COUNT(*) when only the page or sort changed", async () => {
    const { connection, sent } = mockConnection(rowsFor);
    const first = await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      countCache: null,
    });

    const second = await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      pagination: { pageIndex: 3, pageSize: 2 },
      sorting: [{ id: "label", desc: true }],
      countCache: first?.countCache ?? null,
    });

    expect(sent).toHaveLength(3);
    expect(sent[2]).toMatch(/ORDER BY "label" DESC LIMIT 2 OFFSET 6$/);
    expect(second?.totalRowCount).toBe(42);
  });

  it("re-counts when the search or a column filter changes", async () => {
    const { connection, sent } = mockConnection(rowsFor);
    const first = await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      countCache: null,
    });

    await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      search: "needle",
      countCache: first?.countCache ?? null,
    });

    expect(sent).toHaveLength(4);
    expect(sent[2]).toMatch(/^SELECT COUNT\(\*\)/);
    expect(sent[2]).toContain("ILIKE '%needle%'");
  });

  it("bails before the page query once the run is superseded", async () => {
    const { connection, sent } = mockConnection(rowsFor);
    const runs = new RunSequence();
    const runId = runs.begin();

    const page = await loadDuckDbTablePage({
      ...baseArgs,
      connection,
      countCache: null,
      isCurrent: () => {
        // A newer run arrives while the count is scanning.
        runs.begin();
        return runs.isCurrent(runId);
      },
    });

    expect(page).toBeNull();
    expect(sent).toHaveLength(1);
  });
});
