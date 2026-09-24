import { describe, expect, it } from "vitest";

import type { Plane } from "./rgbPlanes";
import {
  NEUTRAL,
  autoGains,
  gainsForNeutral,
  gainsFromTemperatureTint,
  isNeutral,
  normalizeGains,
  readGains,
  storedGains,
  temperatureTintFromGains,
  windowed,
} from "./whiteBalance";

const plane = (index: number, p99: number | null): Plane => ({
  index,
  label: null,
  display: `plane ${index}`,
  histogram:
    p99 === null ? null : { bins: [0, 1], histogram: [1], min: 0, max: 255, p1: 0, p99 },
});

describe("readGains / storedGains", () => {
  it("reads null, short, non-positive and non-finite values as neutral", () => {
    expect(readGains(null)).toEqual(NEUTRAL);
    expect(readGains([1, 2])).toEqual(NEUTRAL);
    expect(readGains([1, 0, 1])).toEqual(NEUTRAL);
    expect(readGains([1, Number.NaN, 1])).toEqual(NEUTRAL);
  });

  it("keeps a valid balance, capped at the server bound", () => {
    expect(readGains([0.5, 1, 40])).toEqual([0.5, 1, 16]);
  });

  it("stores neutral as null so a reset reads back as untouched", () => {
    expect(storedGains(NEUTRAL)).toBeNull();
    expect(storedGains([1, 0.5, 0.25])).toEqual([1, 0.5, 0.25]);
  });
});

describe("normalizeGains", () => {
  it("scales the largest gain to 1", () => {
    expect(normalizeGains([2, 1, 0.5])).toEqual([1, 0.5, 0.25]);
  });
});

describe("gainsForNeutral", () => {
  it("makes the picked pixel grey", () => {
    const values = [0.8, 0.4, 0.2];
    const gains = gainsForNeutral(values)!;
    const out = values.map((v, k) => v * gains[k]);
    expect(out[0]).toBeCloseTo(out[1]);
    expect(out[1]).toBeCloseTo(out[2]);
    expect(Math.max(...gains)).toBe(1);
  });

  it("refuses a pixel with a black primary", () => {
    expect(gainsForNeutral([0.5, 0, 0.5])).toBeNull();
  });
});

describe("autoGains", () => {
  it("balances the planes' windowed p99 whites", () => {
    const gains = autoGains([plane(0, 250), plane(1, 200), plane(2, 150)], 0, 255)!;
    const whites = [250, 200, 150].map((p, k) => windowed(p, 0, 255) * gains[k]);
    expect(whites[0]).toBeCloseTo(whites[1]);
    expect(whites[1]).toBeCloseTo(whites[2]);
  });

  it("is null when a plane has no percentile", () => {
    expect(autoGains([plane(0, 250), plane(1, null), plane(2, 150)], 0, 255)).toBeNull();
  });
});

describe("temperature / tint", () => {
  it("neutral is (0, 0) both ways", () => {
    expect(isNeutral(gainsFromTemperatureTint({ temperature: 0, tint: 0 }))).toBe(true);
    const tt = temperatureTintFromGains(NEUTRAL);
    expect(tt.temperature).toBeCloseTo(0);
    expect(tt.tint).toBeCloseTo(0);
  });

  it("warm means more red than blue, magenta means less green", () => {
    const [r, g, b] = gainsFromTemperatureTint({ temperature: 0.5, tint: 0.5 });
    expect(r).toBeGreaterThan(b);
    expect(g).toBeLessThan(Math.max(r, b));
  });

  it.each([
    [0.3, -0.2],
    [-1, 1],
    [0.75, 0.4],
    [0, -0.6],
  ])("round-trips temperature %d / tint %d", (temperature, tint) => {
    const back = temperatureTintFromGains(gainsFromTemperatureTint({ temperature, tint }));
    expect(back.temperature).toBeCloseTo(temperature);
    expect(back.tint).toBeCloseTo(tint);
  });

  it("is invariant to the overall scale of the gains", () => {
    const a = temperatureTintFromGains([1, 0.5, 0.25]);
    const b = temperatureTintFromGains([4, 2, 1]);
    expect(a.temperature).toBeCloseTo(b.temperature);
    expect(a.tint).toBeCloseTo(b.tint);
  });
});
