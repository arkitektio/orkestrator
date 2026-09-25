import { describe, expect, it } from "vitest";
import { haloStillWanted, initialFetchPhase, needsHaloRefine } from "./twoPhase";

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
