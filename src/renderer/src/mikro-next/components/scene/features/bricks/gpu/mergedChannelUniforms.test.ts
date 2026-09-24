// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Blending, ColorMap, ProjectionMode } from "@/mikro-next/api/graphql";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ChannelRenderNode } from "../../../platform/model/renderGraph";
import { buildChannelUniformData, MAX_CHANNELS } from "./channelUniforms";
import {
  buildMergedChannelUniformData,
  buildMergedChannelWindows,
  fixedMemberUniforms,
} from "./mergedChannelUniforms";
import {
  buildChannelDataSignature,
  buildChannelWindowSignature,
} from "./channelDataSignature";

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

/** Only the fields the uniform builder reads. */
const layer = (channels: ChannelRenderNode[], over: Partial<LayerState> = {}) =>
  ({
    sources: channels,
    channels,
    phasors: [],
    blend: Blending.Additive,
    projection: ProjectionMode.Maximum,
    colormap: ColorMap.Viridis,
    color: null,
    lens: { phasor: undefined },
    ...over,
  }) as unknown as LayerState;

const projectionModeOf = () => 0;
const build = (
  members: { layerId: string; layer: LayerState; slotOffset: number }[],
) =>
  buildMergedChannelUniformData(members, 3, 0, 255, undefined, projectionModeOf);

describe("buildMergedChannelUniformData — the golden invariant", () => {
  it("reproduces buildChannelUniformData exactly for a single member", () => {
    // The regression gate for the whole merge: the merged path must be a
    // superset of the single-layer path, not a parallel reimplementation that
    // can drift. If this breaks, every layer's appearance is suspect.
    const only = layer([
      channel({ intensityIndex: 1 }),
      channel({ intensityIndex: 2, visible: false }),
    ]);
    const single = buildChannelUniformData(only, 3, 0, 255, undefined);
    const merged = build([{ layerId: "a", layer: only, slotOffset: 0 }]);

    expect(merged.numChannels).toBe(single.numChannels);
    expect(merged.channelIndex).toEqual(single.channelIndex);
    expect(merged.climMin).toEqual(single.climMin);
    expect(merged.climMax).toEqual(single.climMax);
    expect(merged.gamma).toEqual(single.gamma);
    expect(merged.opacity).toEqual(single.opacity);
    expect(merged.visible).toEqual(single.visible);
    expect(merged.invert).toEqual(single.invert);
    expect(merged.row).toEqual(single.row);
    expect(merged.cursorCount).toBe(single.cursorCount);
    expect([...(merged.sourceParams.image.data as Float32Array)]).toEqual([
      ...(single.sourceParams.image.data as Float32Array),
    ]);
    expect([...(merged.cursors.image.data as Float32Array)]).toEqual([
      ...(single.cursors.image.data as Float32Array),
    ]);
    // Same colormap atlas geometry, so `row` indexes the same texels.
    expect(merged.atlas.image.height).toBe(single.atlas.image.height);
    expect([...(merged.atlas.image.data as Uint8Array)]).toEqual([
      ...(single.atlas.image.data as Uint8Array),
    ]);
  });

  it("describes the single member as owning the whole slot range", () => {
    const only = layer([channel(), channel()]);
    const merged = build([{ layerId: "a", layer: only, slotOffset: 0 }]);
    expect(merged.members).toEqual([
      {
        layerId: "a",
        slotFirst: 0,
        slotCount: 2,
        blendMode: 0,
        projectionMode: 0,
        hasPhasorSources: false,
        isSimpleIntensity: false,
        isRgb: false,
      },
    ]);
  });
});

describe("buildMergedChannelUniformData — rgb specialization input", () => {
  const rgb = (over: Partial<LayerState> = {}) =>
    layer(
      [
        channel({ intensityIndex: 0, transfer: { ...channel().transfer, colormap: null, color: [255, 0, 0] } }),
        channel({ intensityIndex: 1, transfer: { ...channel().transfer, colormap: null, color: [0, 255, 0] } }),
        channel({ intensityIndex: 2, transfer: { ...channel().transfer, colormap: null, color: [0, 0, 255] } }),
      ],
      { renderKind: "rgb", ...over },
    );

  it("marks a three-slot rgb member", () => {
    expect(build([{ layerId: "a", layer: rgb(), slotOffset: 0 }]).members[0].isRgb).toBe(true);
  });

  it("does NOT mark it when renderKind was not earned", () => {
    expect(build([{ layerId: "a", layer: rgb({ renderKind: "graph" }), slotOffset: 0 }]).members[0].isRgb).toBe(
      false,
    );
  });

  it("does NOT mark a member truncated below three slots", () => {
    const fourteen = Array.from({ length: 14 }, (_, i) => ({
      layerId: `c${i}`,
      layer: layer([channel({ intensityIndex: i })]),
      slotOffset: i,
    }));
    const merged = build([...fourteen, { layerId: "rgb", layer: rgb(), slotOffset: 14 }]);
    const member = merged.members.find((m) => m.layerId === "rgb");
    expect(member?.slotCount).toBe(2);
    expect(member?.isRgb).toBe(false);
  });

  it("fixedMemberUniforms slices exactly the member's slots out of the merged arrays", () => {
    const merged = build([
      { layerId: "plain", layer: layer([channel({ intensityIndex: 3 })], { renderKind: "intensity" }), slotOffset: 0 },
      { layerId: "rgb", layer: rgb(), slotOffset: 1 },
    ]);
    const [plain, rgbMember] = merged.members;
    expect(fixedMemberUniforms(merged, plain)).toEqual({
      slabs: [3, 3, 3],
      climMin: merged.climMin[0],
      climMax: merged.climMax[0],
      gamma: merged.gamma[0],
      row: merged.row[0],
      gains: [1, 1, 1],
    });
    expect(fixedMemberUniforms(merged, rgbMember)).toEqual({
      slabs: [0, 1, 2],
      climMin: merged.climMin[1],
      climMax: merged.climMax[1],
      gamma: 1,
      row: merged.row[1],
      gains: [1, 1, 1],
    });
  });

  it("fixedMemberUniforms carries an rgb member's white-balance gains (slot opacities)", () => {
    const balanced = layer(
      rgb().channels.map((c, i) => ({
        ...c,
        transfer: { ...c.transfer, opacity: [1, 0.7, 0.4][i] },
      })),
      { renderKind: "rgb" },
    );
    const merged = build([
      { layerId: "plain", layer: layer([channel()], { renderKind: "intensity" }), slotOffset: 0 },
      { layerId: "rgb", layer: balanced, slotOffset: 1 },
    ]);
    expect(fixedMemberUniforms(merged, merged.members[1]).gains).toEqual([1, 0.7, 0.4]);
  });
});

describe("buildMergedChannelUniformData — fixed-shape specialization input", () => {
  it("marks a one-slot intensity member simple", () => {
    // What the material compiles against: one plain scalar channel means its
    // contribution can be emitted straight-line instead of as a slot loop.
    const only = layer([channel()], { renderKind: "intensity" });
    const merged = build([{ layerId: "a", layer: only, slotOffset: 0 }]);
    expect(merged.members[0].isSimpleIntensity).toBe(true);
  });

  it("does NOT mark a member whose renderKind was not earned", () => {
    // `renderKind` is derived from the layer's sources, so a layer carrying a
    // curve, an invert or a multiplicative blend arrives here as "graph" — and
    // the specialised emission would be wrong for it.
    const only = layer([channel()], { renderKind: "graph" });
    expect(build([{ layerId: "a", layer: only, slotOffset: 0 }]).members[0].isSimpleIntensity).toBe(
      false,
    );
  });

  it("does NOT mark a multi-slot member, whatever its renderKind claims", () => {
    // BOTH halves are required: the loop is only removable at one slot. This
    // also covers a member TRUNCATED by the merged slot ceiling — it would
    // still claim "intensity" while owning a different number of slots.
    const two = layer([channel(), channel()], { renderKind: "intensity" });
    expect(build([{ layerId: "a", layer: two, slotOffset: 0 }]).members[0].isSimpleIntensity).toBe(
      false,
    );
  });

  it("decides per MEMBER, so a mixed group specializes only the simple ones", () => {
    const simple = layer([channel()], { renderKind: "intensity" });
    const general = layer([channel(), channel()], { renderKind: "graph" });
    const merged = build([
      { layerId: "a", layer: simple, slotOffset: 0 },
      { layerId: "b", layer: general, slotOffset: 1 },
    ]);
    expect(merged.members.map((m) => m.isSimpleIntensity)).toEqual([true, false]);
  });
});

describe("buildMergedChannelUniformData — phasor specialization input", () => {
  const phasorSource = () =>
    ({
      type: "phasor",
      kind: "phasor",
      label: null,
      visible: true,
      harmonic: 1,
      transfer: {
        colormap: ColorMap.Viridis,
        mode: "phase",
        cursors: [],
        intensity: {
          colormap: ColorMap.Viridis,
          color: null,
          climMin: 0,
          climMax: 255,
          gamma: 1,
          opacity: 1,
          invert: false,
        },
      },
    }) as unknown as ChannelRenderNode;

  it("flags only the members whose used slots hold phasor sources", () => {
    const merged = build([
      { layerId: "plain", layer: layer([channel()]), slotOffset: 0 },
      {
        layerId: "flim",
        layer: layer([channel(), phasorSource()]),
        slotOffset: 1,
      },
    ]);
    expect(merged.members.map((m) => m.hasPhasorSources)).toEqual([false, true]);
  });

  it("a phasor source truncated away by the slot budget does not flag its member", () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => ({
      layerId: `c${i}`,
      layer: layer([channel({ intensityIndex: i })]),
      slotOffset: i,
    }));
    // 15 slots used; this member's channel takes the 16th and its phasor
    // overflows MAX_CHANNELS — the compiled shader will never sample it.
    const merged = build([
      ...fifteen,
      {
        layerId: "overflow",
        layer: layer([channel(), phasorSource()]),
        slotOffset: 15,
      },
    ]);
    const overflow = merged.members.find((m) => m.layerId === "overflow");
    expect(overflow?.slotCount).toBe(1);
    expect(overflow?.hasPhasorSources).toBe(false);
  });
});

describe("buildMergedChannelUniformData — concatenation", () => {
  const four = () =>
    ["139", "140", "141", "142"].map((layerId, i) => ({
      layerId,
      layer: layer([channel({ intensityIndex: i })]),
      slotOffset: i,
    }));

  it("gives each member a contiguous, non-overlapping slot range", () => {
    const merged = build(four());
    expect(merged.numChannels).toBe(4);
    expect(merged.members.map((m) => [m.slotFirst, m.slotCount])).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
  });

  it("keeps each member's own channel index at its merged slot", () => {
    const merged = build(four());
    expect(merged.channelIndex.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it("indexes colormap rows against the MERGED atlas height", () => {
    const merged = build(four());
    expect(merged.atlas.image.height).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(merged.row[i]).toBeCloseTo((i + 0.5) / 4, 10);
    }
  });

  it("carries each member's own blend mode rather than collapsing them", () => {
    const merged = build([
      { layerId: "a", layer: layer([channel()]), slotOffset: 0 },
      {
        layerId: "b",
        layer: layer([channel()], { blend: Blending.Multiplicative }),
        slotOffset: 1,
      },
    ]);
    expect(merged.members.map((m) => m.blendMode)).toEqual([0, 1]);
  });

  it("carries per-member projection modes", () => {
    const merged = buildMergedChannelUniformData(
      [
        { layerId: "a", layer: layer([channel()]), slotOffset: 0 },
        { layerId: "b", layer: layer([channel()]), slotOffset: 1 },
      ],
      3,
      0,
      255,
      undefined,
      (l) => (l === undefined ? 0 : 7),
    );
    expect(merged.members.map((m) => m.projectionMode)).toEqual([7, 7]);
  });
});

describe("buildMergedChannelUniformData — overflow", () => {
  it("truncates past the slot budget rather than corrupting neighbours", () => {
    const big = layer(Array.from({ length: 12 }, () => channel()));
    const merged = build([
      { layerId: "a", layer: big, slotOffset: 0 },
      { layerId: "b", layer: big, slotOffset: 12 },
    ]);
    expect(merged.numChannels).toBe(MAX_CHANNELS);
    expect(merged.members[0]).toMatchObject({ slotFirst: 0, slotCount: 12 });
    // The second member gets what is left, not a wrap-around.
    expect(merged.members[1]).toMatchObject({ slotFirst: 12, slotCount: 4 });
  });

  it("gives a fully-truncated member zero slots rather than a negative count", () => {
    const big = layer(Array.from({ length: MAX_CHANNELS }, () => channel()));
    const merged = build([
      { layerId: "a", layer: big, slotOffset: 0 },
      { layerId: "b", layer: layer([channel()]), slotOffset: MAX_CHANNELS },
    ]);
    expect(merged.members[1]).toMatchObject({ slotCount: 0 });
    expect(merged.numChannels).toBe(MAX_CHANNELS);
  });
});

describe("window fast path ≡ full rebuild (updateChannelWindows contract)", () => {
  const windowEdit = (transfer: ChannelRenderNode["transfer"]) =>
    ({ ...transfer, climMin: 10, climMax: 200, gamma: 2, opacity: 0.5 }) as ChannelRenderNode["transfer"];

  it("buildMergedChannelWindows reproduces the rebuilt scalar arrays after a window edit", () => {
    const a = layer([channel({ intensityIndex: 1 })]);
    const b = layer([channel({ intensityIndex: 2 }), channel({ intensityIndex: 0 })]);
    const members = [
      { layerId: "a", layer: a, slotOffset: 0 },
      { layerId: "b", layer: b, slotOffset: 1 },
    ];
    const before = build(members);

    // Drag clim/gamma/opacity on every channel of member b; a is untouched.
    const editedB = layer([
      channel({ intensityIndex: 2, transfer: windowEdit((b.sources![0] as ChannelRenderNode).transfer) }),
      channel({ intensityIndex: 0, transfer: windowEdit((b.sources![1] as ChannelRenderNode).transfer) }),
    ]);
    const editedMembers = [
      { layerId: "a", layer: a, slotOffset: 0 },
      { layerId: "b", layer: editedB, slotOffset: 1 },
    ];

    // The fast path (slot layout from the LAST BUILT data) must equal the
    // full rebuild's scalar arrays — this is what makes drift structurally
    // impossible: both run sourceScalarWindow.
    const after = build(editedMembers);
    const windows = buildMergedChannelWindows(editedMembers, before.members, 0, 255);
    expect(windows.climMin).toEqual(after.climMin);
    expect(windows.climMax).toEqual(after.climMax);
    expect(windows.gamma).toEqual(after.gamma);
    expect(windows.opacity).toEqual(after.opacity);
    // And the layout it relied on did not move.
    expect(after.members.map((m) => [m.slotFirst, m.slotCount])).toEqual(
      before.members.map((m) => [m.slotFirst, m.slotCount]),
    );
  });

  it("a window edit moves ONLY the window signature; a colormap edit ONLY the structure one", () => {
    const base = layer([channel()]);
    const windowEdited = layer([channel({ transfer: windowEdit((base.sources![0] as ChannelRenderNode).transfer) })]);
    const colormapEdited = layer([
      channel({
        transfer: {
          ...(base.sources![0] as ChannelRenderNode).transfer,
          colormap: ColorMap.Inferno,
        } as ChannelRenderNode["transfer"],
      }),
    ]);

    expect(buildChannelDataSignature(windowEdited)).toBe(buildChannelDataSignature(base));
    expect(buildChannelWindowSignature(windowEdited)).not.toBe(buildChannelWindowSignature(base));

    expect(buildChannelDataSignature(colormapEdited)).not.toBe(buildChannelDataSignature(base));
    expect(buildChannelWindowSignature(colormapEdited)).toBe(buildChannelWindowSignature(base));
  });

  it("an invert or curve edit is STRUCTURAL (it can demote renderKind / rebake the LUT)", () => {
    const base = layer([channel()]);
    const inverted = layer([
      channel({
        transfer: {
          ...(base.sources![0] as ChannelRenderNode).transfer,
          invert: true,
        } as ChannelRenderNode["transfer"],
      }),
    ]);
    expect(buildChannelDataSignature(inverted)).not.toBe(buildChannelDataSignature(base));
  });
});
