import { describe, expect, it } from "vitest";
import {
  experimentScopeSignature,
  experimentLayerSignature,
  orderedLayers,
} from "./experimentStructure";
import { placeabilityOf, unplaceableMessage } from "./placeable";
import { placementErrorsByLayerId } from "./placementErrors";
import {
  colorForLayerId,
  normalizeAnnotationLayer,
  normalizeEventsLayer,
  normalizeSpikesLayer,
  normalizeTraceLayer,
  rgbaCss,
  withPersisted,
  worldExtentOf,
  type TraceLayerLike,
} from "./layerModel";

const step = (id: string, version = 1, inverted = false) => ({
  inverted,
  transformation: { id, version },
});

const trace = (id: string, extra: Record<string, unknown> = {}) => ({
  __typename: "TraceLayer",
  id,
  order: 0,
  pathToWorld: [step(`e${id}`)],
  lens: { id: `lens${id}` },
  ...extra,
});

const experiment = (extra: Record<string, unknown> = {}) => ({
  id: "1",
  world: { id: "w" },
  layers: [
    trace("1"),
    trace("2"),
    { __typename: "SpikesLayer", id: "3", pathToWorld: [], sparseDataset: { id: "s1" } },
  ],
  ...extra,
});

describe("experiment signatures", () => {
  it("rebuilds only on identity or world", () => {
    expect(experimentScopeSignature(experiment())).toBe(
      experimentScopeSignature(experiment({ layers: [] })),
    );
    expect(experimentScopeSignature(experiment())).not.toBe(
      experimentScopeSignature(experiment({ world: { id: "other" } })),
    );
  });

  it("treats a missing world as its own scope, not as an error", () => {
    expect(experimentScopeSignature({ id: "1", world: null })).toContain('"world":null');
  });

  it("ignores content: visible, name, order, colour and clim move NEITHER signature", () => {
    // What makes an optimistic edit free: no signature moves, so no tile refetches.
    const base = experimentLayerSignature(experiment());
    const changed = experimentLayerSignature(
      experiment({
        layers: [
          trace("1", { visible: false, name: "renamed", order: 9, color: [1, 2, 3, 255], climMin: -1 }),
          trace("2"),
          { __typename: "SpikesLayer", id: "3", pathToWorld: [], sparseDataset: { id: "s1" }, opacity: 0.2 },
        ],
      }),
    );
    expect(changed).toBe(base);
  });

  it("reconciles when an edge is edited in place", () => {
    // The re-placement flow: same edge id, bumped version.
    const moved = experimentLayerSignature(
      experiment({ layers: [trace("1", { pathToWorld: [step("e1", 2)] }), trace("2")] }),
    );
    expect(moved).not.toBe(experimentLayerSignature(experiment({ layers: [trace("1"), trace("2")] })));
    // ...but the SCOPE is untouched, so the canvas survives.
    expect(experimentScopeSignature(experiment())).toBe(experimentScopeSignature(experiment()));
  });

  it("reconciles when a layer is re-pointed at other data, or at another channel", () => {
    const base = experimentLayerSignature(experiment({ layers: [trace("1")] }));
    expect(experimentLayerSignature(experiment({ layers: [trace("1", { lens: { id: "other" } })] }))).not.toBe(base);
    expect(experimentLayerSignature(experiment({ layers: [trace("1", { channelIndex: 2 })] }))).not.toBe(base);
  });

  it("is indifferent to server array order", () => {
    const [a, b, c] = experiment().layers;
    expect(experimentLayerSignature(experiment({ layers: [c, b, a] }))).toBe(
      experimentLayerSignature(experiment()),
    );
  });

  it("reconciles when an annotation layer is minted", () => {
    // `createAnnotation(experiment:)` mints one on first draw. This must be a
    // RECONCILE, never a rebuild.
    const minted = experiment({
      layers: [
        ...experiment().layers,
        { __typename: "AnnotationLayer", id: "9", pathToWorld: [], annotationCollection: { id: "c" } },
      ],
    });
    expect(experimentLayerSignature(minted)).not.toBe(experimentLayerSignature(experiment()));
    expect(experimentScopeSignature(minted)).toBe(experimentScopeSignature(experiment()));
  });

  it("orders layers for display by their own order, then id", () => {
    const layers = orderedLayers([
      { __typename: "AnnotationLayer", id: "a", order: 0 },
      { __typename: "SpikesLayer", id: "s", order: 3 },
      { __typename: "TraceLayer", id: "r2", order: 2 },
      { __typename: "TraceLayer", id: "r1", order: 2 },
    ]);
    expect(layers.map((l) => l.id)).toEqual(["a", "r1", "r2", "s"]);
  });
});

describe("placeabilityOf", () => {
  it("draws a PLACED view from its affine", () => {
    expect(placeabilityOf({ placement: "PLACED", asAffine: {} })).toEqual({
      drawable: true,
      timeSource: "AFFINE",
    });
  });

  it("draws a PLACED view with an erroring asAffine from a lookup", () => {
    // The whole reason the page reads GraphQL errors.
    expect(
      placeabilityOf({ placement: "PLACED", asAffine: null }, "FieldTransformation 42"),
    ).toEqual({ drawable: true, timeSource: "LOOKUP", reason: "FieldTransformation 42" });
  });

  it("recognises a lookup from a DIFFEOMORPHIC path even without the error", () => {
    expect(
      placeabilityOf({
        placement: "PLACED",
        asAffine: null,
        placementInvariance: "DIFFEOMORPHIC",
      }),
    ).toMatchObject({ drawable: true, timeSource: "LOOKUP" });
  });

  it("keeps UNREGISTERED and LOOKUP apart — they need opposite affordances", () => {
    const unregistered = placeabilityOf({ placement: "UNREGISTERED", asAffine: null });
    expect(unregistered).toMatchObject({ drawable: false, reason: "unregistered" });
    expect(unplaceableMessage(unregistered)).toBe("Not on the timeline yet");
  });

  it("badges UNMAPPABLE and CONDITIONAL distinctly", () => {
    expect(placeabilityOf({ placement: "UNMAPPABLE" })).toMatchObject({ reason: "unmappable" });
    expect(placeabilityOf({ placement: "CONDITIONAL" })).toMatchObject({ reason: "conditional" });
  });

  it("does not claim a PLACED view with no map and no explanation is drawable", () => {
    expect(placeabilityOf({ placement: "PLACED", asAffine: null })).toMatchObject({
      drawable: false,
      reason: "uncondensable",
    });
  });
});

describe("placementErrorsByLayerId", () => {
  const exp = { layers: [{ id: "r0" }, { id: "r1" }] };

  it("maps an asAffine error to the layer at that response index", () => {
    const errors = [
      { message: "lookup r1", path: ["experiment", "layers", 1, "asAffine"] },
    ];
    const map = placementErrorsByLayerId(exp, errors);
    expect(map.get("r1")).toBe("lookup r1");
    expect(map.size).toBe(1);
  });

  it("ignores errors that are not about placement", () => {
    const errors = [
      { message: "lens broke", path: ["experiment", "layers", 0, "lens", "shape"] },
    ];
    expect(placementErrorsByLayerId(exp, errors).size).toBe(0);
  });
});

const TIME = { name: "t", type: "TIME", order: 0 };
const CHANNEL = { name: "c", type: "CHANNEL", order: 0 };

const traceLayer = (extra: Partial<TraceLayerLike> = {}): TraceLayerLike => ({
  __typename: "TraceLayer",
  id: "7",
  name: null,
  order: 0,
  visible: true,
  placement: "PLACED",
  asAffine: { matrix: [[0.1, 1000]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  lens: {
    axisNames: ["t"],
    shape: [10_000],
    slices: [],
    coordinateSystem: { axes: [TIME] },
    activeAnchors: [
      { coordinates: {}, recordingSite: { label: "soma v" }, valueHistogram: { min: -80, max: 30 } },
    ],
    dataset: {
      name: "run 3 soma",
      axisNames: ["t"],
      shape: [10_000],
      intrinsicSystem: { axes: [TIME] },
      valueUnit: "mV",
      valueDimension: "[mass] * [length] ** 2 / [current] / [time] ** 3",
      dataArrays: [
        {
          level: 0,
          shape: [10_000],
          toParent: { __typename: "ScaleTransformation", scale: [1] },
          store: { id: "L0" },
        },
        {
          level: 1,
          shape: [5_000],
          toParent: { __typename: "ScaleTransformation", scale: [2] },
          store: { id: "L1" },
        },
      ],
    },
  },
  ...extra,
});

const world = { axes: [TIME] };

describe("normalizeTraceLayer", () => {
  it("resolves placement, pyramid and extent once", () => {
    const layer = normalizeTraceLayer(traceLayer(), world);
    expect(layer.kind).toBe("trace");
    expect(layer.label).toBe("soma v");
    expect(layer.source?.levels).toHaveLength(2);
    expect(layer.valueUnit).toBe("mV");
    // 10k samples at 0.1 ms from t=1000 ms.
    expect(layer.span?.start).toBeCloseTo(1000, 9);
    expect(layer.span?.end).toBeCloseTo(2000, 9);
  });

  it("labels by name, then site, then dataset", () => {
    expect(normalizeTraceLayer(traceLayer({ name: "trial 3" }), world).label).toBe("trial 3");
    const noSite = traceLayer();
    noSite.lens = { ...noSite.lens, activeAnchors: [] };
    expect(normalizeTraceLayer(noSite, world).label).toBe("run 3 soma");
  });

  it("seeds its scale from the persisted clim, else the anchors' histogram", () => {
    expect(normalizeTraceLayer(traceLayer(), world).climSeed).toEqual({ lo: -80, hi: 30 });
    expect(normalizeTraceLayer(traceLayer({ climMin: -1, climMax: 1 }), world).climSeed).toEqual({
      lo: -1,
      hi: 1,
    });
  });

  it("takes its colour and width from the layer, falling back to a hue and 1.25 px", () => {
    const plain = normalizeTraceLayer(traceLayer(), world);
    expect(plain.color).toBe(colorForLayerId("7"));
    expect(plain.lineWidth).toBe(1.25);
    const styled = normalizeTraceLayer(traceLayer({ color: [255, 0, 0, 255], lineWidth: 3 }), world);
    expect(styled.color).toBe(rgbaCss([255, 0, 0, 255]));
    expect(styled.lineWidth).toBe(3);
  });

  it("labels channels from their anchors, honouring channelIndex", () => {
    const multi = traceLayer({
      channelIndex: 1,
      lens: {
        ...traceLayer().lens,
        axisNames: ["c", "t"],
        coordinateSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
        activeAnchors: [
          { coordinates: { c: 0 }, channelLabel: { label: "Vm" } },
          { coordinates: { c: 1 }, channelLabel: { label: "Im" } },
        ],
        dataset: {
          ...traceLayer().lens.dataset,
          axisNames: ["c", "t"],
          shape: [2, 10_000],
          intrinsicSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
          dataArrays: [
            {
              level: 0,
              shape: [2, 10_000],
              toParent: { __typename: "ScaleTransformation", scale: [1, 1] },
              store: { id: "L0" },
            },
          ],
        },
      },
    });
    const layer = normalizeTraceLayer(multi, world);
    expect(layer.channelCount).toBe(1);
    expect(layer.channelLabels).toEqual(["Im"]);
  });

  it("builds no source for an undrawable layer, and says why", () => {
    const layer = normalizeTraceLayer(traceLayer({ placement: "UNREGISTERED", asAffine: null }), world);
    expect(layer.source).toBeNull();
    expect(layer.span).toBeNull();
    expect(layer.placeability).toMatchObject({ drawable: false, reason: "unregistered" });
  });

  it("records a source failure when the world has no time axis", () => {
    const layer = normalizeTraceLayer(traceLayer(), { axes: [{ name: "x", type: "SPACE" }] });
    expect(layer.source).toBeNull();
    expect(layer.sourceFailure).toBe("no-time-axis");
  });
});

describe("withPersisted (the optimistic overlay)", () => {
  it("re-derives colour, visibility and the clim seed from a patch", () => {
    const layer = normalizeTraceLayer(traceLayer(), world);
    const patched = withPersisted(layer, { visible: false, color: [0, 0, 255, 255], climMin: -5, climMax: 5 });
    expect(patched.visible).toBe(false);
    expect(patched.color).toBe(rgbaCss([0, 0, 255, 255]));
    expect(patched.climSeed).toEqual({ lo: -5, hi: 5 });
    // Clearing the clim falls back to the histogram, not to the stale seed.
    expect(withPersisted(patched, { climMin: null, climMax: null }).climSeed).toEqual({ lo: -80, hi: 30 });
    // The pyramid is untouched: an edit never refetches.
    expect(patched.source).toBe(layer.source);
  });
});

describe("the other kinds", () => {
  it("labels by name, else by what they read", () => {
    const common = { placement: "PLACED", asAffine: {} };
    expect(
      normalizeSpikesLayer(
        {
          __typename: "SpikesLayer",
          id: "s",
          sparseDataset: { id: "d", name: "units", axisNames: [], shape: [], arrays: [] },
          ...common,
        },
        world,
      ).label,
    ).toBe("units");
    expect(
      normalizeEventsLayer(
        { __typename: "EventsLayer", id: "e", tableDataset: { id: "t", name: "trials", store: { id: "s" } }, ...common },
        world,
      ).label,
    ).toBe("trials");
    const annotation = normalizeAnnotationLayer({
      __typename: "AnnotationLayer",
      id: "a",
      annotationCollection: { name: "marks" },
      ...common,
    });
    expect(annotation.label).toBe("marks");
    expect(annotation.kind).toBe("annotation");
  });
});

describe("worldExtentOf", () => {
  it("unions placed layers and anchors the origin at the earliest start", () => {
    const a = normalizeTraceLayer(traceLayer(), world);
    const b = normalizeTraceLayer(
      traceLayer({
        id: "8",
        asAffine: { matrix: [[0.1, 500]], inputAxes: ["t"], outputAxes: ["t"], total: true },
      }),
      world,
    );
    const extent = worldExtentOf([a, b]);
    expect(extent.span?.start).toBeCloseTo(500, 9);
    expect(extent.span?.end).toBeCloseTo(2000, 9);
    expect(extent.timeOrigin).toBeCloseTo(500, 9);
  });

  it("has no span and a zero origin when nothing is placed", () => {
    expect(worldExtentOf([])).toEqual({ span: null, timeOrigin: 0 });
  });
});

describe("colorForLayerId", () => {
  it("is stable, and handles non-numeric ids", () => {
    expect(colorForLayerId("12")).toBe(colorForLayerId("12"));
    expect(colorForLayerId("abc")).toMatch(/^hsl\(/);
  });
});
