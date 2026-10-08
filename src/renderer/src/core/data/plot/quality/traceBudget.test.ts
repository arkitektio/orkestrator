import { describe, expect, it } from "vitest";
import { TraceMemoryBudget } from "./traceBudget";
import { createResidency, insertTile, type Residency } from "./traceResidency";

const tile = (key: string, start: number, bytes: number) => ({
  key,
  level: 0,
  levelIndex: 0,
  index: 0,
  span: { start, end: start + 1 },
  samples: { start: 0, stop: 1 },
  bytes,
  period: 1,
  t0: 0,
  channels: [],
  lastUsed: 0,
});

describe("TraceMemoryBudget", () => {
  it("evicts across layers, furthest from the focus first, sparing protected tiles", () => {
    const a: Residency = createResidency();
    const b: Residency = createResidency();
    insertTile(a, tile("a-near", 0, 40));
    insertTile(a, tile("a-far", 1000, 40));
    insertTile(b, tile("b-mid", 100, 40));
    insertTile(b, tile("b-far-protected", 2000, 40));
    const budget = new TraceMemoryBudget(100);
    budget.register("a", { residency: () => a, protectedKeys: () => new Set() });
    budget.register("b", { residency: () => b, protectedKeys: () => new Set(["b-far-protected"]) });
    expect(budget.enforce(0)).toBe(80);
    expect(a.byKey.has("a-far")).toBe(false);
    expect(b.byKey.has("b-mid")).toBe(false);
    expect(b.byKey.has("b-far-protected")).toBe(true);
    expect(a.byKey.has("a-near")).toBe(true);
    expect(budget.residentBytes).toBe(80);
  });

  it("does nothing under budget, and forgets a member that unregisters", () => {
    const a = createResidency();
    insertTile(a, tile("x", 0, 10));
    const budget = new TraceMemoryBudget(100);
    const unregister = budget.register("a", { residency: () => a, protectedKeys: () => new Set() });
    expect(budget.enforce(0)).toBe(0);
    unregister();
    expect(budget.residentBytes).toBe(0);
  });
});
