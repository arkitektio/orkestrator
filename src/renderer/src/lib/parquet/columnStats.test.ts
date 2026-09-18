import { describe, expect, it } from "vitest";

import type { AttributeLookupEngine } from "./lookupEngine";
import {
  DISTINCT_LIMIT,
  HISTOGRAM_BINS,
  describeColumnStatsError,
  readColumnDistinct,
  readColumnDomain,
  readColumnHistogram,
  readDefaultFilterRule,
} from "./columnStats";

const target = {
  table: { store: { id: "store-a", bucket: "b", key: "k" } },
  column: { name: "area" },
};

/** An engine stand-in that answers with canned rows and records the SQL. */
const fakeEngine = (rows: Record<string, unknown>[]) => {
  const sqls: string[] = [];
  const engine = {
    readAcross: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
    ) => {
      sqls.push(buildSql(() => "s3://b/k"));
      return rows;
    },
  } as unknown as AttributeLookupEngine;
  return { engine, sqls };
};

describe("readColumnDomain", () => {
  it("reads the bounds and quotes the column as an identifier", async () => {
    const { engine, sqls } = fakeEngine([{ lo: 2, hi: 9 }]);
    expect(await readColumnDomain(engine, target)).toEqual({ min: 2, max: 9 });
    expect(sqls[0]).toContain('"area"');
    // The URL comes from the grant, never from the declared bucket/key.
    expect(sqls[0]).toContain("'s3://b/k'");
  });

  it("is null for an empty or non-numeric column", async () => {
    expect(await readColumnDomain(fakeEngine([{ lo: null, hi: null }]).engine, target)).toBeNull();
    expect(await readColumnDomain(fakeEngine([]).engine, target)).toBeNull();
  });
});

describe("readColumnDistinct", () => {
  it("reads one row past the cap so a full list is distinguishable from a cut one", async () => {
    const under = await readColumnDistinct(
      fakeEngine([{ value: "a" }, { value: "b" }]).engine,
      target,
      4,
    );
    expect(under).toEqual({ values: ["a", "b"], truncated: false });

    const over = await readColumnDistinct(
      fakeEngine([1, 2, 3, 4, 5].map((n) => ({ value: `v${n}` }))).engine,
      target,
      4,
    );
    expect(over.truncated).toBe(true);
    expect(over.values).toHaveLength(4);
  });

  it("asks for exactly one more than the cap", async () => {
    const { engine, sqls } = fakeEngine([]);
    await readColumnDistinct(engine, target, 8);
    expect(sqls[0]).toContain("LIMIT 9");
  });
});

describe("readColumnHistogram", () => {
  // A boolean flag column reads back as a 0…1 measure, and the binning SQL used
  // to subtract from the column directly — which DuckDB rejects outright
  // ("No function matches ... '-(BOOLEAN, INTEGER_LITERAL)'"), so configuring a
  // colour-by on such a column failed instead of drawing two bars.
  it("bins through a numeric cast so a boolean column is binnable", async () => {
    const { engine, sqls } = fakeEngine([{ bin: 0, n: 7 }, { bin: 31, n: 3 }]);
    const bins = await readColumnHistogram(engine, target, { min: 0, max: 1 });
    expect(sqls[0]).toContain('TRY_CAST("area" AS DOUBLE)');
    expect(sqls[0]).not.toMatch(/"area" -/);
    // The NULL filter has to test the cast too, or rows with no numeric reading
    // come back as a NULL bin.
    expect(sqls[0]).toContain("TRY_CAST(\"area\" AS DOUBLE) IS NOT NULL");
    expect(bins).toHaveLength(HISTOGRAM_BINS);
    expect(bins[0]).toBe(7);
    expect(bins[HISTOGRAM_BINS - 1]).toBe(3);
  });

  it("casts in the constant-column branch as well", async () => {
    const { engine, sqls } = fakeEngine([{ n: 5 }]);
    const bins = await readColumnHistogram(engine, target, { min: 1, max: 1 });
    expect(sqls[0]).toContain('TRY_CAST("area" AS DOUBLE) IS NOT NULL');
    expect(bins[HISTOGRAM_BINS / 2]).toBe(5);
  });

  it("drops a NULL bin rather than coercing it onto the first bar", async () => {
    const { engine } = fakeEngine([{ bin: null, n: 9 }, { bin: 2, n: 4 }]);
    const bins = await readColumnHistogram(engine, target, { min: 0, max: 1 });
    expect(bins[0]).toBe(0);
    expect(bins[2]).toBe(4);
  });
});

// The regression this file mostly exists for: `updateMeshLayer` refuses a rule
// that names neither a bound nor any values, so a seeded rule must always carry
// one of the two — and must be the WIDEST legal one, so adding a filter does
// not hide anything on its own.
describe("readDefaultFilterRule", () => {
  it("seeds a measure with the column's whole range", async () => {
    const seed = await readDefaultFilterRule(fakeEngine([{ lo: -3, hi: 12 }]).engine, target, "MEASURE");
    expect(seed).toEqual({ rule: { min: -3, max: 12 }, truncated: false });
  });

  it("seeds a categorical with every distinct value", async () => {
    const seed = await readDefaultFilterRule(
      fakeEngine([{ value: "a" }, { value: "b" }]).engine,
      target,
      "CATEGORICAL",
    );
    expect(seed).toEqual({ rule: { values: ["a", "b"] }, truncated: false });
  });

  it("flags a categorical seed that could not name every value", async () => {
    const rows = Array.from({ length: DISTINCT_LIMIT + 1 }, (_, index) => ({
      value: `v${index}`,
    }));
    const seed = await readDefaultFilterRule(fakeEngine(rows).engine, target, "CATEGORICAL");
    expect(seed?.truncated).toBe(true);
  });

  it("refuses to invent a bound when the column cannot answer", async () => {
    expect(await readDefaultFilterRule(fakeEngine([]).engine, target, "MEASURE")).toBeNull();
    expect(await readDefaultFilterRule(fakeEngine([]).engine, target, "CATEGORICAL")).toBeNull();
  });
});

describe("describeColumnStatsError", () => {
  it("names the missing-object case rather than pasting SQL", () => {
    const raw =
      "HTTP Error: HTTP GET error reading 's3://bucket/9ea18631' in region 'us-east-1' " +
      "(HTTP 404 Not Found) LINE 1: ... FROM read_parquet('s3://bucket/9ea18631')";
    const { summary, detail } = describeColumnStatsError(new Error(raw));
    expect(summary).toMatch(/not in storage/);
    expect(summary).not.toMatch(/SELECT|read_parquet|s3:\/\//);
    expect(detail).toBe(raw); // the detail is kept, not discarded
  });

  it("names an UNFINISHED upload when the store never recorded a size", () => {
    const raw = "HTTP Error: ... (HTTP 404 Not Found)";
    const store = { id: "s", bucket: "b", key: "k", sizeBytes: null };
    expect(describeColumnStatsError(new Error(raw), store).summary).toMatch(
      /upload never finished/,
    );
  });

  it("says REMOVED, not unfinished, when the upload did finish", () => {
    const raw = "HTTP Error: ... (HTTP 404 Not Found)";
    const store = { id: "s", bucket: "b", key: "k", sizeBytes: 1234 };
    const { summary } = describeColumnStatsError(new Error(raw), store);
    expect(summary).toMatch(/may have been removed/);
    expect(summary).not.toMatch(/never finished/);
  });

  it("stays non-committal when no store is supplied", () => {
    const { summary } = describeColumnStatsError(
      new Error("HTTP 404 Not Found"),
    );
    expect(summary).toMatch(/not in storage/);
    expect(summary).not.toMatch(/never finished/);
  });

  it("recognises the other shapes DuckDB uses for a missing object", () => {
    for (const raw of ["IO Error: No files found that match the pattern", "NoSuchKey"]) {
      expect(describeColumnStatsError(new Error(raw)).summary).toMatch(/not in storage/);
    }
  });

  it("falls back to a generic summary for a real query error", () => {
    const { summary } = describeColumnStatsError(
      new Error('Binder Error: Referenced column "nope" not found'),
    );
    expect(summary).toMatch(/could not be read/);
    expect(summary).not.toMatch(/not in storage/);
  });

  it("survives a non-Error throw", () => {
    expect(describeColumnStatsError("boom").detail).toBe("boom");
  });
});
