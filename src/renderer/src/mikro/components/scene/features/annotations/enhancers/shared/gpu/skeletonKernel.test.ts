import { describe, expect, it } from "vitest";

import {
  INF_COST,
  SKELETON_BASE_COST,
} from "../corridorCost";
import { NEIGHBOUR_OFFSETS } from "../geodesicReference";
import {
  COST_PARAMS_BYTES,
  RELAX_ITERS_PER_SUBMIT,
  RELAX_PARAMS_BYTES,
  SKELETON_COST_WGSL,
  SKELETON_RELAX_WGSL,
  SKELETON_SMOOTH_WGSL,
  SKELETON_TUBE_WGSL,
  tubeWgslFor,
  SMOOTH_PARAMS_BYTES,
  TUBE_PARAMS_BYTES,
  packCostParams,
  packRelaxParams,
  packSmoothParams,
  packStrokePoints,
  packTubeParams,
  skeletonWorkgroups,
  tubeWorkgroups,
} from "./skeletonKernel";

describe("kernel sources", () => {
  it("embeds all 26 neighbour offsets in the reference order", () => {
    // The relax kernel's OFFSETS array is generated from
    // geodesicReference.NEIGHBOUR_OFFSETS — the first and last entries pin
    // the order, the count pins completeness.
    expect(NEIGHBOUR_OFFSETS).toHaveLength(26);
    const [fx, fy, fz] = NEIGHBOUR_OFFSETS[0];
    const [lx, ly, lz] = NEIGHBOUR_OFFSETS[25];
    expect(SKELETON_RELAX_WGSL).toContain(`array<vec3<i32>, 26>`);
    expect(SKELETON_RELAX_WGSL).toContain(`vec3<i32>(${fx}, ${fy}, ${fz})`);
    expect(SKELETON_RELAX_WGSL).toContain(`vec3<i32>(${lx}, ${ly}, ${lz})`);
  });

  it("keeps the relax batch even so a batch always ends in the A buffers", () => {
    expect(RELAX_ITERS_PER_SUBMIT % 2).toBe(0);
  });

  it("declares both entry points", () => {
    expect(SKELETON_COST_WGSL).toContain("fn main(");
    expect(SKELETON_RELAX_WGSL).toContain("fn main(");
  });
});

describe("packCostParams", () => {
  const input = {
    boxOrigin: [-1, 2, 3] as const,
    boxSize: [10, 11, 12] as const,
    strokeCount: 7,
    channel: 2,
    pageOffset: [0, 0, 40] as const,
    payload: [64, 64, 32] as const,
    border: 1 as const,
    storedZ: 34,
    slotSize: [66, 66, 136] as const,
    spacing: [1, 1, 4] as const,
    radiusWorld: 5,
    minValue: 100,
    range: 900,
    dataScale: 65535,
    emptyCeiling: 255,
    poolMin: 50,
    poolRange: 2000,
    weights: { intensity: 1.5, exponent: 2 },
  };

  it("packs the struct at the declared size with fields where WGSL reads them", () => {
    const packed = packCostParams(input);
    expect(packed.byteLength).toBe(COST_PARAMS_BYTES);
    const i32 = new Int32Array(packed);
    const u32 = new Uint32Array(packed);
    const f32 = new Float32Array(packed);
    expect([i32[0], i32[1], i32[2]]).toEqual([-1, 2, 3]); // box_origin (signed)
    expect(u32[3]).toBe(7); // stroke_count
    expect([u32[4], u32[5], u32[6]]).toEqual([10, 11, 12]); // box_size
    expect(u32[7]).toBe(2); // channel
    expect(i32[10]).toBe(40); // page_offset.z
    expect(u32[11]).toBe(1); // border
    expect([u32[12], u32[13], u32[14]]).toEqual([64, 64, 32]); // payload
    expect(u32[15]).toBe(34); // stored_z
    expect([u32[16], u32[17], u32[18]]).toEqual([66, 66, 136]); // slot_size
    expect(f32[23]).toBe(5); // radius
    expect(f32[24]).toBe(100); // min_value
    expect(f32[25]).toBe(900); // range
    expect(f32[26]).toBe(65535); // data_scale
    expect(f32[27]).toBe(255); // empty_ceiling
    expect(f32[28]).toBeCloseTo(1.5); // w_intensity
    expect(f32[30]).toBeCloseTo(SKELETON_BASE_COST); // base_cost
    expect(f32[31]).toBe(Math.fround(INF_COST)); // inf_cost survives f32
    expect(f32[32]).toBe(50); // pool_min (EMPTY decode range ≠ window)
    expect(f32[33]).toBe(2000); // pool_range
    expect(f32[34]).toBe(-1); // binary_tau defaults to disabled
  });

  it("packs the binary connectivity mode when asked", () => {
    const packed = packCostParams({ ...input, binaryTau: 0.47 });
    expect(new Float32Array(packed)[34]).toBeCloseTo(0.47);
  });
});

describe("packRelaxParams", () => {
  it("packs size and spacing with the INF sentinel", () => {
    const packed = packRelaxParams([4, 5, 6], [1, 2, 3]);
    expect(packed.byteLength).toBe(RELAX_PARAMS_BYTES);
    const u32 = new Uint32Array(packed);
    const f32 = new Float32Array(packed);
    expect([u32[0], u32[1], u32[2]]).toEqual([4, 5, 6]);
    expect([f32[4], f32[5], f32[6]]).toEqual([1, 2, 3]);
    expect(f32[7]).toBe(Math.fround(INF_COST));
  });
});

describe("packStrokePoints", () => {
  it("lays points out as vec4 with a zero w", () => {
    const packed = packStrokePoints([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(Array.from(packed)).toEqual([1, 2, 3, 0, 4, 5, 6, 0]);
  });

  it("never produces a zero-sized buffer", () => {
    expect(packStrokePoints([]).length).toBe(4);
  });
});

describe("skeletonWorkgroups", () => {
  it("rounds each axis up to the workgroup size", () => {
    expect(skeletonWorkgroups([1, 4, 9])).toEqual([1, 1, 3]);
  });
});

describe("tube kernel", () => {
  it("embeds the generated case table of each marcher", () => {
    const tets = tubeWgslFor("tets");
    expect(tets).toContain("TET_TRI_OFFSETS = array<u32, 97>");
    expect(tets).toContain("TET_MASK_CORNERS = array<u32, 24>");
    expect(tets).toContain("fn main(");
    const cubes = tubeWgslFor("cubes");
    expect(cubes).toContain("MC_TRI_OFFSETS = array<u32, 257>");
    expect(cubes).toContain("emit_triangle(MC_TRI_EDGES[e]");
    expect(SKELETON_TUBE_WGSL).toBe(cubes); // the default marcher
  });

  it("never declares a WGSL reserved word as an identifier", () => {
    // WGSL reserves many plain-English words ("from", "to", "of", "with",
    // …) — Tint rejects the whole module at CreateShaderModule. Bit us once
    // with `let from = …`; a vitest failure beats a runtime pipeline latch.
    const reserved = ["from", "to", "of", "with", "await", "async", "do", "new"];
    for (const source of [
      SKELETON_COST_WGSL,
      SKELETON_RELAX_WGSL,
      SKELETON_TUBE_WGSL,
      SKELETON_SMOOTH_WGSL,
    ]) {
      for (const word of reserved) {
        expect(source).not.toMatch(new RegExp(`\\b(let|var|const)\\s+${word}\\b`));
        expect(source).not.toMatch(new RegExp(`\\bfor\\s*\\(\\s*var\\s+${word}\\b`));
      }
    }
  });

  it("packs TubeParams at the declared size, fields where WGSL reads them", () => {
    const packed = packTubeParams({
      boxOrigin: [-2, 1, 0],
      boxSize: [10, 20, 30],
      capacity: 999,
      iso: 0.75,
      clampValue: 1.5,
    });
    expect(packed.byteLength).toBe(TUBE_PARAMS_BYTES);
    const i32 = new Int32Array(packed);
    const u32 = new Uint32Array(packed);
    const f32 = new Float32Array(packed);
    expect([i32[0], i32[1], i32[2]]).toEqual([-2, 1, 0]);
    expect(u32[3]).toBe(999);
    expect([u32[4], u32[5], u32[6]]).toEqual([10, 20, 30]);
    expect(f32[8]).toBe(0.75);
    expect(f32[9]).toBe(1.5);
    expect(f32[10]).toBe(-1); // gap_limit defaults to disabled
  });

  it("packs the Gap limit and binds the connectivity distances", () => {
    const packed = packTubeParams({
      boxOrigin: [0, 0, 0],
      boxSize: [1, 1, 1],
      capacity: 3,
      iso: 0.5,
      clampValue: 1,
      gapLimit: 2.5,
    });
    expect(new Float32Array(packed)[10]).toBe(2.5);
    expect(SKELETON_TUBE_WGSL).toContain("connect_dist");
  });

  it("dispatches over the CELL grid — one less than the voxel grid", () => {
    expect(tubeWorkgroups([5, 9, 1])).toEqual([1, 2, 1]);
  });
});

describe("smooth kernel", () => {
  it("packs SmoothParams at the declared size, fields where WGSL reads them", () => {
    const packed = packSmoothParams({
      boxSize: [10, 20, 30],
      axis: 2,
      radius: 3,
      clampValue: 0.75,
    });
    expect(packed.byteLength).toBe(SMOOTH_PARAMS_BYTES);
    const u32 = new Uint32Array(packed);
    const i32 = new Int32Array(packed);
    const f32 = new Float32Array(packed);
    expect([u32[0], u32[1], u32[2]]).toEqual([10, 20, 30]);
    expect(u32[3]).toBe(2); // axis
    expect(i32[4]).toBe(3); // radius
    expect(f32[5]).toBe(0.75); // clamp_value
  });

  it("floors fractional radii and never packs zero", () => {
    const packed = packSmoothParams({
      boxSize: [1, 1, 1],
      axis: 0,
      radius: 0.4,
      clampValue: 1,
    });
    expect(new Int32Array(packed)[4]).toBe(1);
  });
});
