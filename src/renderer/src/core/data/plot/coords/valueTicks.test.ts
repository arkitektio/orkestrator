import { describe, expect, it } from "vitest";
import { MIN_BAND_PX, valueTicks } from "./valueTicks";

const isNice = (step: number): boolean => {
  const exponent = Math.floor(Math.log10(step));
  const fraction = Number((step / 10 ** exponent).toPrecision(6));
  return fraction === 1 || fraction === 2 || fraction === 5;
};

describe("valueTicks", () => {
  it("lands on nice steps", () => {
    const ticks = valueTicks({ lo: -73.2, hi: 41.9 }, 300);
    expect(ticks.length).toBeGreaterThan(1);
    const step = ticks[1].value - ticks[0].value;
    expect(isNice(step)).toBe(true);
  });

  it("keeps every tick inside the clim", () => {
    const clim = { lo: -73.2, hi: 41.9 };
    for (const tick of valueTicks(clim, 300)) {
      expect(tick.value).toBeGreaterThanOrEqual(clim.lo);
      expect(tick.value).toBeLessThanOrEqual(clim.hi);
    }
  });

  it("holds density roughly at the target spacing", () => {
    // Nice steps quantise, so the count can only be checked within a factor.
    for (const height of [80, 200, 600]) {
      const ticks = valueTicks({ lo: 0, hi: 1 }, height, 50);
      const ideal = height / 50;
      expect(ticks.length).toBeGreaterThanOrEqual(ideal / 3);
      expect(ticks.length).toBeLessThanOrEqual(ideal * 3 + 1);
    }
  });

  it("gives a short band no ticks at all rather than crowding it", () => {
    expect(valueTicks({ lo: 0, hi: 1 }, MIN_BAND_PX - 1)).toEqual([]);
    expect(valueTicks({ lo: 0, hi: 1 }, 0)).toEqual([]);
  });

  it("gives a flat or inverted clim no ticks", () => {
    expect(valueTicks({ lo: 5, hi: 5 }, 300)).toEqual([]);
    expect(valueTicks({ lo: 5, hi: 1 }, 300)).toEqual([]);
    expect(valueTicks({ lo: NaN, hi: 1 }, 300)).toEqual([]);
  });

  it("labels without float noise", () => {
    for (const tick of valueTicks({ lo: 0, hi: 1 }, 300)) {
      expect(tick.label).not.toMatch(/0000|9999/);
    }
  });

  it("shows enough decimals for a tiny span", () => {
    const ticks = valueTicks({ lo: 0, hi: 0.004 }, 300);
    expect(ticks.length).toBeGreaterThan(1);
    expect(new Set(ticks.map((t) => t.label)).size).toBe(ticks.length);
  });
});
