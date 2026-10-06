import { describe, expect, it } from "vitest";

import type { Vec3 } from "../../field/stamps";
import { resamplePolyline } from "./polyline";
import { fitTube, type IntensitySampler } from "./radialProfile";

/** A straight tube along x with a soft edge: 1 inside, falling to 0 over `blur`. */
const softTube =
  (radius: (x: number) => number, axisY = 0, blur = 1): IntensitySampler =>
  (x, y, z) => {
    const d = Math.hypot(y - axisY, z);
    return Math.min(1, Math.max(0, 0.5 - (d - radius(x)) / blur));
  };

const line = (from: number, to: number, y = 0): Vec3[] =>
  resamplePolyline(
    [
      [from, y, 0],
      [to, y, 0],
    ],
    1,
  );

const options = { maxRadius: 12, step: 0.25, edge: 0.5, smooth: 0, scale: 1, minRadius: 0.25 };

describe("fitTube", () => {
  it("recovers a constant radius at the half-maximum edge", async () => {
    const fit = (await fitTube(line(0, 40), softTube(() => 4), options))!;
    expect(fit.unresolved).toBe(0);
    for (const radius of fit.radii) expect(radius).toBeCloseTo(4, 1);
  });

  it("follows a taper", async () => {
    const fit = (await fitTube(line(0, 40), softTube((x) => 2 + x / 10), options))!;
    expect(fit.radii[0]).toBeCloseTo(2, 0);
    expect(fit.radii.at(-1)!).toBeCloseTo(6, 0);
    expect(fit.radii.at(-1)!).toBeGreaterThan(fit.radii[0] + 3);
  });

  it("recentres a centerline that runs beside the axis", async () => {
    // The stations sit 1.5 off the tube's real axis (y = 1.5).
    const fit = (await fitTube(line(0, 40, 0), softTube(() => 4, 1.5), options))!;
    const middle = fit.centers[fit.centers.length >> 1];
    expect(middle[1]).toBeCloseTo(1.5, 0);
    expect(middle[2]).toBeCloseTo(0, 1);
    expect(fit.radii[fit.radii.length >> 1]).toBeCloseTo(4, 0);
  });

  it("applies scale and the minimum radius", async () => {
    const doubled = (await fitTube(line(0, 40), softTube(() => 4), { ...options, scale: 2 }))!;
    expect(doubled.radii[5]).toBeCloseTo(8, 1);
    const floored = (await fitTube(line(0, 40), softTube(() => 0.3), { ...options, minRadius: 1 }))!;
    for (const radius of floored.radii) expect(radius).toBeGreaterThanOrEqual(1);
  });

  it("borrows the radius across stations with unloaded data", async () => {
    const tube = softTube(() => 4);
    const holed: IntensitySampler = (x, y, z) => (x > 15 && x < 25 ? null : tube(x, y, z));
    const fit = (await fitTube(line(0, 40), holed, options))!;
    expect(fit.unresolved).toBeGreaterThan(0);
    for (const radius of fit.radii) expect(radius).toBeCloseTo(4, 1);
  });

  it("answers null when there is nothing to measure", async () => {
    expect(await fitTube(line(0, 40), () => null, options)).toBeNull();
    expect(await fitTube(line(0, 40), () => 0.3, options)).toBeNull(); // flat: no edge anywhere
  });

  it("smoothing evens out a noisy width without moving its mean", async () => {
    const noisy = softTube((x) => 4 + (Math.round(x) % 2 === 0 ? 0.8 : -0.8));
    const raw = (await fitTube(line(0, 40), noisy, options))!;
    const smooth = (await fitTube(line(0, 40), noisy, { ...options, smooth: 6 }))!;
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
    expect(spread(smooth.radii)).toBeLessThan(spread(raw.radii));
    const mean = smooth.radii.reduce((sum, r) => sum + r, 0) / smooth.radii.length;
    expect(mean).toBeCloseTo(4, 0);
  });
});
