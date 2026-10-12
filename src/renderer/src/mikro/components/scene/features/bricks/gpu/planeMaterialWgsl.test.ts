// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Blending, ColorMap, ProjectionMode } from "@/mikro/api/graphql";
import type { LayerState } from "../../../platform/model/layerModel";
import { buildChannelUniformData } from "./channelUniforms";
import { buildIntensityUniformData } from "./intensityUniforms";
import { buildRgbUniformData } from "./rgbUniforms";
import { createPlaneNodeMaterial } from "./brickNodeMaterials";
import { createIntensityPlaneMaterial, createRgbPlaneMaterial } from "./intensityNodeMaterials";
import { fragmentWgsl, makeTestPool } from "./__testing__/wgslHarness";

/**
 * The 2D plane compositors' WGSL, device-free (see the harness). All three
 * carry the crop box's fragment discard, and an invalid shader module here is
 * total: every flat image layer goes blank, crop or no crop.
 */

const channel = (index: number) => ({
  type: "channel",
  kind: "channel",
  label: null,
  intensityAxis: "c",
  intensityIndex: index,
  visible: true,
  transfer: {
    colormap: ColorMap.Viridis,
    color: null,
    climMin: 0,
    climMax: 255,
    gamma: 1,
    opacity: 1,
    invert: false,
  },
});

const layer = (count: number) => {
  const channels = Array.from({ length: count }, (_, index) => channel(index));
  return {
    sources: channels,
    channels,
    phasors: [],
    blend: Blending.Additive,
    projection: ProjectionMode.Maximum,
    colormap: ColorMap.Viridis,
    color: null,
    lens: { phasor: undefined },
  } as unknown as LayerState;
};

const RANGE = { minValue: 0, maxValue: 255 };

describe("plane compositor WGSL", () => {
  it("builds the general (render-graph) plane", () => {
    const pool = makeTestPool(2);
    const { material, nodes } = createPlaneNodeMaterial(
      pool,
      RANGE,
      buildChannelUniformData(layer(2), 1, 0, 255),
    );
    expect(fragmentWgsl(material)).toContain("pxBaseVoxel");
    // Resting: the crop uniforms clip nothing until a box is set.
    expect(nodes.uClipMin.value.x).toBeLessThan(-1e29);
    expect(nodes.uClipMax.value.x).toBeGreaterThan(1e29);
  });

  it("builds the fixed-shape intensity plane", () => {
    const pool = makeTestPool(1);
    const { material } = createIntensityPlaneMaterial(
      pool,
      RANGE,
      buildIntensityUniformData(layer(1), 0, 0, 255),
    );
    expect(fragmentWgsl(material)).toContain("pxBaseVoxel");
  });

  it("builds the fixed-shape rgb plane", () => {
    const pool = makeTestPool(3);
    const { material } = createRgbPlaneMaterial(
      pool,
      RANGE,
      buildRgbUniformData(layer(3), 2, 0, 255),
    );
    expect(fragmentWgsl(material)).toContain("pxBaseVoxel");
  });
});
