import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  chooseTraceLevel,
  extractTraceValues,
  layerLocalToVoxel,
  planTraceBox,
  traceNodeOf,
  traceVoxelOf,
  voxelToLayerLocal,
  type TraceBox,
} from "./traceBox";

const SHAPE: [number, number, number] = [512, 512, 64];
/** Anisotropic: 4x longer voxels through depth, the usual microscopy shape. */
const VOXEL: [number, number, number] = [1, 1, 4];

/** An isotropically-coarsening pyramid, five levels deep. */
const ISOTROPIC: [number, number, number][] = [
  [1, 1, 1],
  [2, 2, 2],
  [4, 4, 4],
  [8, 8, 8],
  [16, 16, 16],
];

/** xy-only coarsening — z is already the coarse axis and stays put. */
const XY_ONLY: [number, number, number][] = [
  [1, 1, 1],
  [2, 2, 1],
  [4, 4, 1],
];

const plan = (
  start: [number, number, number],
  goal: [number, number, number],
  overrides = {},
) =>
  planTraceBox({
    start,
    goal,
    shape: SHAPE,
    voxelSize: VOXEL,
    levelSteps: ISOTROPIC,
    ...overrides,
  });

describe("chooseTraceLevel", () => {
  it("stays at the finest level when the box already fits", () => {
    expect(chooseTraceLevel([10, 10, 10], ISOTROPIC, 512_000)).toBe(0);
  });

  it("coarsens until the node count fits", () => {
    // 200³ = 8M nodes; level 1 → 100³ = 1M; level 2 → 50³ = 125k.
    expect(chooseTraceLevel([200, 200, 200], ISOTROPIC, 512_000)).toBe(2);
  });

  it("walks the real pyramid, not 8x a level", () => {
    // xy-only: each level divides the count by 4, not 8. 200³ = 8M →
    // level 1 = 2M → level 2 = 500k.
    expect(chooseTraceLevel([200, 200, 200], XY_ONLY, 512_000)).toBe(2);
  });

  it("falls back to the coarsest level rather than refusing to trace", () => {
    expect(chooseTraceLevel([4000, 4000, 4000], XY_ONLY, 1000)).toBe(2);
  });
});

describe("planTraceBox", () => {
  it("spans the waypoints with room to bow around an obstacle", () => {
    const box = plan([100, 100, 10], [140, 100, 10]);
    // 40-voxel hop → 30% margin = 12 voxels of pad on each side in x.
    expect(box.origin[0]).toBe(88);
    expect(box.origin[0] + (box.size[0] - 1) * box.step[0]).toBeGreaterThanOrEqual(152);
    // No extent in y, so the minimum pad applies instead of a proportional one.
    expect(box.origin[1]).toBe(96);
  });

  it("pads by a PHYSICAL distance, not by a voxel count", () => {
    // 4x longer voxels in z, so the same room costs a quarter of the slices:
    // 4 voxels of pad in x and y, 1 in z.
    const box = plan([100, 100, 10], [100, 100, 10]);
    expect(box.origin[0]).toBe(96);
    expect(box.origin[1]).toBe(96);
    expect(box.origin[2]).toBe(9);
    // Isotropic data pads equally on every axis.
    const isotropic = plan([100, 100, 10], [100, 100, 10], { voxelSize: [1, 1, 1] });
    expect(isotropic.origin).toEqual([96, 96, 6]);
  });

  it("clamps to the layer rather than walking off it", () => {
    const box = plan([2, 2, 1], [6, 6, 2]);
    expect(box.origin).toEqual([0, 0, 0]);
    const far = plan([508, 508, 62], [511, 511, 63]);
    expect(far.origin[0] + (far.size[0] - 1) * far.step[0]).toBeLessThanOrEqual(511);
    expect(far.origin[2] + (far.size[2] - 1) * far.step[2]).toBeLessThanOrEqual(63);
  });

  it("coarsens a long hop and scales the spacing with it", () => {
    const box = plan([0, 0, 0], [511, 511, 63], { maxNodes: 40_000 });
    expect(box.level).toBeGreaterThan(0);
    expect(box.step).toEqual(ISOTROPIC[box.level]);
    expect(box.size[0] * box.size[1] * box.size[2]).toBeLessThanOrEqual(40_000);
    // Spacing is per NODE step, so it carries both the voxel size and the level.
    expect(box.spacing[2]).toBe(VOXEL[2] * box.step[2]);
  });

  it("keeps z at full resolution when the pyramid never coarsened it", () => {
    const box = plan([0, 0, 0], [511, 511, 63], {
      levelSteps: XY_ONLY,
      maxNodes: 200_000,
    });
    expect(box.step).toEqual([4, 4, 1]);
    // Every z slice of the span is still a node — none are stepped over.
    expect(box.size[2]).toBe(64);
    // And the search's step lengths follow: 4x coarser in xy, unchanged in z.
    expect(box.spacing).toEqual([4, 4, 4]);
  });

  it("keeps a degenerate 2D layer one node deep", () => {
    const box = planTraceBox({
      start: [10, 10, 0],
      goal: [40, 40, 0],
      shape: [256, 256, 1],
      voxelSize: [1, 1, 1],
      levelSteps: ISOTROPIC,
    });
    expect(box.size[2]).toBe(1);
    expect(box.origin[2]).toBe(0);
  });

  it("does not reach past the drawn slice when flattened", () => {
    const box = plan([100, 100, 10], [140, 140, 10], { flatten: true });
    expect(box.origin[2]).toBe(10);
    expect(box.size[2]).toBe(1);
    // A hop that really does straddle slices still spans them.
    const scrubbed = plan([100, 100, 10], [140, 140, 12], { flatten: true });
    expect(scrubbed.origin[2]).toBe(10);
    expect(scrubbed.size[2]).toBeGreaterThan(1);
  });
});

describe("node ↔ voxel", () => {
  const box: TraceBox = {
    origin: [100, 200, 8],
    size: [10, 10, 4],
    level: 1,
    step: [2, 2, 1],
    spacing: [2, 2, 4],
  };

  it("round-trips a voxel that lands on the node grid", () => {
    expect(traceVoxelOf(box, traceNodeOf(box, [104, 206, 11]))).toEqual([104, 206, 11]);
  });

  it("steps each axis by its OWN factor", () => {
    // z steps by 1 here: the pyramid never coarsened it.
    expect(traceVoxelOf(box, [1, 1, 1])).toEqual([102, 202, 9]);
    expect(traceVoxelOf(box, [3, 0, 3])).toEqual([106, 200, 11]);
  });

  it("snaps a voxel between nodes to the nearest one", () => {
    expect(traceNodeOf(box, [105, 200, 8])).toEqual([3, 0, 0]); // 2.5 → 3
  });

  it("clamps a waypoint outside the box instead of indexing off the end", () => {
    expect(traceNodeOf(box, [1000, -50, 8])).toEqual([9, 0, 0]);
  });
});

describe("extractTraceValues", () => {
  const box: TraceBox = {
    origin: [10, 20, 2],
    size: [3, 2, 2],
    level: 1,
    step: [2, 2, 2],
    spacing: [2, 2, 2],
  };

  it("reads one value per node, at that node's level-0 voxel", () => {
    const seen: [number, number, number][] = [];
    const values = extractTraceValues(box, (voxel) => {
      seen.push(voxel);
      return voxel[0];
    });
    expect(values).toHaveLength(12);
    expect(seen[0]).toEqual([10, 20, 2]);
    expect(seen[1]).toEqual([12, 20, 2]); // one node step = 2 voxels
    expect(seen[3]).toEqual([10, 22, 2]);
    expect(seen[6]).toEqual([10, 20, 4]);
    // x-fastest ordering, matching the cost field and the search.
    expect([...values.slice(0, 3)]).toEqual([10, 12, 14]);
  });

  it("marks unsampled voxels NaN rather than zero — zero is a real value", () => {
    const values = extractTraceValues(box, (voxel) => (voxel[0] === 12 ? null : 0));
    expect(Number.isNaN(values[1])).toBe(true);
    expect(values[0]).toBe(0);
  });
});

describe("voxelToLayerLocal", () => {
  it("is the voxel centre in the corner-anchored frame — no centering, no flip", () => {
    // A 4x4x4 layer: voxel (0,0,0)'s centre sits at (0.5, 0.5, 0.5).
    expect(voxelToLayerLocal([0, 0, 0], [4, 4, 4])).toEqual([0.5, 0.5, 0.5]);
    expect(voxelToLayerLocal([3, 3, 3], [4, 4, 4])).toEqual([3.5, 3.5, 3.5]);
  });

  it("round-trips the probe's voxel→normalized→voxel derivation", () => {
    // BrickVolumeLayer: voxelIndex[i] = floor((unitBoxLocal[i] + 0.5) * shape),
    // where unitBoxLocal = layerLocal/shape - 0.5 (the mesh is a unit box
    // offset by half its size).
    const shape: [number, number, number] = [8, 8, 8];
    for (const voxel of [0, 3, 7]) {
      const local = voxelToLayerLocal([voxel, voxel, voxel], shape);
      for (const axis of [0, 1, 2] as const) {
        const unitBoxLocal = local[axis] / shape[axis] - 0.5;
        expect(Math.floor((unitBoxLocal + 0.5) * shape[axis])).toBe(voxel);
      }
    }
  });
});

describe("layerLocalToVoxel", () => {
  const shape: [number, number, number] = [8, 8, 4];

  it("inverts voxelToLayerLocal exactly", () => {
    for (const voxel of [
      [0, 0, 0],
      [3, 5, 2],
      [7, 7, 3],
    ] as [number, number, number][]) {
      expect(layerLocalToVoxel(voxelToLayerLocal(voxel, shape), shape)).toEqual(voxel);
    }
  });

  it("rounds a point inside a voxel to that voxel", () => {
    const centre = voxelToLayerLocal([4, 4, 2], shape);
    const nudged: [number, number, number] = [
      centre[0] + 0.3,
      centre[1] - 0.3,
      centre[2] + 0.2,
    ];
    expect(layerLocalToVoxel(nudged, shape)).toEqual([4, 4, 2]);
  });

  it("returns null outside the layer rather than clamping onto its edge", () => {
    expect(layerLocalToVoxel([100, 2, 2], shape)).toBeNull();
    expect(layerLocalToVoxel([2, 2, -50], shape)).toBeNull();
    // Just past the last voxel's centre by more than half a voxel.
    expect(layerLocalToVoxel(voxelToLayerLocal([7, 0, 0], shape), shape)).not.toBeNull();
    expect(layerLocalToVoxel([shape[0] + 0.5, 2, 2], shape)).toBeNull();
  });
});
