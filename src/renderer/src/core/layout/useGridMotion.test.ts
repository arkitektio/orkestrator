import { describe, expect, it } from "vitest";
import { MAX_GHOSTS, planGridMotion, type GridBox } from "./useGridMotion";

const box = (x: number, y: number): GridBox => ({ x, y, width: 100, height: 80 });
const grid = (entries: [string, GridBox][]) => new Map(entries);

describe("planGridMotion", () => {
  it("moves nothing when nothing changed", () => {
    const cards = grid([["a", box(0, 0)], ["b", box(116, 0)]]);
    expect(planGridMotion(cards, cards)).toEqual({ moved: [], removed: [] });
  });

  it("slides a card from where it was to where it is", () => {
    // b and a swapped places.
    const plan = planGridMotion(
      grid([["a", box(0, 0)], ["b", box(116, 0)]]),
      grid([["b", box(0, 0)], ["a", box(116, 0)]]),
    );
    expect(plan.moved).toEqual([
      { item: "b", dx: 116, dy: 0 },
      { item: "a", dx: -116, dy: 0 },
    ]);
    expect(plan.removed).toEqual([]);
  });

  it("fades out a card that left, and slides the ones that closed the gap", () => {
    const plan = planGridMotion(
      grid([["a", box(0, 0)], ["b", box(116, 0)], ["c", box(232, 0)]]),
      grid([["a", box(0, 0)], ["c", box(116, 0)]]),
    );
    expect(plan.removed).toEqual([{ item: "b", box: box(116, 0) }]);
    expect(plan.moved).toEqual([{ item: "c", dx: 116, dy: 0 }]);
  });

  it("leaves a new card to the entrance animation", () => {
    const plan = planGridMotion(grid([["a", box(0, 0)]]), grid([["a", box(0, 0)], ["b", box(116, 0)]]));
    expect(plan).toEqual({ moved: [], removed: [] });
  });

  it("ignores sub-pixel drift", () => {
    const plan = planGridMotion(grid([["a", box(0, 0)]]), grid([["a", box(0.4, 0.4)]]));
    expect(plan.moved).toEqual([]);
  });

  it("does not fade out a whole page being replaced", () => {
    const many = grid(Array.from({ length: MAX_GHOSTS + 1 }, (_, i) => [`old-${i}`, box(i * 116, 0)]));
    expect(planGridMotion(many, grid([["new", box(0, 0)]])).removed).toEqual([]);
  });
});
