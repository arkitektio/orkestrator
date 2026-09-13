// @vitest-environment jsdom
// (`layerModel.ts` imports enums from the generated `graphql.ts`, whose Apollo
// hooks barrel touches `window` on load.)
import { describe, expect, it } from "vitest";

import { Blending, ColorMap, ProjectionMode } from "@/mikro-next/api/graphql";
import type {
  IntensityLayerFragment,
  PhasorLayerFragment,
  RgbLayerFragment,
} from "./layerGuards";
import {
  normalizeBrickLayer,
  normalizeIntensityLayer,
  normalizePhasorLayer,
  normalizeRgbLayer,
  resolveRenderKind,
} from "./layerModel";
import type { ChannelRenderNode, PhasorRenderNode, TransferFn } from "./renderGraph";
import { CHANNEL_KIND, PHASOR_KIND } from "./renderGraph";
import type { SceneTransformContext } from "@/mikro-next/lib/coords/transformGraph";

/**
 * The three FIXED-SHAPE lens layers normalize into the same `LayerState` an
 * image layer does — that is what lets them share the entire brick engine
 * unchanged. These pin the two things that could silently go wrong:
 *
 *  1. The synthesized sources say what the flat server fields actually said.
 *  2. `renderKind` is EARNED. A specialised material compiles against it, so a
 *     layer that violates a precondition must fall back to `"graph"` — where it
 *     renders correctly and slower — rather than be mis-specialised.
 */

const SCENE: SceneTransformContext = { worldCoordinateSystem: null } as SceneTransformContext;

const LENS = {
  __typename: "Lens",
  id: "lens-1",
  shape: [3, 64, 20, 512, 512],
  axisNames: ["c", "m", "z", "y", "x"],
  // "m" is the MICROTIME axis a FLIM cube reduces to a phasor. It is neither a
  // spatial axis nor the channel axis — `resolvePhasorAxis` enforces exactly
  // that, and returns null for a "phasor axis" that is really the channel one.
  renderAxes: { x: "x", y: "y", z: "z", t: null, intensity: "c", phasor: "m" },
  slices: [],
  dataset: {
    name: "acquisition",
    dataArrays: [{ store: { id: "s0", dtype: "uint16" } }],
  },
};

const HEAD = {
  id: "layer-1",
  name: null,
  blending: Blending.Additive,
  opacity: 1,
  order: 0,
  visible: true,
  pathToWorld: [],
  lens: LENS,
};

const intensityLayer = (over: Partial<IntensityLayerFragment> = {}) =>
  ({
    ...HEAD,
    __typename: "IntensityLayer",
    kind: "INTENSITY",
    intensityAxis: "c",
    intensityIndex: 2,
    intensityColormap: ColorMap.Viridis,
    color: null,
    climMin: 100,
    climMax: 4000,
    gamma: 0.8,
    projectionMode: null,
    ...over,
  }) as unknown as IntensityLayerFragment;

const rgbLayer = (over: Partial<RgbLayerFragment> = {}) =>
  ({
    ...HEAD,
    __typename: "RgbLayer",
    kind: "RGB",
    intensityAxis: "c",
    redIndex: 0,
    greenIndex: 1,
    blueIndex: 2,
    climMin: 10,
    climMax: 900,
    ...over,
  }) as unknown as RgbLayerFragment;

const phasorLayer = (over: Partial<PhasorLayerFragment> = {}) =>
  ({
    ...HEAD,
    __typename: "PhasorLayer",
    kind: "PHASOR",
    phasorRender: {
      __typename: "PhasorRender",
      phasorAxis: "m",
      intensityAxis: null,
      intensityIndex: 0,
      harmonic: 2,
      transfer: {
        colormap: ColorMap.Rainbow,
        mode: "PHASE",
        min: null,
        max: null,
        weightByIntensity: true,
        intensity: { climMin: 5, climMax: 50, gamma: 1.2 },
        cursors: [],
      },
    },
    ...over,
  }) as unknown as PhasorLayerFragment;

const plainTransfer = (over: Partial<TransferFn> = {}): TransferFn => ({
  climMin: 0,
  climMax: 1,
  colormap: ColorMap.Viridis,
  color: null,
  colorStops: null,
  stops: null,
  gamma: null,
  opacity: null,
  invert: null,
  ...over,
});

/** The basis tints a layer must carry, in slot order, to earn `"rgb"`. */
const RGB_BASIS = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
] as const;

const channel = (over: Partial<ChannelRenderNode> = {}): ChannelRenderNode => ({
  type: "channel",
  kind: CHANNEL_KIND,
  label: null,
  intensityAxis: "c",
  intensityIndex: 0,
  visible: true,
  transfer: plainTransfer(),
  ...over,
});

describe("normalizeIntensityLayer", () => {
  it("synthesizes ONE channel carrying the flat server fields", () => {
    const state = normalizeIntensityLayer(intensityLayer(), null, SCENE);
    expect(state.channels).toHaveLength(1);
    expect(state.phasors).toEqual([]);
    expect(state.sources).toBe(state.channels);
    const [only] = state.channels;
    expect(only.intensityIndex).toBe(2);
    expect(only.intensityAxis).toBe("c");
    expect(only.transfer.climMin).toBe(100);
    expect(only.transfer.climMax).toBe(4000);
    expect(only.transfer.gamma).toBe(0.8);
    expect(only.transfer.colormap).toBe(ColorMap.Viridis);
  });

  it("folds the same values onto the flat single-channel fields", () => {
    // ~30 modules read these off `LayerState`; they must agree with the source
    // they were derived from or the 3D path and the panel disagree.
    const state = normalizeIntensityLayer(intensityLayer(), null, SCENE);
    expect(state.climMin).toBe(100);
    expect(state.climMax).toBe(4000);
    expect(state.gamma).toBe(0.8);
    expect(state.colormap).toBe(ColorMap.Viridis);
  });

  it("resolves a null clim against the base-native data range, not 0..1", () => {
    // null = "full range". Leaving it null on the flat fields would make the
    // single-channel 3D path window a uint16 volume into [0, 1].
    const state = normalizeIntensityLayer(
      intensityLayer({ climMin: null, climMax: null }),
      null,
      SCENE,
    );
    expect(state.climMin).toBe(0);
    expect(state.climMax).toBe(65535);
    // The SOURCE keeps the null, because null is what the server said and the
    // colormap atlas resolves it itself.
    expect(state.channels[0].transfer.climMin).toBeNull();
  });

  it("defaults the projection to MIP, and honours one when set", () => {
    expect(normalizeIntensityLayer(intensityLayer(), null, SCENE).projection).toBe(
      ProjectionMode.Mip,
    );
    expect(
      normalizeIntensityLayer(
        intensityLayer({ projectionMode: ProjectionMode.AttenuatedMip }),
        null,
        SCENE,
      ).projection,
    ).toBe(ProjectionMode.AttenuatedMip);
  });

  it("carries the TINT onto both the source and the flat field", () => {
    // The tint is what makes a monochrome channel render magenta. It reaches
    // the shader through the colormap-atlas ROW (`buildColormapAtlas` bakes it
    // exactly as it bakes a named ramp), so it has to be on the source; the
    // flat field is the derived copy the single-channel 3D path reads.
    const state = normalizeIntensityLayer(
      intensityLayer({ color: [255, 0, 255] }),
      null,
      SCENE,
    );
    expect(state.channels[0].transfer.color).toEqual([255, 0, 255]);
    expect(state.color).toEqual([255, 0, 255]);
  });

  it("still earns renderKind intensity WITH a tint", () => {
    // The load-bearing one: a tint is not a different recipe. If this ever
    // returns "graph", every tinted intensity layer silently falls off the
    // fast path.
    expect(
      normalizeIntensityLayer(intensityLayer({ color: [255, 0, 255] }), null, SCENE)
        .renderKind,
    ).toBe("intensity");
  });

  it("earns renderKind intensity", () => {
    expect(normalizeIntensityLayer(intensityLayer(), null, SCENE).renderKind).toBe(
      "intensity",
    );
  });
});

describe("normalizeRgbLayer", () => {
  it("synthesizes three basis-tinted planes over ONE window", () => {
    const state = normalizeRgbLayer(rgbLayer(), null, SCENE);
    expect(state.channels.map((c) => c.intensityIndex)).toEqual([0, 1, 2]);
    expect(state.channels.map((c) => c.transfer.color)).toEqual([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    // One acquisition, one window — per-plane contrast would misrepresent it.
    expect(state.channels.every((c) => c.transfer.climMin === 10)).toBe(true);
    expect(state.channels.every((c) => c.transfer.climMax === 900)).toBe(true);
  });

  it("has no named colormap: the tint IS the colouring", () => {
    // A named ramp would override the basis tint in `buildColormapAtlas`.
    const state = normalizeRgbLayer(rgbLayer(), null, SCENE);
    expect(state.channels.every((c) => c.transfer.colormap === null)).toBe(true);
  });

  it("composites its planes additively, whatever the layer's own blending", () => {
    // `blending` says how the layer sits over the layers BELOW it — a different
    // question from how its three planes combine, which is always addition.
    const state = normalizeRgbLayer(rgbLayer({ blending: Blending.Multiplicative }), null, SCENE);
    expect(state.blend).toBe(Blending.Additive);
  });

  it("earns renderKind rgb", () => {
    expect(normalizeRgbLayer(rgbLayer(), null, SCENE).renderKind).toBe("rgb");
  });
});

describe("normalizePhasorLayer", () => {
  it("sets phasorAxis — the field the brick layout and repack key on", () => {
    // Not cosmetic: it makes levelGeometry lay out g/s/intensity slabs, keeps
    // the axis out of `collapsibleDims`, and makes the repack REDUCE rather
    // than pin one bin.
    const state = normalizePhasorLayer(phasorLayer(), null, SCENE);
    expect(state.phasorAxis).toBe("m");
    expect(state.phasors).toHaveLength(1);
    expect(state.channels).toEqual([]);
    expect(state.phasors[0].harmonic).toBe(2);
    expect(state.phasors[0].kind).toBe(PHASOR_KIND);
  });

  it("folds the PHOTON-COUNT transfer onto the flat fields", () => {
    const state = normalizePhasorLayer(phasorLayer(), null, SCENE);
    expect(state.climMin).toBe(5);
    expect(state.climMax).toBe(50);
    expect(state.gamma).toBe(1.2);
    expect(state.colormap).toBe(ColorMap.Rainbow);
  });

  it("draws NOTHING when the server sent no phasorRender", () => {
    // The honest-degenerate rule: a layer the compositor cannot describe draws
    // nothing rather than something wrong.
    const state = normalizePhasorLayer(phasorLayer({ phasorRender: null }), null, SCENE);
    expect(state.sources).toEqual([]);
    expect(state.phasors).toEqual([]);
    expect(state.phasorAxis).toBeNull();
    expect(state.renderKind).toBe("graph");
  });

  it("earns renderKind phasor", () => {
    expect(normalizePhasorLayer(phasorLayer(), null, SCENE).renderKind).toBe("phasor");
  });
});

describe("resolveRenderKind", () => {
  it("is EARNED from the sources, not read off a typename", () => {
    // The point: an ImageLayer whose graph happens to be one plain channel gets
    // the fast path too.
    expect(resolveRenderKind([channel()], Blending.Additive)).toBe("intensity");
  });

  it.each([
    ["an authored transfer curve", { stops: [{ position: 0, value: 0 }, { position: 1, value: 1 }] }],
    ["a custom colour gradient", { colorStops: [{ position: 0, color: [0, 0, 0, 255] }, { position: 1, color: [255, 255, 255, 255] }] }],
    ["an inverted ramp", { invert: true }],
    ["a per-slot opacity", { opacity: 0.5 }],
  ])("falls back to graph for %s", (_label, over) => {
    // Each of these is something the specialised material does not emit. The
    // fallback is the whole safety story — a specialised material must never be
    // reachable for a layer it cannot express.
    expect(
      resolveRenderKind([channel({ transfer: plainTransfer(over as Partial<TransferFn>) })], Blending.Additive),
    ).toBe("graph");
  });

  it("falls back to graph for a hidden source", () => {
    expect(resolveRenderKind([channel({ visible: false })], Blending.Additive)).toBe("graph");
  });

  it("falls back to graph for a MULTIPLICATIVE single source", () => {
    // The compositor seeds its accumulator to vec3(1) for multiplicative, so
    // the one-slot collapse to `color * weight` that the specialised emitters
    // write is NOT exact there. Additive and normal both collapse; this does not.
    expect(resolveRenderKind([channel()], Blending.Multiplicative)).toBe("graph");
    expect(resolveRenderKind([channel()], Blending.Normal)).toBe("intensity");
  });

  it("a TINT still earns intensity — one scalar source is one scalar source", () => {
    // A monochrome acquisition shown in magenta is not a different recipe: the
    // tint is baked into the colormap atlas row exactly as a named ramp is.
    expect(
      resolveRenderKind(
        [channel({ transfer: plainTransfer({ colormap: null, color: [255, 0, 255] }) })],
        Blending.Additive,
      ),
    ).toBe("intensity");
  });

  it("needs the exact basis tints, in order, to earn rgb", () => {
    const rgbSources = [
      channel({ transfer: plainTransfer({ colormap: null, color: [255, 0, 0] }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 255, 0] }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 0, 255] }) }),
    ];
    expect(resolveRenderKind(rgbSources, Blending.Additive)).toBe("rgb");
    // Swap two and it is an ordinary three-channel composite again.
    const swapped = [rgbSources[1], rgbSources[0], rgbSources[2]];
    expect(resolveRenderKind(swapped, Blending.Additive)).toBe("graph");
  });

  it("keeps rgb for EVERY mapping the RGB card can produce", () => {
    // The card edits two things: the three plane indices (any permutation, a
    // repeat included — its "mono" preset points all three at one plane) and
    // the one shared window it writes to all three. None of that may cost the
    // specialised material, and this is the guard that says so: if a future
    // control on that card starts moving something else, this breaks here
    // rather than as an unexplained frame-rate drop on an RGB scene.
    const mapped = (indices: readonly number[], climMin: number, climMax: number) =>
      indices.map((intensityIndex, slot) =>
        channel({
          intensityIndex,
          transfer: plainTransfer({
            colormap: null,
            color: [...RGB_BASIS[slot]],
            climMin,
            climMax,
          }),
        }),
      );

    const mappings = [
      [0, 1, 2], // rgb preset
      [2, 1, 0], // bgr preset / the swap action
      [1, 2, 0], // an arbitrary per-slot pick
      [3, 3, 3], // mono: every primary on one plane
      [0, 0, 2], // two primaries sharing a plane
    ];
    for (const indices of mappings) {
      expect(resolveRenderKind(mapped(indices, 12, 4000), Blending.Additive)).toBe("rgb");
    }
  });

  it("needs a SHARED window to earn rgb", () => {
    const sources = [
      channel({ transfer: plainTransfer({ colormap: null, color: [255, 0, 0], climMax: 10 }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 255, 0] }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 0, 255] }) }),
    ];
    expect(resolveRenderKind(sources, Blending.Additive)).toBe("graph");
  });

  it("falls back to graph for a non-additive three-channel layer", () => {
    const sources = [
      channel({ transfer: plainTransfer({ colormap: null, color: [255, 0, 0] }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 255, 0] }) }),
      channel({ transfer: plainTransfer({ colormap: null, color: [0, 0, 255] }) }),
    ];
    expect(resolveRenderKind(sources, Blending.Multiplicative)).toBe("graph");
  });

  it("falls back to graph for a mixed channel + phasor layer", () => {
    const phasor: PhasorRenderNode = {
      type: "phasor",
      kind: PHASOR_KIND,
      label: null,
      phasorAxis: "m",
      harmonic: 1,
      intensityAxis: null,
      intensityIndex: 0,
      visible: true,
      transfer: {} as PhasorRenderNode["transfer"],
    };
    expect(resolveRenderKind([channel(), phasor], Blending.Additive)).toBe("graph");
  });
});

describe("normalizeBrickLayer", () => {
  it("dispatches every lens typename to its own normalizer", () => {
    // One dispatcher, two call sites in `sceneStore` — the two used to spell a
    // ternary each, which is how they drift.
    expect(normalizeBrickLayer(intensityLayer(), null, SCENE).renderKind).toBe("intensity");
    expect(normalizeBrickLayer(rgbLayer(), null, SCENE).renderKind).toBe("rgb");
    expect(normalizeBrickLayer(phasorLayer(), null, SCENE).renderKind).toBe("phasor");
  });
});
