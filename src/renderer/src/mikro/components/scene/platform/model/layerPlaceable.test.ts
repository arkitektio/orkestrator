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
});
