// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { buildLabelUniformData, labelDataSignature } from "./labelUniforms";
import type { LayerState } from "../../platform/model/layerModel";

/**
 * `LabelRender` → uniforms. Pure and CPU-only, which is the point: the defaults
 * a never-tuned mask draws with are decided here and assertable without a GPU.
 */

const labelState = (
  render: Partial<NonNullable<LayerState["labelRender"]>> | null = {},
  over: Partial<LayerState> = {},
): LayerState =>
  ({
    __typename: "LabelLayer",
    id: "l",
    opacity: 1,
    labelRender: render === null ? null : { seed: 0, background: 0, ...render },
    ...over,
  }) as unknown as LayerState;

describe("buildLabelUniformData", () => {
  it("carries the seed and the background id straight through", () => {
    const data = buildLabelUniformData(labelState({ seed: 42, background: 7 }));
    expect(data.seed).toBe(42);
    expect(data.background).toBe(7);
  });

  it("multiplies the layer's opacity by the render's", () => {
    // Two independent dimmers: the panel's slider and the mask's own setting.
    const data = buildLabelUniformData(labelState({ opacity: 0.5 }, { opacity: 0.5 }));
    expect(data.opacity).toBeCloseTo(0.25);
  });

  it("defaults a whole missing labelRender to something that draws", () => {
    // `labelRender` is nullable and a never-tuned layer has none — it must still
    // paint hashed hues at full opacity with id 0 transparent.
    const data = buildLabelUniformData(labelState(null));
    expect(data).toMatchObject({
      seed: 0,
      background: 0,
      opacity: 1,
      contour: false,
      showUnselected: true,
    });
    expect(data.saturation).toBeGreaterThan(0);
    expect(data.value).toBeGreaterThan(0);
  });

  it("survives no layer at all", () => {
    expect(buildLabelUniformData(undefined).opacity).toBe(1);
  });

  it("treats a null contourWidth as one voxel, not as no contour", () => {
    const data = buildLabelUniformData(labelState({ contour: true, contourWidth: null }));
    expect(data.contour).toBe(true);
    expect(data.contourWidth).toBe(1);
  });

  it("converts the selection colour from 0..255 to 0..1 and falls back to white", () => {
    expect(buildLabelUniformData(labelState({ selectionColor: [255, 0, 128] })).selectionColor)
      .toEqual([1, 0, 128 / 255]);
    expect(buildLabelUniformData(labelState({ selectionColor: null })).selectionColor)
      .toEqual([1, 1, 1]);
  });
});

describe("labelDataSignature", () => {
  it("is stable for equal data built twice", () => {
    const a = buildLabelUniformData(labelState({ seed: 3 }));
    const b = buildLabelUniformData(labelState({ seed: 3 }));
    expect(labelDataSignature(a)).toBe(labelDataSignature(b));
  });

  it("moves when a rendering-relevant field moves", () => {
    const base = labelDataSignature(buildLabelUniformData(labelState({ seed: 1 })));
    expect(labelDataSignature(buildLabelUniformData(labelState({ seed: 2 })))).not.toBe(base);
    expect(
      labelDataSignature(buildLabelUniformData(labelState({ seed: 1, background: 9 }))),
    ).not.toBe(base);
    expect(
      labelDataSignature(buildLabelUniformData(labelState({ seed: 1, contour: true }))),
    ).not.toBe(base);
    expect(
      labelDataSignature(buildLabelUniformData(labelState({ seed: 1 }, { opacity: 0.4 }))),
    ).not.toBe(base);
  });

  it("does NOT move for the selection — that rides the colour LUT, not a uniform", () => {
    const base = labelDataSignature(buildLabelUniformData(labelState({ selected: [] })));
    expect(
      labelDataSignature(buildLabelUniformData(labelState({ selected: [1, 2, 3] }))),
    ).toBe(base);
  });

  it("moves when the contour width changes while the contour is on", () => {
    // The 2D material reads it as a uniform, so a width change has to reach the
    // GPU without rebuilding the material.
    const a = labelDataSignature(
      buildLabelUniformData(labelState({ contour: true, contourWidth: 1 })),
    );
    const b = labelDataSignature(
      buildLabelUniformData(labelState({ contour: true, contourWidth: 3 })),
    );
    expect(a).not.toBe(b);
  });
});
