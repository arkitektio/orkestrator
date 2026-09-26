// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Blending, ColorMap, ProjectionMode } from "@/mikro/api/graphql";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ChannelRenderNode } from "../../../platform/model/renderGraph";
import { buildChannelUniformData } from "./channelUniforms";
import { buildMergedChannelUniformData } from "./mergedChannelUniforms";
import { createVolumeNodeMaterial } from "./brickNodeMaterials";
import { fragmentWgsl, makeTestPool as makePool } from "./__testing__/wgslHarness";

/**
 * The volume raymarcher's WGSL, built by the backend's own node builder — no
 * GPU, no device, just the text. The material is ~2.5k lines of TSL whose
 * failure mode is the quietest there is: an invalid shader module drops the
 * pipeline and the volume simply is not drawn. These tests are the smoke
 * alarm for that — they do not prove the image, only that it compiles.
 */

const channel = (over: Partial<ChannelRenderNode> = {}): ChannelRenderNode => ({
  type: "channel",
  kind: "channel",
  label: null,
  intensityAxis: "c",
  intensityIndex: 0,
  visible: true,
  transfer: {
    colormap: ColorMap.Viridis,
    color: null,
    climMin: 0,
    climMax: 255,
    gamma: 1,
    opacity: 1,
    invert: false,
  } as ChannelRenderNode["transfer"],
  ...over,
});

const layer = (channels: ChannelRenderNode[]) =>
  ({
    sources: channels,
    channels,
    phasors: [],
    blend: Blending.Additive,
    projection: ProjectionMode.Maximum,
    colormap: ColorMap.Viridis,
    color: null,
    lens: { phasor: undefined },
  }) as unknown as LayerState;

describe("volume raymarcher WGSL", () => {
  it("builds the fixed-shape (single intensity channel) variant", async () => {
    const pool = makePool(1);
    const only = layer([channel()]);
    const data = buildMergedChannelUniformData(
      [{ layerId: "a", layer: only, slotOffset: 0 }],
      1,
      0,
      255,
      undefined,
      () => 0,
    );
    const { material } = createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, data, 1);
    const wgsl = fragmentWgsl(material);
    if (process.env.DUMP_WGSL) (await import("node:fs")).writeFileSync(process.env.DUMP_WGSL, wgsl);
    expect(wgsl).toContain("fn main");
    // The residency walk starts at the desired level, not 0.
    expect(wgsl).toMatch(/for \( var \w*[Ll]vl\w* : i32 = max\(/);
  });

  it("builds the general (multi-channel, merged) variant", () => {
    const pool = makePool(2);
    const two = layer([channel(), channel({ intensityIndex: 1, transfer: { ...channel().transfer, invert: true } })]);
    const data = buildChannelUniformData(two, 2, 0, 255, undefined);
    const merged = buildMergedChannelUniformData(
      [
        { layerId: "a", layer: two, slotOffset: 0 },
        { layerId: "b", layer: two, slotOffset: 2 },
      ],
      2,
      0,
      255,
      undefined,
      () => 0,
    );
    expect(data.numChannels).toBe(2);
    const { material } = createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, merged, 2);
    expect(fragmentWgsl(material)).toContain("fn main");
  });
});
