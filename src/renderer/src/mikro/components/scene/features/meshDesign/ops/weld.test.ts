import { describe, expect, it } from "vitest";

import { weldIndexed, weldSoup } from "./weld";

/**
 * Two triangles sharing an edge, as marching tets emits them: a soup of six
 * corners, of which only four are distinct points.
 */
const SHARED_EDGE = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 1, 0,
  1, 0, 0, 0, 1, 0, 1, 1, 0,
]);

describe("weldSoup", () => {
  it("welds the shared corners and keeps both triangles", () => {
    const { positions, indices } = weldSoup(SHARED_EDGE);
    expect([...positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    expect([...indices]).toEqual([0, 1, 2, 1, 2, 3]);
  });

  it("welds corners that agree only to within float noise", () => {
    const noisy = new Float32Array([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
      1 + 1e-9, 0, 0, 0, 1, 1e-9, 1, 1, 0,
    ]);
    expect(weldSoup(noisy).positions).toHaveLength(12);
  });

  it("drops a degenerate triangle rather than storing it", () => {
    const degenerate = new Float32Array([
      0, 0, 0, 1, 0, 0, 1, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ]);
    expect([...weldSoup(degenerate).indices]).toEqual([0, 1, 2]);
  });

  it("has nothing to say about an empty surface", () => {
    const empty = weldSoup(new Float32Array([]));
    expect(empty.positions).toHaveLength(0);
    expect(empty.indices).toHaveLength(0);
  });
});

describe("weldIndexed", () => {
  it("merges duplicated border vertices across cell pieces", () => {
    // Two cells each carrying their copy of the shared edge (1,0,0)-(0,1,0).
    const positions = new Float32Array([
      0, 0, 0, 1, 0, 0, 0, 1, 0, // piece A
      1, 0, 0, 0, 1, 0, 1, 1, 0, // piece B
    ]);
    const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const welded = weldIndexed({ positions, indices });
    expect(welded.positions).toHaveLength(12);
    expect([...welded.indices]).toEqual([0, 1, 2, 1, 2, 3]);
  });
});
