import { describe, expect, it, vi } from "vitest";
import { reconcileSceneLayers } from "./layerReconcile";
import { layerStructureKey } from "./sceneStructure";

/**
 * Every assertion here is about object IDENTITY (`===`), not deep equality —
 * identity is the whole contract. Deep-equal-but-fresh objects would still
 * invalidate `nodePlanTracker`'s and `brickResidency`'s layer-keyed caches and
 * re-render every layer subtree, which is the churn this module exists to
 * avoid.
 *
 * If an identity assertion here ever fails, suspect immer: the store must
 * write these arrays with the PLAIN-OBJECT `set({...})` form, because the
 * function form runs them through immer's finalizer and auto-freeze.
 */

type Raw = {
  id: string;
  __typename: "ImageLayer" | "LabelLayer" | "AnnotationLayer";
  pathToWorld?: { transformation?: { id?: string; version?: number | null } | null; inverted: boolean }[] | null;
  session?: string;
};
/**
 * The BRICK-backed arm — what the store's `isImage` predicate actually selects.
 * The generic calls it `Img`; what it means is "normalize this into `layers`",
 * and a label mask qualifies for the same reason an image does (a Lens over an
 * array, so the same pool, plan and residency).
 */
type Img = Raw & { __typename: "ImageLayer" | "LabelLayer" };
type State = { id: string; defaultVolumeLOD?: number | null; fixedLOD?: number | null; visible?: boolean };

const image = (id: string, over: Partial<Raw> = {}): Img =>
  ({ id, __typename: "ImageLayer", pathToWorld: [], ...over }) as Img;
const label = (id: string, over: Partial<Raw> = {}): Img =>
  ({ id, __typename: "LabelLayer", pathToWorld: [], ...over }) as Img;
const annotation = (id: string): Raw => ({
  id,
  __typename: "AnnotationLayer",
  pathToWorld: [],
});

const isImage = (layer: Raw): layer is Img =>
  layer.__typename === "ImageLayer" || layer.__typename === "LabelLayer";

/** Sensible defaults; each test overrides only what it is about. */
const run = (over: Partial<Parameters<typeof reconcileSceneLayers<Raw, Img, State>>[0]> = {}) => {
  const previousSceneLayers = over.previousSceneLayers ?? [image("a"), image("b")];
  const previousLayers =
    over.previousLayers ??
    previousSceneLayers
      .filter(isImage)
      .map((layer) => ({ id: layer.id, defaultVolumeLOD: 1 }) as State);

  return reconcileSceneLayers<Raw, Img, State>({
    previousSceneLayers,
    previousLayers,
    nextLayers: previousSceneLayers,
    isImage,
    structureKey: layerStructureKey,
    planDefaultLods: () => new Map(),
    normalize: (layer, defaultVolumeLod) => ({ id: layer.id, defaultVolumeLOD: defaultVolumeLod }),
    carryImageSession: (previous, next) => ({ ...next, fixedLOD: previous.fixedLOD, visible: previous.visible }),
    carryRawSession: (previous, next) => ({ ...next, session: previous.session }),
    ...over,
  });
};

describe("reconcileSceneLayers", () => {
  it("appends a non-image layer without touching the image layers", () => {
    // The bug's exact case: the server mints an AnnotationLayer on the first
    // annotation. The image layers must not be re-derived, so nothing replans.
    const previousSceneLayers = [image("a"), image("b")];
    const previousLayers: State[] = [
      { id: "a", defaultVolumeLOD: 1 },
      { id: "b", defaultVolumeLOD: 2 },
    ];
    const normalize = vi.fn((layer: Img, lod: number | null) => ({ id: layer.id, defaultVolumeLOD: lod }));

    const result = run({
      previousSceneLayers,
      previousLayers,
      nextLayers: [...previousSceneLayers, annotation("ann:1")],
      normalize,
    });

    expect(result.layersChanged).toBe(false);
    expect(result.sceneLayersChanged).toBe(true);
    expect(result.addedLayerIds).toEqual(["ann:1"]);
    expect(result.removedLayerIds).toEqual([]);
    expect(normalize).not.toHaveBeenCalled();
    expect(result.layers[0]).toBe(previousLayers[0]);
    expect(result.layers[1]).toBe(previousLayers[1]);
  });

  it("preserves element identity for untouched layers in both arrays", () => {
    const previousSceneLayers = [image("a"), image("b")];
    const previousLayers: State[] = [{ id: "a" }, { id: "b" }];

    const result = run({ previousSceneLayers, previousLayers, nextLayers: [image("a"), image("b")] });

    expect(result.sceneLayers[0]).toBe(previousSceneLayers[0]);
    expect(result.sceneLayers[1]).toBe(previousSceneLayers[1]);
    expect(result.layers[0]).toBe(previousLayers[0]);
    expect(result.layers[1]).toBe(previousLayers[1]);
  });

  it("re-derives a structurally changed layer but carries its session state", () => {
    const previousSceneLayers = [
      image("a", { pathToWorld: [{ transformation: { id: "t", version: 1 }, inverted: false }], session: "mesh-state" }),
    ];
    const previousLayers: State[] = [{ id: "a", defaultVolumeLOD: 3, fixedLOD: 2, visible: false }];
    // Same layer, registration refined in place (version bump).
    const refined = image("a", {
      pathToWorld: [{ transformation: { id: "t", version: 2 }, inverted: false }],
    });

    const result = run({ previousSceneLayers, previousLayers, nextLayers: [refined] });

    expect(result.layers[0]).not.toBe(previousLayers[0]);
    expect(result.layersChanged).toBe(true);
    // Session-only state survives the re-derivation...
    expect(result.layers[0].fixedLOD).toBe(2);
    expect(result.layers[0].visible).toBe(false);
    // ...including the default LOD: the global budget must not be re-split
    // for a layer that was already in the scene.
    expect(result.layers[0].defaultVolumeLOD).toBe(3);
    // The polymorphic side carries its own session state, in a NEW object.
    expect(result.sceneLayers[0]).not.toBe(previousSceneLayers[0]);
    expect(result.sceneLayers[0].session).toBe("mesh-state");
  });

  it("plans default LODs over the full next image set, applying them only to newcomers", () => {
    const previousSceneLayers = [image("a")];
    const previousLayers: State[] = [{ id: "a", defaultVolumeLOD: 1 }];
    const planDefaultLods = vi.fn(() => new Map([["a", 9], ["b", 4]]));

    const result = run({
      previousSceneLayers,
      previousLayers,
      nextLayers: [image("a"), image("b")],
      planDefaultLods,
    });

    expect(planDefaultLods).toHaveBeenCalledTimes(1);
    expect(planDefaultLods.mock.calls[0][0].map((l: Img) => l.id)).toEqual(["a", "b"]);
    // The survivor keeps its own LOD even though the planner offered 9.
    expect(result.layers[0]).toBe(previousLayers[0]);
    expect(result.layers[1].defaultVolumeLOD).toBe(4);
    expect(result.addedLayerIds).toEqual(["b"]);
  });

  it("drops removed layers and reports them, keeping survivors identical", () => {
    const previousSceneLayers = [image("a"), image("b"), annotation("ann:1")];
    const previousLayers: State[] = [{ id: "a" }, { id: "b" }];

    const result = run({
      previousSceneLayers,
      previousLayers,
      nextLayers: [previousSceneLayers[0]],
    });

    expect(result.sceneLayers.map((l) => l.id)).toEqual(["a"]);
    expect(result.layers.map((l) => l.id)).toEqual(["a"]);
    expect(result.removedLayerIds).toEqual(["b", "ann:1"]);
    expect(result.sceneLayers[0]).toBe(previousSceneLayers[0]);
    expect(result.layers[0]).toBe(previousLayers[0]);
    expect(result.layersChanged).toBe(true);
  });

  it("follows server order on a reorder, reusing every element", () => {
    const previousSceneLayers = [image("a"), image("b")];
    const previousLayers: State[] = [{ id: "a" }, { id: "b" }];

    const result = run({
      previousSceneLayers,
      previousLayers,
      nextLayers: [previousSceneLayers[1], previousSceneLayers[0]],
    });

    expect(result.sceneLayers.map((l) => l.id)).toEqual(["b", "a"]);
    expect(result.sceneLayers[0]).toBe(previousSceneLayers[1]);
    expect(result.sceneLayers[1]).toBe(previousSceneLayers[0]);
    expect(result.layers[0]).toBe(previousLayers[1]);
    expect(result.sceneLayersChanged).toBe(true);
    expect(result.layersChanged).toBe(true);
  });

  it("reports no change when nothing moved, so the store can skip the write", () => {
    const result = run();

    expect(result.sceneLayersChanged).toBe(false);
    expect(result.layersChanged).toBe(false);
    expect(result.addedLayerIds).toEqual([]);
    expect(result.removedLayerIds).toEqual([]);
  });
});

/**
 * Label masks share the brick path, so they normalize into `layers` alongside
 * images and must keep their session state across a fold exactly as an image
 * does. `reconcileSceneLayers` is generic over the predicate, so this is really
 * asserting that the store's widened `isImage` composes correctly.
 */
describe("reconcileSceneLayers with label layers in the brick arm", () => {
  it("normalizes a label into `layers` beside an image", () => {
    const scene = [image("img"), label("mask")];
    const result = run({
      previousSceneLayers: scene,
      previousLayers: [],
      nextLayers: scene,
    });
    expect(result.layers.map((l) => l.id)).toEqual(["img", "mask"]);
  });

  it("keeps a label's session state across a fold that did not change it", () => {
    const scene = [image("img"), label("mask")];
    const result = run({
      previousSceneLayers: scene,
      previousLayers: [
        { id: "img", defaultVolumeLOD: 1 },
        { id: "mask", defaultVolumeLOD: 1, fixedLOD: 3, visible: false },
      ],
      nextLayers: scene,
    });
    const mask = result.layers.find((l) => l.id === "mask");
    expect(mask).toMatchObject({ fixedLOD: 3, visible: false });
  });

  it("reports an added and a removed label in the summary", () => {
    const added = run({
      previousSceneLayers: [image("img")],
      previousLayers: [{ id: "img", defaultVolumeLOD: 1 }],
      nextLayers: [image("img"), label("mask")],
    });
    expect(added.addedLayerIds).toContain("mask");

    const removed = run({
      previousSceneLayers: [image("img"), label("mask")],
      previousLayers: [
        { id: "img", defaultVolumeLOD: 1 },
        { id: "mask", defaultVolumeLOD: 1 },
      ],
      nextLayers: [image("img")],
    });
    expect(removed.removedLayerIds).toContain("mask");
  });

  it("keeps an untouched label's raw object identity across a fold", () => {
    // The whole point of the module: a re-emission that changed nothing must not
    // invalidate the layer-keyed caches downstream.
    const mask = label("mask");
    const scene = [image("img"), mask];
    const result = run({
      previousSceneLayers: scene,
      previousLayers: [
        { id: "img", defaultVolumeLOD: 1 },
        { id: "mask", defaultVolumeLOD: 1 },
      ],
      nextLayers: [image("img"), label("mask")],
    });
    expect(result.sceneLayers.find((l) => l.id === "mask")).toBe(mask);
  });
});
