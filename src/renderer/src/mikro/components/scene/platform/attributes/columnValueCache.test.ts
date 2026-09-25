// @vitest-environment jsdom
// (`columnValueCache.ts` imports `columnLut.ts`, which reaches the generated
// `graphql.ts` for the ColorMap enum, whose Apollo hooks barrel touches
// `window` on load — the same reason `fabriksColorLut.test.ts` runs in jsdom.)
import { describe, expect, it } from "vitest";

import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import {
  readColumnByObjectIdBatchedCached,
  readColumnByObjectIdCached,
  readColumnValuesBatchedCached,
} from "./columnValueCache";

const access = (storeId = "store-a", keyColumn = "object_id") => ({
  store: { id: storeId, bucket: "b", key: "k" },
  keyColumn,
});

/** An engine stand-in that counts scans and can fail the first one. */
const countingEngine = (opts?: { failFirst?: boolean }) => {
  let calls = 0;
  const engine = {
    readAcross: async () => {
      calls += 1;
      if (opts?.failFirst && calls === 1) throw new Error("transient");
      return [{ object_id: 1, value: calls }];
    },
  } as unknown as AttributeLookupEngine;
  return { engine, calls: () => calls };
};

describe("readColumnByObjectIdCached", () => {
  it("scans once per (store, key column, column) per engine", async () => {
    const { engine, calls } = countingEngine();
    const first = await readColumnByObjectIdCached(engine, access(), "area");
    const second = await readColumnByObjectIdCached(engine, access(), "area");
    expect(calls()).toBe(1);
    expect(second).toBe(first); // the same resolved map, not a re-read

    await readColumnByObjectIdCached(engine, access(), "volume");
    expect(calls()).toBe(2); // a different column is a different scan
    await readColumnByObjectIdCached(engine, access("store-b"), "area");
    expect(calls()).toBe(3); // a different store likewise
  });

  it("shares one in-flight scan between concurrent readers", async () => {
    const { engine, calls } = countingEngine();
    const [a, b] = await Promise.all([
      readColumnByObjectIdCached(engine, access(), "area"),
      readColumnByObjectIdCached(engine, access(), "area"),
    ]);
    expect(calls()).toBe(1);
    expect(b).toBe(a);
  });

  it("does not let a failed scan poison the key — the next call retries", async () => {
    const { engine, calls } = countingEngine({ failFirst: true });
    await expect(readColumnByObjectIdCached(engine, access(), "area")).rejects.toThrow(
      "transient",
    );
    const map = await readColumnByObjectIdCached(engine, access(), "area");
    expect(calls()).toBe(2);
    expect(map.get(1)).toBe(2);
  });

  it("keeps caches apart per engine", async () => {
    const first = countingEngine();
    const second = countingEngine();
    await readColumnByObjectIdCached(first.engine, access(), "area");
    await readColumnByObjectIdCached(second.engine, access(), "area");
    expect(first.calls()).toBe(1);
    expect(second.calls()).toBe(1);
  });
});

/** An engine whose columnar path answers (or declines), counting statements. */
const columnarEngine = (opts?: { declineColumnwise?: boolean }) => {
  let typed = 0;
  let rows = 0;
  const engine = {
    readColumnsTyped: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
      columns: readonly string[],
    ) => {
      buildSql(() => "s3://b/k");
      typed += 1;
      if (opts?.declineColumnwise) return null;
      const out: Record<string, ArrayLike<number> | ArrayLike<string>> = {};
      for (const name of columns) {
        out[name] = name === "object_id" ? new Float64Array([1, 2]) : ["a", "b"];
      }
      return out;
    },
    readAcross: async () => {
      rows += 1;
      return [
        { object_id: 1, value: "a" },
        { object_id: 2, value: "b" },
      ];
    },
  } as unknown as AttributeLookupEngine;
  return { engine, typed: () => typed, rows: () => rows };
};

describe("readColumnByObjectIdBatchedCached", () => {
  it("derives the row map from the columnar read — no second scan of the column", async () => {
    const { engine, typed, rows } = columnarEngine();
    const map = await readColumnByObjectIdBatchedCached(engine, access(), "phenotype");
    expect(typed()).toBe(1);
    expect(rows()).toBe(0);
    expect(map.get(1)).toBe("a");
    expect(map.get(2)).toBe("b");
    // ...and the columnar cache already holds the same column: no new scan.
    await readColumnValuesBatchedCached(engine, access(), "phenotype");
    expect(typed()).toBe(1);
  });

  it("falls back to the row path when the columnar read declines", async () => {
    const { engine, typed, rows } = columnarEngine({ declineColumnwise: true });
    const map = await readColumnByObjectIdBatchedCached(engine, access(), "phenotype");
    expect(typed()).toBe(1);
    expect(rows()).toBe(1);
    expect(map.get(1)).toBe("a");
  });

  it("caches the derived map — a second call is no read at all", async () => {
    const { engine, typed } = columnarEngine();
    const first = await readColumnByObjectIdBatchedCached(engine, access(), "phenotype");
    const second = await readColumnByObjectIdBatchedCached(engine, access(), "phenotype");
    expect(typed()).toBe(1);
    expect(second).toBe(first);
  });
});
