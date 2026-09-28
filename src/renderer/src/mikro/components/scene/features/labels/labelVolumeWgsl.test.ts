// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  fragmentWgsl,
  makeTestPool,
} from "../bricks/gpu/__testing__/wgslHarness";
import { createLabelVolumeNodeMaterial } from "./labelNodeMaterials";
import type { LabelUniformData } from "./labelUniforms";

/**
 * The label raymarcher's WGSL, device-free (see the bricks harness): the smoke
 * alarm for an invalid shader module, which draws nothing and says little.
 */

const LABEL_DATA: LabelUniformData = {
  seed: 1,
  background: 0,
  opacity: 1,
  saturation: 0.8,
  value: 0.9,
  contour: false,
  contourWidth: 1,
  selectionColor: [1, 1, 0],
  showUnselected: true,
};

describe("label raymarcher WGSL", () => {
  it("builds, with the per-brick residency cache", () => {
    const pool = makeTestPool(1, "uint32");
    const { material } = createLabelVolumeNodeMaterial(
      pool,
      { minValue: 0, maxValue: 65535 },
      LABEL_DATA,
    );
    const wgsl = fragmentWgsl(material);
    expect(wgsl).toContain("fn main");
    expect(wgsl).toContain("lblRcLvl");
  });
});
