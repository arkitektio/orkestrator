import { describe, expect, it } from "vitest";

import { createTab, type TabRecord } from "@/core/command/tabs/tabs";

import { rowBlock, rowMoves, rowsOf } from "./railRows";

/** Tabs by id, with `a>b` meaning "a shows b beside it". */
const tabs = (...specs: string[]): TabRecord[] =>
  specs.map((spec) => {
    const [id, beside] = spec.split(">");
    return { ...createTab(`/${id}`, { id }), ...(beside ? { beside } : {}) };
  });
const shape = (rows: ReturnType<typeof rowsOf>) => rows.map((r) => r.tabs.map((t) => t.id));

describe("rowsOf", () => {
  it("is one row per tab when nothing has a partner", () => {
    expect(shape(rowsOf(tabs("a", "b", "c")))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("folds a pair into the owner's row, owner first, and lists the partner nowhere else", () => {
    const rows = rowsOf(tabs("a", "b", "c>a", "d"));
    expect(shape(rows)).toEqual([["b"], ["c", "a"], ["d"]]);
    expect(rows[1].id).toBe("c");
  });

  it("shows a shared partner in every row that owns it", () => {
    expect(shape(rowsOf(tabs("a>x", "b>x", "x")))).toEqual([
      ["a", "x"],
      ["b", "x"],
    ]);
  });

  it("gives an owner that is also a partner its own pair row", () => {
    expect(shape(rowsOf(tabs("a>b", "b>c", "c")))).toEqual([
      ["a", "b"],
      ["b", "c"],
    ]);
  });

  it("ignores a partner that is not there, or is the tab itself", () => {
    expect(shape(rowsOf(tabs("a>zzz", "b>b")))).toEqual([["a"], ["b"]]);
  });

  it("blocks a pair as pinned only when both are", () => {
    const [a, b] = tabs("a", "b");
    expect(rowBlock({ id: "a", tabs: [{ ...a, pinned: true }, b] })).toBe("open");
    expect(rowBlock({ id: "a", tabs: [{ ...a, pinned: true }, { ...b, pinned: true }] })).toBe(
      "pinned",
    );
  });
});

describe("rowMoves", () => {
  /** Apply the moves as `moveTab` would, ignoring blocks. */
  const apply = (all: TabRecord[], moves: Array<[string, number]>) => {
    const order = all.map((t) => t.id);
    for (const [id, index] of moves) {
      order.splice(order.indexOf(id), 1);
      order.splice(index, 0, id);
    }
    return order;
  };

  it("is a plain move for a single row", () => {
    const all = tabs("a", "b", "c");
    const rows = rowsOf(all);
    expect(rowMoves(rows, all, "a", 1)).toEqual([["a", 1]]);
    expect(rowMoves(rows, all, "c", 0)).toEqual([["c", 0]]);
    expect(rowMoves(rows, all, "nope", 0)).toEqual([]);
  });

  it("moves a pair by its owner; the partner keeps its own place", () => {
    const all = tabs("a", "b", "c", "d>b", "e"); // rows: a, c, [d b], e
    const rows = rowsOf(all);
    expect(apply(all, rowMoves(rows, all, "d", 0))).toEqual(["d", "a", "b", "c", "e"]);
    expect(apply(all, rowMoves(rows, all, "d", 3))).toEqual(["a", "b", "c", "e", "d"]);
    expect(shape(rowsOf(tabs("d>b", "a", "b", "c", "e")))).toEqual([["d", "b"], ["a"], ["c"], ["e"]]);
  });

  it("moves a single row past a pair by the owner's place, not the partner's", () => {
    const all = tabs("a", "b", "c>b"); // rows: a, [c b]
    const rows = rowsOf(all);
    expect(apply(all, rowMoves(rows, all, "a", 1))).toEqual(["b", "c", "a"]);
  });
});
