import { describe, expect, it } from "vitest";
import {
  haloCoveredByPlan,
  haloStillWanted,
  initialFetchPhase,
  needsHaloRefine,
  planChargePhase,
} from "./twoPhase";

describe("two-phase bricks policy", () => {
  it("first fetch is core only when enabled AND there is a border to defer", () => {
    expect(initialFetchPhase({ enabled: true, border: 1 })).toBe("core");
    expect(initialFetchPhase({ enabled: true, border: 0 })).toBe("full"); // 2D bricks
    expect(initialFetchPhase({ enabled: false, border: 1 })).toBe("full"); // kill switch
  });

  it("only a non-uniform core upload schedules a halo refine", () => {
    expect(needsHaloRefine({ phase: "core", uniform: false })).toBe(true);
    expect(needsHaloRefine({ phase: "core", uniform: true })).toBe(false);
    expect(needsHaloRefine({ phase: "full", uniform: false })).toBe(false);
  });

  it("a queued halo is dispatched only for a planned, resident, still-provisional key", () => {
    const base = { planned: true, resident: true, provisional: true, inFlight: false, queued: false };
    expect(haloStillWanted(base)).toBe(true);
    expect(haloStillWanted({ ...base, planned: false })).toBe(false); // left the plan
    expect(haloStillWanted({ ...base, resident: false })).toBe(false); // evicted
    expect(haloStillWanted({ ...base, provisional: false })).toBe(false); // already refined
    expect(haloStillWanted({ ...base, inFlight: true })).toBe(false);
    expect(haloStillWanted({ ...base, queued: true })).toBe(false);
  });
});

describe("haloCoveredByPlan", () => {
  const grid: [number, number, number] = [4, 4, 4];
  const planned = (keys: string[]) => {
    const set = new Set(keys);
    return (key: string) => set.has(key);
  };
  const neighbours = (level: number, [x, y, z]: [number, number, number]) => {
    const keys: string[] = [];
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          keys.push(`${level}:${x + dx}:${y + dy}:${z + dz}`);
        }
    return keys;
  };

  it("is covered when all 26 neighbours are planned", () => {
    expect(haloCoveredByPlan(2, [1, 1, 1], grid, planned(neighbours(2, [1, 1, 1])))).toBe(true);
  });

  it("is not covered when one neighbour is out of plan — a LOD or frustum edge", () => {
    const all = neighbours(2, [1, 1, 1]);
    for (let missing = 0; missing < all.length; missing++) {
      const keys = all.filter((_, i) => i !== missing);
      expect(haloCoveredByPlan(2, [1, 1, 1], grid, planned(keys))).toBe(false);
    }
  });

  it("does not ask for neighbours outside the level's brick grid", () => {
    // A corner brick has 7 in-grid neighbours.
    const inGrid = neighbours(0, [0, 0, 0]).filter((key) =>
      key.split(":").slice(1).every((c) => Number(c) >= 0),
    );
    expect(inGrid).toHaveLength(7);
    expect(haloCoveredByPlan(0, [0, 0, 0], grid, planned(inGrid))).toBe(true);
    // The whole level is one brick: nothing to wait for.
    expect(haloCoveredByPlan(5, [0, 0, 0], [1, 1, 1], () => false)).toBe(true);
  });

  it("a neighbour planned on ANOTHER level does not count", () => {
    const coarser = neighbours(3, [1, 1, 1]);
    expect(haloCoveredByPlan(2, [1, 1, 1], grid, planned(coarser))).toBe(false);
  });
});

describe("planChargePhase", () => {
  it("charges what the first fetch requests", () => {
    expect(planChargePhase(1)).toBe("core");
    // No border (2D): there is no halo to defer, the fetch is full.
    expect(planChargePhase(0)).toBe("full");
  });
});
