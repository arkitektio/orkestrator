// @vitest-environment jsdom
// (`pointsFilterMask.ts` imports `columnLut.ts`, which reaches the generated
// `graphql.ts` for the ColorMap enum, whose Apollo hooks barrel touches
// `window` on load.)
import { describe, expect, it } from "vitest";
import { fillPointFilterMask } from "./pointsFilterMask";

// Slots 0..3 belong to ids 10, 20, 30, 40; id 99 is a row the table draws no
// point for.
const slotOf = (objectId: number): number => {
  const slots: Record<number, number> = { 10: 0, 20: 1, 30: 2, 40: 3 };
  return slots[objectId] ?? -1;
};

const mask = () => new Uint32Array(4).fill(7); // poisoned, so fills are visible

describe("fillPointFilterMask", () => {
  it("no active rules keeps every point", () => {
    const out = mask();
    fillPointFilterMask(out, 4, [], [], slotOf);
    expect([...out]).toEqual([1, 1, 1, 1]);
  });

  it("a bounds rule keeps the mentioned ids inside it; an id with no row has no value and fails the bound", () => {
    const out = mask();
    fillPointFilterMask(
      out,
      4,
      [{ table: "t", column: "area", min: 4, max: 6, exclude: false }],
      [new Map<number, unknown>([[10, 1], [20, 5], [30, 9]])],
      slotOf,
    );
    // 40 is unmentioned: `absentValueOf` a column rule is undefined, which a
    // bound over a value that does not exist honestly fails — the painters'
    // shared baseline semantic (`paintColumnLut`, `paintValueLut`).
    expect([...out]).toEqual([0, 1, 0, 0]);
  });

  it("exclude inverts the test, not the absent-id rule", () => {
    const out = mask();
    fillPointFilterMask(
      out,
      4,
      [{ table: "t", column: "area", min: 4, max: 6, exclude: true }],
      [new Map<number, unknown>([[10, 1], [20, 5], [30, 9]])],
      slotOf,
    );
    // ...and under exclude the absent id's failed match INVERTS to a keep.
    expect([...out]).toEqual([1, 0, 1, 1]);
  });

  it("rules AND together across their mentioned unions", () => {
    const out = mask();
    fillPointFilterMask(
      out,
      4,
      [
        { table: "t", column: "area", min: 0, max: 6, exclude: false },
        { table: "t", column: "phenotype", values: ["a"], exclude: false },
      ],
      [
        new Map<number, unknown>([[10, 1], [20, 5], [30, 9]]),
        new Map<number, unknown>([[10, "a"], [20, "a"], [30, "b"]]),
      ],
      slotOf,
    );
    // 40 is unmentioned by both rules and fails both baselines.
    expect([...out]).toEqual([1, 1, 0, 0]);
  });

  it("a sparse rule reads absence as zero, so an excluding baseline hides the unmentioned", () => {
    const out = mask();
    // dataset != null makes it a SPARSE rule: absent = 0, which fails min: 4 —
    // the baseline is HIDE, and only mentioned survivors are re-admitted.
    fillPointFilterMask(
      out,
      4,
      [{ dataset: "d1", column: null, min: 4, exclude: false }],
      [new Map<number, unknown>([[20, 5]])],
      slotOf,
    );
    expect([...out]).toEqual([0, 1, 0, 0]);
  });

  it("an unreadable rule applies to nothing", () => {
    const out = mask();
    fillPointFilterMask(
      out,
      4,
      [{ table: "t", column: "area", min: 4, exclude: false }],
      [null],
      slotOf,
    );
    expect([...out]).toEqual([1, 1, 1, 1]);
  });

  it("ignores ids the table draws no point for", () => {
    const out = mask();
    fillPointFilterMask(
      out,
      4,
      [{ table: "t", column: "area", min: 4, exclude: false }],
      [new Map<number, unknown>([[99, 1]])],
      slotOf,
    );
    // id 99 addresses nothing drawn (slot -1); every real slot is unmentioned
    // and takes the hiding baseline — but nothing threw and nothing aliased.
    expect([...out]).toEqual([0, 0, 0, 0]);
  });
});
