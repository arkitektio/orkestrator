import { describe, expect, it } from "vitest";
import { resolveBrickSpec } from "./brickSpec";
import { buildLayerLevelGeometry, type LevelSource } from "../../../platform/coords/levelGeometry";
import { assessPoolViability } from "./poolViability";
import type { LayerState } from "../../../platform/model/layerModel";

/**
 * P18 guard: viability = "can the coarsest level's pinned atlas floor fit the
 * GPU budget". In the node test environment `navigator` is undefined, so the
 * cap is the 512 MB default budget — expectations below assume that.
 */

const LAYER = {
  xAxis: "x",
  yAxis: "y",
  zAxis: "z",
  intensityAxis: null,
} as unknown as LayerState;
const DIMS = ["z", "y", "x"];

const level = (shape: [number, number, number], dtype: string, storeId: string): LevelSource => ({
  // dims [z, y, x]
  shape,
  chunks: [64, 64, 64],
  dtype,
  storeId,
});

const geometryOf = (levels: LevelSource[]) => buildLayerLevelGeometry(DIMS, LAYER, levels)!;

describe("assessPoolViability", () => {
  it("passes a multiscale pyramid trivially (tiny coarsest grid) in both modes", () => {
    const geometry = geometryOf([
      level([1024, 2048, 2048], "uint16", "s0"),
      level([32, 64, 64], "uint16", "s1"), // coarsest: one brick
    ]);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "3D")).viable).toBe(true);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "2D")).viable).toBe(true);
  });

  it("passes an affordable single-level cube (fits the budget) in both modes", () => {
    // 256³ float32, 3D: grid 4³ = 64 (+64 headroom) × 66³·4 B ≈ 147 MB ≤ 512 MB.
    const geometry = geometryOf([level([256, 256, 256], "float32", "s0")]);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "3D")).viable).toBe(true);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "2D")).viable).toBe(true);
  });

  it("refuses an oversized single-level volume in 3D with the real floor bytes", () => {
    // 2048×2048×1024 uint16 (R16F atlas, 2 B/voxel — roadmap R3): grid
    // 32×32×16 = 16384 bricks, slots 66³·2 B ≈ 0.57 MB → floor ≈ 9.4 GB —
    // half the old promoted-r32f floor, still far past any budget.
    const geometry = geometryOf([level([1024, 2048, 2048], "uint16", "s0")]);
    const verdict = assessPoolViability(geometry, resolveBrickSpec(geometry, "3D"));
    expect(verdict.viable).toBe(false);
    if (!verdict.viable) {
      expect(verdict.floorBytes).toBeGreaterThan(7.5e9);
      expect(verdict.capBytes).toBe(512 * 1024 * 1024);
    }
  });

  it("refuses the same volume in 2D too (slot floor spans every z slab)", () => {
    // 2D grid 8×8×1024 = 65536 slabs-worth of slots × 256·256·2 B ≈ 8.6 GB.
    const geometry = geometryOf([level([1024, 2048, 2048], "uint16", "s0")]);
    const verdict = assessPoolViability(geometry, resolveBrickSpec(geometry, "2D"));
    expect(verdict.viable).toBe(false);
    if (!verdict.viable) expect(verdict.floorBytes).toBeGreaterThan(7.5e9);
  });

  it("is budget-based, not single-level-based: a moderate single-level stack passes", () => {
    // 2048×2048×16 uint8 (r8, 1 B): 2D floor (8·8·16 + 64)·65536 ≈ 71 MB;
    // 3D floor (32·32·1 + 64)·66³ ≈ 313 MB — both ≤ 512 MB.
    const geometry = geometryOf([level([16, 2048, 2048], "uint8", "s0")]);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "2D")).viable).toBe(true);
    expect(assessPoolViability(geometry, resolveBrickSpec(geometry, "3D")).viable).toBe(true);
  });

  it("uses the promoted texture bytes (uint16 → float32), not the raw dtype width", () => {
    // Same shape: uint8 stays r8 (1 B) and passes 3D; uint16 promotes to r32f
    // (4 B) and the identical grid costs 4× more.
    const shape: [number, number, number] = [64, 2048, 2048];
    const u8 = geometryOf([level(shape, "uint8", "s0")]);
    const u16 = geometryOf([level(shape, "uint16", "s0")]);
    const u8Verdict = assessPoolViability(u8, resolveBrickSpec(u8, "3D"));
    const u16Verdict = assessPoolViability(u16, resolveBrickSpec(u16, "3D"));
    // grid 32×32×1 = 1024 (+64) slots: ×66³ ≈ 313 MB at 1 B (fits),
    // ≈ 1.25 GB at 4 B (does not).
    expect(u8Verdict.viable).toBe(true);
    expect(u16Verdict.viable).toBe(false);
  });
});
