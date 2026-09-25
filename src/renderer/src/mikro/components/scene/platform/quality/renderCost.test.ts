import { describe, expect, it } from "vitest";
import {
  estimateImageLayerRenderCostBytes,
  selectLayersWithinBudget,
} from "./renderCost";
import { getInitialVolumeTextureBudgetBytes } from "./lodPlanning";
import type { ImageLayerFragment } from "../model/layerGuards";

type LevelSpec = { shape: number[]; dtype: string };

/** Minimal ImageLayerFragment-shaped fixture (axisNames [y, x, c] like the debug scenes). */
const makeLayer = (
  id: string,
  levels: LevelSpec[],
  overrides: Partial<{
    axisNames: string[];
    zAxis: string | null;
    fixedLOD: number | null;
    defaultVolumeLOD: number | null;
    slices: unknown[];
  }> = {},
) =>
  ({
    id,
    fixedLOD: overrides.fixedLOD ?? null,
    defaultVolumeLOD: overrides.defaultVolumeLOD ?? null,
    lens: {
      slices: overrides.slices ?? [],
      renderAxes: { x: "x", y: "y", z: overrides.zAxis ?? null, intensity: "c" },
      dataset: {
        axisNames: overrides.axisNames ?? ["y", "x", "c"],
        dataArrays: levels.map((level, index) => ({
          level: index,
          store: { id: `${id}-store-${index}`, shape: level.shape, dtype: level.dtype },
        })),
      },
    },
  }) as unknown as ImageLayerFragment & { fixedLOD?: number | null; defaultVolumeLOD?: number | null };

// The reported scene: 256×256×1 float32, single level, axisNames [y, x, c].
const debugGalleryLayer = (id: string) => makeLayer(id, [{ shape: [256, 256, 1], dtype: "float32" }]);

describe("estimateImageLayerRenderCostBytes", () => {
  it("prices the debug-gallery layer at one float32 slice in 2D", () => {
    // 256 * 256 * 1 channel * 4 bytes — single level, so no separate backdrop.
    expect(estimateImageLayerRenderCostBytes(debugGalleryLayer("57"), "2D")).toBe(
      256 * 256 * 4,
    );
  });

  it("accounts for dtype: uint8 costs a quarter of float32", () => {
    const uint8Layer = makeLayer("u8", [{ shape: [256, 256, 1], dtype: "uint8" }]);
    expect(estimateImageLayerRenderCostBytes(uint8Layer, "2D")).toBe(256 * 256 * 1);
  });

  it("caps 2D detail at the viewport bound for gigapixel levels", () => {
    const giga = makeLayer("giga", [
      { shape: [100_000, 100_000, 1], dtype: "uint8" },
      { shape: [1024, 1024, 1], dtype: "uint8" },
    ]);
    // detail capped at 4096² × 1 channel × 1 byte, plus the coarsest backdrop.
    expect(estimateImageLayerRenderCostBytes(giga, "2D")).toBe(4096 * 4096 + 1024 * 1024);
  });

  it("counts intensity channels (capped at 16) in 2D", () => {
    const multiChannel = makeLayer("mc", [{ shape: [128, 128, 32], dtype: "float32" }]);
    expect(estimateImageLayerRenderCostBytes(multiChannel, "2D")).toBe(128 * 128 * 16 * 4);
  });

  it("prices 3D at the resolved default volume LOD", () => {
    const volume = makeLayer(
      "vol",
      [
        { shape: [512, 512, 512], dtype: "float32" },
        { shape: [256, 256, 256], dtype: "float32" },
      ],
      { axisNames: ["z", "y", "x"], zAxis: "z", defaultVolumeLOD: 1 },
    );
    // Spatial-only estimate at the default volume LOD (level 1).
    expect(estimateImageLayerRenderCostBytes(volume, "3D")).toBe(256 * 256 * 256 * 4);
  });

  it("returns 0 for layers without data arrays", () => {
    expect(estimateImageLayerRenderCostBytes(makeLayer("empty", []), "2D")).toBe(0);
  });
});

describe("selectLayersWithinBudget", () => {
  const entry = (id: string, costBytes: number) => ({ id, costBytes });

  it("admits all 22 debug-gallery layers within the default budget", () => {
    const cost = estimateImageLayerRenderCostBytes(debugGalleryLayer("l"), "2D");
    const entries = Array.from({ length: 22 }, (_, i) => entry(`layer-${i}`, cost));
    const { displayed, culled } = selectLayersWithinBudget(
      entries,
      getInitialVolumeTextureBudgetBytes(),
      64,
    );

    expect(displayed).toHaveLength(22);
    expect(culled).toHaveLength(0);
  });

  it("culls trailing layers once the budget is exhausted, keeping earlier ones", () => {
    const { displayed, culled, usedBytes } = selectLayersWithinBudget(
      [entry("a", 60), entry("b", 60), entry("c", 60)],
      130,
      64,
    );

    expect(displayed.map((e) => e.id)).toEqual(["a", "b"]);
    expect(culled.map((e) => e.id)).toEqual(["c"]);
    expect(usedBytes).toBe(120);
  });

  it("still admits a later cheap layer after culling an expensive one", () => {
    const { displayed, culled } = selectLayersWithinBudget(
      [entry("a", 60), entry("huge", 1000), entry("c", 30)],
      100,
      64,
    );

    expect(displayed.map((e) => e.id)).toEqual(["a", "c"]);
    expect(culled.map((e) => e.id)).toEqual(["huge"]);
  });

  it("always admits the first layer even when it alone exceeds the budget", () => {
    const { displayed } = selectLayersWithinBudget([entry("only", 10_000)], 100, 64);
    expect(displayed.map((e) => e.id)).toEqual(["only"]);
  });

  it("respects the draw-call backstop", () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry(`l${i}`, 1));
    const { displayed, culled } = selectLayersWithinBudget(entries, 1000, 4);

    expect(displayed).toHaveLength(4);
    expect(culled).toHaveLength(6);
  });
});
