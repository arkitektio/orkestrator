// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Blending, ColorMap, ProjectionMode } from "@/mikro/api/graphql";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ChannelRenderNode } from "../../../platform/model/renderGraph";
import { buildChannelUniformData } from "./channelUniforms";
import { buildMergedChannelUniformData } from "./mergedChannelUniforms";
import { createVolumeNodeMaterial } from "./brickNodeMaterials";
import { buildWgsl, fragmentWgsl, makeTestPool as makePool } from "./__testing__/wgslHarness";

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
    const { fragment: wgsl, vertex } = buildWgsl(material);
    if (process.env.DUMP_WGSL) {
      const fs = await import("node:fs");
      fs.writeFileSync(process.env.DUMP_WGSL, wgsl);
      fs.writeFileSync(`${process.env.DUMP_WGSL}.vert`, vertex);
    }
    expect(wgsl).toContain("fn main");
    // The residency walk starts at the desired level, not 0.
    expect(wgsl).toMatch(/for \( var \w*[Ll]vl\w* : i32 = max\(/);
    // R11: the level pick scans from the previous step's level …
    expect(wgsl).toMatch(/for \( var dlvF : i32 = max\( prevLvl, /);
    // … the brick's occupancy bound is refreshed with the residency cache,
    // not per step, and the aggregate's when the ray enters a new cell …
    expect(wgsl.match(/if \( rcBoundsStale \)/g)?.length).toBe(2);
    expect(wgsl).toMatch(/aggLevel != aggKeyLevel/);
    // … and no tap in the divergent ray loop uses implicit derivatives.
    expect(wgsl).not.toMatch(/textureSample\(/);
    // A crop box shortens the march: the stride floor is the UNCROPPED ray's.
    expect(wgsl).toMatch(/fullRayLen\s*\/\s*max\(/);
    // And the proxy box is drawn at the crop box: the vertex stage reads it.
    expect(vertex).toMatch(/min\( max\( \w+, clamp\(/);
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

  it("samples an RGBA atlas once per step for all four single-channel layers (R11)", () => {
    // The four channels of one uint8 image as four layers: one pool, one
    // rgba8 atlas, one merged pass of four fixed-shape members.
    const pool = makePool(4, "uint8", "rgba8");
    expect(pool.atlas.channelsPerTexel).toBe(4);
    const members = [0, 1, 2, 3].map((index) => ({
      layerId: `l${index}`,
      layer: { ...layer([channel({ intensityIndex: index })]), renderKind: "intensity" } as LayerState,
      slotOffset: index,
    }));
    const merged = buildMergedChannelUniformData(members, 4, 0, 255, undefined, () => 0);
    expect(merged.members?.every((member) => member.isSimpleIntensity)).toBe(true);
    const { material } = createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, merged, 4);
    const wgsl = fragmentWgsl(material);
    expect(wgsl).toContain("fn main");
    // One sample into the shared texel, and each member reads a lane of it.
    expect(wgsl.match(/sharedTap = /g)?.length).toBe(2); // init + the one sample
    expect(wgsl.match(/dot\( sharedTap, /g)?.length).toBe(4);
  });

  const simpleMaterial = (projection: ProjectionMode) => {
    const pool = makePool(1);
    const only = {
      ...layer([channel()]),
      projection,
      renderKind: "intensity",
    } as LayerState;
    const modeOf = (l: LayerState | undefined) =>
      l?.projection === ProjectionMode.Volume ? 2 : l?.projection === ProjectionMode.Isosurface ? 3 : 0;
    const data = buildMergedChannelUniformData(
      [{ layerId: "a", layer: only, slotOffset: 0 }],
      1,
      0,
      255,
      undefined,
      modeOf,
    );
    expect(data.members?.[0].isSimpleIntensity).toBe(true);
    return createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, data, 1).material;
  };

  it("R12: a simple MIP member normalizes only a raw value that can win", async () => {
    const wgsl = fragmentWgsl(simpleMaterial(ProjectionMode.Maximum));
    if (process.env.DUMP_WGSL) {
      const fs = await import("node:fs");
      fs.writeFileSync(`${process.env.DUMP_WGSL}.simple`, wgsl);
    }
    // The transfer sits behind the raw compare …
    expect(wgsl).toMatch(/if \( \( fxIRaw > nodeVar\d+ \) \)/);
    // … the colormap is sampled for the WINNER only (one site, not per step) …
    expect(wgsl.match(/textureSampleLevel\( nodeUniform\d+, nodeUniform\d+_sampler, vec2/g)?.length).toBe(1);
    // … and the baked projection leaves one accumulator arm: no VOLUME
    // opacity correction, no ISO threshold test, no attenuation weight.
    expect(wgsl).not.toMatch(/exp\(/);
    expect(wgsl).not.toMatch(/volGrad0/);
    expect(wgsl).not.toMatch(/isoGrad0/);
    expect(wgsl).toMatch(/mipGrad0/);
  });

  it("R12: a VOLUME member keeps its per-step transfer and colour", () => {
    const wgsl = fragmentWgsl(simpleMaterial(ProjectionMode.Volume));
    expect(wgsl).toMatch(/volGrad0/);
    expect(wgsl).not.toMatch(/mipGrad0/);
    expect(wgsl).not.toMatch(/if \( \( fxIRaw > nodeVar\d+ \) \)/);
  });

  it("R12: the level pick and the coarse stride are per ray segment, not per step", () => {
    const wgsl = fragmentWgsl(simpleMaterial(ProjectionMode.Maximum));
    expect(wgsl).toMatch(/if \( \( rayT > lvlEndT \) \)/);
    expect(wgsl).toMatch(/if \( \( sampledLevel > prevLvl \) \)/);
    // The smoothing gate measures distance along the ray: no second length().
    expect(wgsl).toMatch(/rayT \* distPerT/);
  });

  it("builds the SAME material twice (a second render target is a second node build)", () => {
    // The compositor renders volumes into its colour target AND, for the depth
    // view, into `depthTarget`: three builds the node graph once per render
    // context, so the fragment Fn runs again. Its NameScope must start clean
    // each build, or the second build throws "duplicate name".
    const pool = makePool(2);
    const two = layer([channel(), channel({ intensityIndex: 1 })]);
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
    const { material } = createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, merged, 2);
    const first = fragmentWgsl(material);
    expect(() => fragmentWgsl(material)).not.toThrow();
    expect(fragmentWgsl(material)).toBe(first);
  });

  it("compiles the depth-coding branch (hold Q) into every variant", () => {
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
    const { material, nodes } = createVolumeNodeMaterial(pool, { minValue: 0, maxValue: 255 }, data, 1);
    // A runtime flag, not a rebuild: the handles exist on every material.
    expect(nodes.uDepthCode.value).toBe(0);
    expect(nodes.uDepthBoxMin.value.isVector3).toBe(true);
    // The compositor flips the flag per pass through the material itself.
    expect(material.userData.depthCodeUniform).toBe(nodes.uDepthCode);
    const wgsl = fragmentWgsl(material);
    expect(wgsl).toContain("depthHitT");
    expect(wgsl).toContain("depthStrength");
  });
});
