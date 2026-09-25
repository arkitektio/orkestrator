import { describe, expect, it } from "vitest";
import type { AttributeLookupEngine } from "./lookupEngine";
import { readColumnValuesBatched } from "./columnReadBatch";

const store = (id: string) => ({ id, bucket: "b", key: "k" }) as never;

/**
 * An engine stand-in that records every statement and answers from canned
 * columns. `readColumnValues` (the run-of-1 and fallback path) also lands on
 * `readColumnsTyped`, so one fake serves every path.
 */
const fakeEngine = (
  byColumn: Record<string, ArrayLike<number> | ArrayLike<string>>,
  options: { failBatched?: boolean; refuseColumnwise?: boolean } = {},
) => {
  const statements: string[] = [];
  const engine = {
    readColumnsTyped: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
      columns: readonly string[],
    ) => {
      const sql = buildSql(() => "s3://b/k");
      statements.push(sql);
      if (options.failBatched && /AS c\d/.test(sql)) throw new Error("bad batched statement");
      if (options.refuseColumnwise) return null;
      const out: Record<string, ArrayLike<number> | ArrayLike<string>> = {};
      for (const name of columns) {
        if (name === "object_id") {
          out[name] = new Float64Array([1, 2, 3]);
          continue;
        }
        // Batched aliases (`c0`, `c1`, …) map positionally; the single-column
        // path asks for the literal alias `value`.
        const source =
          name === "value"
            ? sql.match(/"(\w+)" AS value/)?.[1]
            : sql.match(new RegExp(`"(\\w+)" AS ${name}\\b`))?.[1];
        const column = source ? byColumn[source] : undefined;
        if (!column) return null;
        out[name] = column;
      }
      return out;
    },
  } as unknown as AttributeLookupEngine;
  return { engine, statements };
};

const flushTick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

describe("readColumnValuesBatched", () => {
  it("merges same-tick reads of one table into ONE statement", async () => {
    const { engine, statements } = fakeEngine({
      area: new Float64Array([10, 20, 30]),
      count: new Float64Array([1, 2, 3]),
    });
    const [area, count] = await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "count"),
    ]);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('"area" AS c0');
    expect(statements[0]).toContain('"count" AS c1');
    expect(statements[0]).toContain("ORDER BY object_id");
    expect([...(area!.numeric as Float64Array)]).toEqual([10, 20, 30]);
    expect([...(count!.numeric as Float64Array)]).toEqual([1, 2, 3]);
    // One SELECT, one row order: the ids are literally shared.
    expect(area!.ids).toBe(count!.ids);
  });

  it("keeps a text column as text alongside a numeric one", async () => {
    const { engine } = fakeEngine({
      area: new Float64Array([10, 20, 30]),
      phenotype: ["a", "b", "a"],
    });
    const [area, phenotype] = await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "phenotype"),
    ]);
    expect(area!.numeric).not.toBeNull();
    expect(phenotype!.numeric).toBeNull();
    expect([...(phenotype!.text as string[])]).toEqual(["a", "b", "a"]);
  });

  it("a lone read takes the plain single-column path", async () => {
    const { engine, statements } = fakeEngine({ area: new Float64Array([10, 20, 30]) });
    const area = await readColumnValuesBatched(
      engine,
      { store: store("s1"), keyColumn: "id" },
      "area",
    );
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('"area" AS value');
    expect([...(area!.numeric as Float64Array)]).toEqual([10, 20, 30]);
  });

  it("does not merge across stores or key columns — the batch key is the linchpin", async () => {
    const { engine, statements } = fakeEngine({ area: new Float64Array([1, 2, 3]) });
    await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s2"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "other_id" }, "area"),
    ]);
    expect(statements).toHaveLength(3);
  });

  it("dedupes contributors of the same column into one shared result", async () => {
    const { engine, statements } = fakeEngine({
      area: new Float64Array([1, 2, 3]),
      count: new Float64Array([4, 5, 6]),
    });
    const [first, second] = await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "count"),
    ]);
    expect(statements).toHaveLength(1);
    expect(first).toBe(second);
  });

  it("a batch-level failure falls back per column — a bad statement cannot poison siblings", async () => {
    const { engine, statements } = fakeEngine(
      { area: new Float64Array([1, 2, 3]), count: new Float64Array([4, 5, 6]) },
      { failBatched: true },
    );
    const [area, count] = await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "count"),
    ]);
    // One failed batched statement, then two single-column reads.
    expect(statements).toHaveLength(3);
    expect([...(area!.numeric as Float64Array)]).toEqual([1, 2, 3]);
    expect([...(count!.numeric as Float64Array)]).toEqual([4, 5, 6]);
  });

  it("answers null for every contributor when the result cannot answer columnwise", async () => {
    const { engine } = fakeEngine({}, { refuseColumnwise: true });
    const [area, count] = await Promise.all([
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area"),
      readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "count"),
    ]);
    expect(area).toBeNull();
    expect(count).toBeNull();
  });

  it("reads issued in different ticks do not merge", async () => {
    const { engine, statements } = fakeEngine({ area: new Float64Array([1]) });
    const first = readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area");
    await flushTick();
    const second = readColumnValuesBatched(engine, { store: store("s1"), keyColumn: "id" }, "area");
    await Promise.all([first, second]);
    expect(statements).toHaveLength(2);
  });
});
