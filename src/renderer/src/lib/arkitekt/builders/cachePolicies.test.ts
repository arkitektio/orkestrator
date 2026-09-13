import { describe, expect, it, vi } from "vitest";
import {
  buildOffsetPaginationPolicies,
  mergeOffsetPage,
  mergePortsByKey,
  portsByKeyPolicy,
  readOffsetPage,
} from "./cachePolicies";

const rows = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => ({ __ref: `Row:${from + i}` }));

const page = (offset: number, limit: number) => ({ pagination: { offset, limit } });

describe("mergeOffsetPage", () => {
  it("writes the first page at offset 0", () => {
    expect(mergeOffsetPage(undefined, rows(0, 20), page(0, 20))).toEqual(rows(0, 20));
  });

  it("writes a later page after the earlier one", () => {
    const first = mergeOffsetPage(undefined, rows(0, 20), page(0, 20));
    const merged = mergeOffsetPage(first, rows(20, 40), page(20, 20));
    expect(merged).toEqual(rows(0, 40));
  });

  it("fills a gap with nulls (never holes) when pages are skipped", () => {
    const merged = mergeOffsetPage(rows(0, 5), rows(10, 15), page(10, 5));
    expect(merged.length).toBe(15);
    for (let i = 5; i < 10; i++) {
      expect(i in merged).toBe(true);
      expect(merged[i]).toBeNull();
    }
    // A `filter` on the array (as `cache.modify` modifiers do) keeps the nulls.
    expect(merged.filter(() => true).length).toBe(15);
  });

  it("truncates the window when a short page marks the end of the list", () => {
    const merged = mergeOffsetPage(rows(0, 40), rows(20, 23), page(20, 20));
    expect(merged).toEqual(rows(0, 23));
  });

  it("replaces the whole window when the query has no pagination", () => {
    expect(mergeOffsetPage(rows(0, 40), rows(0, 3), undefined)).toEqual(rows(0, 3));
    expect(mergeOffsetPage(rows(0, 40), rows(0, 3), { pagination: null })).toEqual(rows(0, 3));
  });

  it("refreshing an earlier page keeps later pages", () => {
    const merged = mergeOffsetPage(rows(0, 40), rows(0, 20), page(0, 20));
    expect(merged).toEqual(rows(0, 40));
  });

  it("does not mutate `existing`", () => {
    const existing = rows(0, 20);
    const snapshot = rows(0, 20);
    mergeOffsetPage(existing, rows(20, 40), page(20, 20));
    expect(existing).toEqual(snapshot);
  });
});

describe("readOffsetPage", () => {
  const window = mergeOffsetPage(
    mergeOffsetPage(undefined, rows(0, 20), page(0, 20)),
    rows(20, 40),
    page(20, 20),
  );

  it("reads back only the requested page", () => {
    expect(readOffsetPage(window, page(0, 20))).toEqual(rows(0, 20));
    expect(readOffsetPage(window, page(20, 20))).toEqual(rows(20, 40));
  });

  it("serves a smaller limit from the same window", () => {
    expect(readOffsetPage(window, page(0, 5))).toEqual(rows(0, 5));
  });

  it("misses when nothing is cached", () => {
    expect(readOffsetPage(undefined, page(0, 20))).toBeUndefined();
  });

  it("misses on a page beyond the window", () => {
    expect(readOffsetPage(window, page(40, 20))).toBeUndefined();
    expect(readOffsetPage(window, page(60, 20))).toBeUndefined();
  });

  it("misses when the page contains unknown rows", () => {
    const gappy = mergeOffsetPage(rows(0, 5), rows(10, 15), page(10, 5));
    expect(readOffsetPage(gappy, page(5, 5))).toBeUndefined();
    expect(readOffsetPage(gappy, page(3, 5))).toBeUndefined();
    expect(readOffsetPage(gappy, page(10, 5))).toEqual(rows(10, 15));
  });

  it("returns the short tail page as-is", () => {
    const short = mergeOffsetPage(rows(0, 20), rows(20, 23), page(20, 20));
    expect(readOffsetPage(short, page(20, 20))).toEqual(rows(20, 23));
  });

  it("serves an empty list at offset 0 from cache but misses on later empty pages", () => {
    const empty = mergeOffsetPage(undefined, [], page(0, 20));
    expect(readOffsetPage(empty, page(0, 20))).toEqual([]);
    expect(readOffsetPage(mergeOffsetPage(undefined, rows(0, 20), page(0, 20)), page(20, 20))).toBeUndefined();
  });

  it("returns the whole window for a query without pagination", () => {
    expect(readOffsetPage(window, undefined)).toEqual(rows(0, 40));
  });

  it("drops rows that can no longer be read (evicted entities)", () => {
    const canRead = (row: { __ref: string }) => row.__ref !== "Row:1";
    expect(readOffsetPage(window, page(0, 3), canRead)).toEqual([rows(0, 1)[0], rows(2, 3)[0]]);
  });

  it("survives an array-shaped cache.modify append and removal", () => {
    // AgentUpdater-style: append a reference at the end, remove one by filter.
    const appended = [...window, { __ref: "Row:new" }];
    expect(readOffsetPage(appended, page(40, 20))).toEqual([{ __ref: "Row:new" }]);
    const removed = appended.filter((r) => r?.__ref !== "Row:0");
    expect(readOffsetPage(removed, page(0, 20))).toEqual(rows(1, 21));
  });
});

describe("buildOffsetPaginationPolicies", () => {
  it("keys every field on its non-pagination args and wires read/merge", () => {
    const policies = buildOffsetPaginationPolicies({
      actions: ["filters", "ordering"],
      entities: ["entityCategoryId", "filters", "ordering"],
    });
    const fields = policies.Query!.fields as Record<string, any>;
    expect(Object.keys(fields)).toEqual(["actions", "entities"]);
    expect(fields.actions.keyArgs).toEqual(["filters", "ordering"]);
    expect(fields.entities.keyArgs).toEqual(["entityCategoryId", "filters", "ordering"]);

    const merged = fields.actions.merge(undefined, rows(0, 2), { args: page(0, 2) });
    expect(fields.actions.read(merged, { args: page(0, 2), canRead: () => true })).toEqual(rows(0, 2));
    expect(fields.actions.read(merged, { args: page(2, 2), canRead: () => true })).toBeUndefined();
  });
});

describe("mergePortsByKey", () => {
  const full = [
    { key: "a", kind: "INT", identifier: null, children: [{ key: "x" }], validators: [1] },
    { key: "b", kind: "STRING", identifier: "@x/y", children: [], validators: [] },
  ];

  it("returns incoming as-is when nothing is cached", () => {
    expect(mergePortsByKey(undefined, full)).toEqual(full);
    expect(mergePortsByKey([], full)).toEqual(full);
  });

  it("a slim write keeps the full fields of the cached port with the same key", () => {
    const slim = [
      { key: "a", kind: "INT", identifier: null },
      { key: "b", kind: "STRING", identifier: "@x/y" },
    ];
    expect(mergePortsByKey(full, slim)).toEqual(full);
  });

  it("incoming wins on fields both carry and dictates order and membership", () => {
    const incoming = [
      { key: "b", kind: "FLOAT", identifier: "@x/z" },
      { key: "c", kind: "BOOL", identifier: null },
    ];
    expect(mergePortsByKey(full, incoming)).toEqual([
      { key: "b", kind: "FLOAT", identifier: "@x/z", children: [], validators: [] },
      { key: "c", kind: "BOOL", identifier: null },
    ]);
  });

  it("does not mutate either input", () => {
    const existing = [{ key: "a", kind: "INT", children: [1] }];
    const incoming = [{ key: "a", kind: "FLOAT" }];
    const merged = mergePortsByKey(existing, incoming);
    expect(merged).toEqual([{ key: "a", kind: "FLOAT", children: [1] }]);
    expect(existing).toEqual([{ key: "a", kind: "INT", children: [1] }]);
    expect(incoming).toEqual([{ key: "a", kind: "FLOAT" }]);
    expect(merged[0]).not.toBe(incoming[0]);
  });

  it("leaves ports without a key untouched", () => {
    const existing = [{ kind: "INT", children: [1] }] as { key?: string; kind: string }[];
    const incoming = [{ kind: "FLOAT" }];
    expect(mergePortsByKey(existing, incoming)).toEqual([{ kind: "FLOAT" }]);
  });

  it("reads keys through the injected reader (Apollo's readField)", () => {
    const existing = [{ k: "a", kind: "INT", children: [1] }];
    const incoming = [{ k: "a", kind: "FLOAT" }];
    expect(mergePortsByKey(existing, incoming, (p) => p.k)).toEqual([
      { k: "a", kind: "FLOAT", children: [1] },
    ]);
  });

  it("portsByKeyPolicy wires readField('key') into the merge", () => {
    const readField = vi.fn((field: string, from: any) => from[field]);
    const merged = portsByKeyPolicy.merge!(
      [{ key: "a", kind: "INT", children: [1] }],
      [{ key: "a", kind: "FLOAT" }],
      { readField } as any,
    );
    expect(merged).toEqual([{ key: "a", kind: "FLOAT", children: [1] }]);
    expect(readField).toHaveBeenCalledWith("key", expect.anything());
  });
});
