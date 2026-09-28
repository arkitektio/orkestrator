import { describe, expect, it } from "vitest";
import type { LayerState } from "../../../platform/model/layerModel";
import { resolveBrickSpec } from "./brickSpec";
import { buildLayerLevelGeometry, type LevelSource } from "../../../platform/coords/levelGeometry";
import { childrenOf, nodeKey, type VoxelBox } from "./nodeAddress";
import { nodeBaseBox } from "./nodeAddress";
import { aggregateIfComplete, parentCellsOf } from "./occupancyAggregate";

// Non-dyadic pyramid (the COORDINATE_SYSTEMS.md "planner nit" shape): the
// L1→L2 z ratio is 9/4 = 2.25, so an L1 brick can STRADDLE two L2 cells.
// Dim order [z, y, x]; payload resolves to 64³.
const LEVELS: LevelSource[] = [
  { shape: [2304, 256, 256], chunks: [64, 64, 64], dtype: "uint8", storeId: "a0" },
  { shape: [576, 128, 128], chunks: [64, 64, 64], dtype: "uint8", storeId: "a1", scaleFactors: [4, 2, 2] },
  { shape: [256, 64, 64], chunks: [64, 64, 64], dtype: "uint8", storeId: "a2", scaleFactors: [9, 4, 4] },
];
const layer = {
  id: "l",
  affineMatrix: null,
  xAxis: "x",
  yAxis: "y",
  zAxis: "z",
  intensityAxis: null,
  fixedLOD: null,
  lens: {
    slices: [],
    axisNames: ["z", "y", "x"],
    shape: [2304, 256, 256],
    dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
  },
} as unknown as LayerState;
const geo = buildLayerLevelGeometry(["z", "y", "x"], layer, LEVELS)!;
const spec = resolveBrickSpec(geo, "3D");

const boxesOverlap = (a: VoxelBox, b: VoxelBox): boolean =>
  a.min[0] < b.max[0] && b.min[0] < a.max[0] &&
  a.min[1] < b.max[1] && b.min[1] < a.max[1] &&
  a.min[2] < b.max[2] && b.min[2] < a.max[2];

describe("parentCellsOf", () => {
  it("finds BOTH parents of a straddling child on the 2.25× z ratio", () => {
    // L1 brick z=2 spans base z [512, 768]; L2 cell z extent is 576 base —
    // the child straddles cells z=0 and z=1.
    const parents = parentCellsOf(geo, spec, 1, [0, 0, 2]);
    const zs = parents.map((p) => p[2]).sort();
    expect(zs).toEqual([0, 1]);
  });

  it("is defined by childrenOf membership (the completeness contract)", () => {
    // Every returned parent must list the child; every overlapping parent
    // that lists the child must be returned.
    const child: [number, number, number] = [1, 1, 4];
    const parents = parentCellsOf(geo, spec, 1, child);
    expect(parents.length).toBeGreaterThan(0);
    for (const parent of parents) {
      const children = childrenOf(geo, spec, 2, parent);
      expect(
        children.some((c) => c[0] === child[0] && c[1] === child[1] && c[2] === child[2]),
      ).toBe(true);
    }
    // Cross-check via boxes: any parent whose base box overlaps the child's
    // base box is in the returned set.
    const childBox = nodeBaseBox(geo, spec, 1, child);
    for (const parent of parents) {
      expect(boxesOverlap(nodeBaseBox(geo, spec, 2, parent), childBox)).toBe(true);
    }
  });

  it("returns nothing above the coarsest level", () => {
    expect(parentCellsOf(geo, spec, geo.levels.length - 1, [0, 0, 0])).toEqual([]);
  });
});

describe("aggregateIfComplete", () => {
  const parent: [number, number, number] = [0, 0, 0];
  const children = childrenOf(geo, spec, 2, parent);

  it("stays null until EVERY child range is known (unknown ⇒ never hop)", () => {
    const measured = new Map<string, readonly [number, number]>();
    for (const child of children.slice(0, -1)) {
      measured.set(nodeKey(1, child), [10, 20]);
      expect(aggregateIfComplete(geo, spec, 2, parent, measured)).toBeNull();
    }
    measured.set(nodeKey(1, children[children.length - 1]), [5, 30]);
    expect(aggregateIfComplete(geo, spec, 2, parent, measured)).toEqual([5, 30]);
  });

  it("is the conservative union of the children (uniform bricks as [v, v])", () => {
    const measured = new Map<string, readonly [number, number]>();
    children.forEach((child, i) => {
      measured.set(nodeKey(1, child), i === 0 ? [7, 7] : [10 + i, 100 + i]);
    });
    const aggregate = aggregateIfComplete(geo, spec, 2, parent, measured)!;
    expect(aggregate[0]).toBe(7);
    expect(aggregate[1]).toBe(100 + children.length - 1);
    // Bounds every child from the outside.
    for (const child of children) {
      const range = measured.get(nodeKey(1, child))!;
      expect(aggregate[0]).toBeLessThanOrEqual(range[0]);
      expect(aggregate[1]).toBeGreaterThanOrEqual(range[1]);
    }
  });
});
