import { describe, expect, it } from "vitest";

import type { Vec3 } from "../../field/stamps";
import { fitBall, symmetricEigen3 } from "./moments";
import type { IntensitySampler } from "./radialProfile";

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
};

/** 1 inside the ellipsoid with the given unit axes and semi-axes, else 0. */
const solidEllipsoid =
  (center: Vec3, axes: readonly Vec3[], radii: Vec3): IntensitySampler =>
  (x, y, z) => {
    const d: Vec3 = [x - center[0], y - center[1], z - center[2]];
    let k = 0;
    for (let i = 0; i < 3; i++) {
      const along = d[0] * axes[i][0] + d[1] * axes[i][1] + d[2] * axes[i][2];
      k += (along / radii[i]) ** 2;
    }
    return k <= 1 ? 1 : 0;
  };

const options = { cell: 0.5, threshold: 0.5, maxRadius: 40, shape: "ellipsoid" as const, scale: 1 };

describe("symmetricEigen3", () => {
  it("diagonalizes a rotated covariance", async () => {
    // diag(9, 4, 1) rotated 30° about z.
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const xx = 9 * c * c + 4 * s * s;
    const yy = 9 * s * s + 4 * c * c;
    const xy = (9 - 4) * c * s;
    const { values, vectors } = symmetricEigen3([xx, xy, 0, yy, 0, 1]);
    expect([...values].sort((a, b) => a - b).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 4, 9]);
    const major = vectors[values.indexOf(Math.max(...values))];
    expect(Math.abs(major[0] * c + major[1] * s)).toBeCloseTo(1, 6);
  });
});

describe("fitBall", () => {
  it("recovers a sphere's centre and radius", async () => {
    const axes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const fit = (await fitBall([10, 10, 10], solidEllipsoid([10.5, 9.5, 10], axes, [5, 5, 5]), options))!;
    expect(fit.closed).toBe(true);
    for (let a = 0; a < 3; a++) expect(fit.radii[a]).toBeCloseTo(5, 0);
    expect(fit.center[0]).toBeCloseTo(10.5, 0);
    expect(fit.center[1]).toBeCloseTo(9.5, 0);
  });

  it("recovers a rotated ellipsoid's axes and semi-axes, clicked off-centre", async () => {
    const major = normalize([1, 1, 0]);
    const minor = normalize([-1, 1, 0]);
    const axes: Vec3[] = [major, minor, [0, 0, 1]];
    const fit = (await fitBall([2, 1, 0], solidEllipsoid([0, 0, 0], axes, [8, 4, 3]), options))!;
    expect(fit.closed).toBe(true);
    const order = [0, 1, 2].sort((a, b) => fit.radii[b] - fit.radii[a]);
    expect(fit.radii[order[0]]).toBeCloseTo(8, 0);
    expect(fit.radii[order[1]]).toBeCloseTo(4, 0);
    expect(fit.radii[order[2]]).toBeCloseTo(3, 0);
    const fitted = fit.axes[order[0]];
    expect(Math.abs(fitted[0] * major[0] + fitted[1] * major[1] + fitted[2] * major[2])).toBeGreaterThan(0.99);
    for (let a = 0; a < 3; a++) expect(fit.center[a]).toBeCloseTo(0, 0);
  });

  it("the sphere shape keeps the ellipsoid's volume; scale multiplies", async () => {
    const axes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const sample = solidEllipsoid([0, 0, 0], axes, [8, 4, 2]);
    const sphere = (await fitBall([0, 0, 0], sample, { ...options, shape: "sphere" }))!;
    expect(sphere.radii[0]).toBe(sphere.radii[1]);
    expect(sphere.radii[0]).toBeCloseTo(Math.cbrt(8 * 4 * 2), 0);
    const scaled = (await fitBall([0, 0, 0], sample, { ...options, shape: "sphere", scale: 1.5 }))!;
    expect(scaled.radii[0]).toBeCloseTo(sphere.radii[0] * 1.5, 6);
  });

  it("keeps to the object the click is connected to", async () => {
    const axes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const near = solidEllipsoid([0, 0, 0], axes, [4, 4, 4]);
    const far = solidEllipsoid([12, 0, 0], axes, [4, 4, 4]);
    const fit = (await fitBall([0, 0, 0], (x, y, z) => Math.max(near(x, y, z)!, far(x, y, z)!), options))!;
    expect(fit.center[0]).toBeCloseTo(0, 0);
    expect(fit.radii[0]).toBeCloseTo(4, 0);
  });

  it("settles a click that lands a voxel outside the object", async () => {
    const axes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const fit = await fitBall([4.6, 0, 0], solidEllipsoid([0, 0, 0], axes, [4, 4, 4]), options);
    expect(fit).not.toBeNull();
    expect(fit!.center[0]).toBeCloseTo(0, 0);
  });

  it("answers null on darkness and reports an object it could not close", async () => {
    expect(await fitBall([0, 0, 0], () => 0, options)).toBeNull();
    expect(await fitBall([0, 0, 0], () => null, options)).toBeNull();
    const everywhere = (await fitBall([0, 0, 0], () => 1, { ...options, maxRadius: 6 }))!;
    expect(everywhere.closed).toBe(false);
  });
});
