import { describe, expect, it } from "vitest";
import {
  layerStructureKey,
  sceneLayerSignature,
  sceneScopeSignature,
  type SceneStructureLike,
} from "./sceneStructure";

/**
 * These two signatures ARE the provider's contract, so the tests pin the
 * SPLIT, not just each half: a layer-set change must move the layer signature
 * and leave the scope signature ALONE. That pairing is the whole fix — a scope
 * signature that moved would rebuild the store scope, unmount the canvas and
 * reload the scene, which is exactly the bug.
 *
 * Content edits (the things callers fold into the stores at their call sites)
 * must move neither. A false "same" leaves stale stores; a false "different"
 * on the scope side reintroduces the reload.
 */

const step = (id: string, version = 1, inverted = false) => ({
  transformation: { id, version },
  inverted,
});

const scene = (over: Partial<SceneStructureLike> = {}): SceneStructureLike => ({
  id: "scene:1",
  worldCoordinateSystem: { id: "cs:world" },
  layers: [
    { id: "layer:a", pathToWorld: [step("t:cal"), step("t:reg")] },
    { id: "layer:b", pathToWorld: null },
  ],
  ...over,
});

/** The pairing every layer-set change must satisfy. */
const expectReconcilable = (next: SceneStructureLike) => {
  expect(sceneLayerSignature(next)).not.toBe(sceneLayerSignature(scene()));
  expect(sceneScopeSignature(next)).toBe(sceneScopeSignature(scene()));
};

describe("sceneScopeSignature", () => {
  it("is stable across fragment identity churn", () => {
    expect(sceneScopeSignature(scene())).toBe(sceneScopeSignature(scene()));
  });

  it("changes when the scene or the world frame changes", () => {
    expect(sceneScopeSignature(scene({ id: "scene:2" }))).not.toBe(
      sceneScopeSignature(scene()),
    );
    expect(
      sceneScopeSignature(scene({ worldCoordinateSystem: { id: "cs:other" } })),
    ).not.toBe(sceneScopeSignature(scene()));
  });

  it("does not read layers at all", () => {
    expect(sceneScopeSignature({ id: "scene:1", worldCoordinateSystem: { id: "cs:world" } })).toBe(
      sceneScopeSignature(scene()),
    );
  });
});

describe("sceneLayerSignature", () => {
  it("is stable across fragment identity churn (content-only changes)", () => {
    // A fresh object graph with the same structure — what Apollo re-emits
    // after a render-graph save, a pinned view, or an annotation poll.
    expect(sceneLayerSignature(scene())).toBe(sceneLayerSignature(scene()));
  });

  it("reconciles a layer add (the first-annotation case)", () => {
    expectReconcilable(
      scene({ layers: [...scene().layers, { id: "layer:c", pathToWorld: [] }] }),
    );
  });

  it("reconciles a layer removal", () => {
    expectReconcilable(scene({ layers: scene().layers.slice(0, 1) }));
  });

  it("reconciles a layer reorder", () => {
    expectReconcilable(scene({ layers: [...scene().layers].reverse() }));
  });

  it("reconciles a placement edge refined in place (version bump)", () => {
    expectReconcilable(
      scene({
        layers: [
          { id: "layer:a", pathToWorld: [step("t:cal"), step("t:reg", 2)] },
          { id: "layer:b", pathToWorld: null },
        ],
      }),
    );
  });

  it("reconciles a path step flipping direction or swapping edges", () => {
    expectReconcilable(
      scene({
        layers: [
          { id: "layer:a", pathToWorld: [step("t:cal"), step("t:reg", 1, true)] },
          { id: "layer:b", pathToWorld: null },
        ],
      }),
    );
    expectReconcilable(
      scene({
        layers: [
          { id: "layer:a", pathToWorld: [step("t:cal"), step("t:other")] },
          { id: "layer:b", pathToWorld: null },
        ],
      }),
    );
  });
});

describe("layerStructureKey", () => {
  it("is stable across identity churn", () => {
    expect(
      layerStructureKey({ id: "layer:a", pathToWorld: [step("t:cal")] }),
    ).toBe(layerStructureKey({ id: "layer:a", pathToWorld: [step("t:cal")] }));
  });

  it("distinguishes layers", () => {
    expect(layerStructureKey({ id: "layer:a", pathToWorld: null })).not.toBe(
      layerStructureKey({ id: "layer:b", pathToWorld: null }),
    );
  });

  it("changes on refinement, flip and edge swap", () => {
    const base = { id: "layer:a", pathToWorld: [step("t:reg")] };
    expect(layerStructureKey({ ...base, pathToWorld: [step("t:reg", 2)] })).not.toBe(
      layerStructureKey(base),
    );
    expect(
      layerStructureKey({ ...base, pathToWorld: [step("t:reg", 1, true)] }),
    ).not.toBe(layerStructureKey(base));
    expect(layerStructureKey({ ...base, pathToWorld: [step("t:other")] })).not.toBe(
      layerStructureKey(base),
    );
  });

  it("distinguishes an unregistered layer (null path) from a world-rooted one ([])", () => {
    expect(layerStructureKey({ id: "layer:a", pathToWorld: null })).not.toBe(
      layerStructureKey({ id: "layer:a", pathToWorld: [] }),
    );
  });
});
