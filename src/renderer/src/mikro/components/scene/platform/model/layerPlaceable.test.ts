import { describe, expect, it } from "vitest";

import { isPlaceable, unplaceableReason } from "./placeable";

/**
 * `asAffine` is the only placement authority: a layer without one is not
 * drawn, whatever its `pathToWorld` says (COORDINATE_SYSTEMS.md §1 R1). These
 * pin the predicate `LayerRenderer` gates on and the reason the panel shows.
 */
describe("isPlaceable / unplaceableReason", () => {
  const AFFINE = { matrix: [[1, 0, 0]], inputAxes: ["x"], outputAxes: ["x"], total: true };

  it("is placeable exactly when the server composed an asAffine", () => {
    expect(isPlaceable({ asAffine: AFFINE })).toBe(true);
    expect(isPlaceable({ asAffine: null })).toBe(false);
    expect(isPlaceable({})).toBe(false);
  });

  it("reports why — unregistered (no path) vs uncomposable (path, no map)", () => {
    expect(unplaceableReason({ asAffine: AFFINE, pathToWorld: [] })).toBeNull();
    expect(unplaceableReason({ asAffine: null, pathToWorld: null })).toBe("unregistered");
    expect(unplaceableReason({ asAffine: null })).toBe("unregistered");
    expect(unplaceableReason({ asAffine: null, pathToWorld: [{}] })).toBe("uncomposable");
    // An empty path (source IS world) composes to an identity asAffine on the
    // server; a null one there is still "the server did not compose it".
    expect(unplaceableReason({ asAffine: null, pathToWorld: [] })).toBe("uncomposable");
  });

  it("draws a lookup along time; a lookup along a rendered axis or a warp is placed, not drawable yet", () => {
    const lookup = { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, component: null, scale: 1, offset: 0 };
    const timed = { ...AFFINE, fields: [lookup] };
    const unevenZ = { ...AFFINE, fields: [{ ...lookup, inputAxis: "z", outputAxis: "z" }] };
    const warp = { ...AFFINE, fields: [{ outputAxis: "z", inputAxis: null, innerScale: null, innerOffset: null, component: 0, scale: 1, offset: 0 }] };
    const axes = { renderAxes: { x: "x", y: "y", z: "z" } };

    expect(isPlaceable({ ...axes, asAffine: timed })).toBe(true);
    expect(isPlaceable({ ...axes, asAffine: unevenZ })).toBe(false);
    expect(unplaceableReason({ ...axes, asAffine: unevenZ, pathToWorld: [{}] })).toBe("field");
    expect(isPlaceable({ ...axes, asAffine: warp })).toBe(false);
    expect(unplaceableReason({ ...axes, asAffine: warp, pathToWorld: [{}] })).toBe("field");
    // A normalized LayerState names its axes directly.
    expect(isPlaceable({ zAxis: "z", asAffine: unevenZ })).toBe(false);
  });
});
