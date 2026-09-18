import { describe, expect, it } from "vitest";
import { normalizeAnnotationLayer, withPersisted } from "../model/layerModel";
import { createExperimentStore } from "../stores/experimentStore";
import { createViewerStore } from "../stores/viewerStore";
import { LayerDriverRegistry, type LayerDriver } from "./layerDriver";

const layer = (id: string, over: Record<string, unknown> = {}) =>
  normalizeAnnotationLayer({
    __typename: "AnnotationLayer",
    id,
    placement: "PLACED",
    asAffine: {},
    annotationCollection: { name: id },
    ...over,
  });

const setup = (layers = [layer("a"), layer("b")]) => {
  const experiment = createExperimentStore({
    experimentId: "e",
    world: null,
    annotatable: true,
    layers,
    rawLayers: {},
    timeOrigin: 0,
    worldSpan: null,
  });
  const viewer = createViewerStore();
  const log: string[] = [];
  const registry = new LayerDriverRegistry(experiment, viewer, {
    AnnotationLayer: (l): LayerDriver => {
      log.push(`create ${l.id}`);
      return {
        update: (next) => log.push(`update ${next.id}`),
        dispose: () => log.push(`dispose ${l.id}`),
      };
    },
  }).start();
  return { experiment, viewer, registry, log };
};

describe("LayerDriverRegistry", () => {
  it("creates one driver per drawable, visible layer", () => {
    const { registry, log } = setup();
    expect(registry.size).toBe(2);
    expect(log).toEqual(["create a", "create b"]);
  });

  it("disposes on hide and clears the layer's viewer state, recreates on show", () => {
    const { experiment, viewer, registry, log } = setup();
    viewer.getState().patchReadout("a", { count: 3 });
    const rollback = experiment.getState().patchLayer("a", { visible: false });
    expect(registry.has("a")).toBe(false);
    expect(log).toContain("dispose a");
    expect(viewer.getState().readouts.a).toBeUndefined();
    rollback();
    expect(registry.has("a")).toBe(true);
  });

  it("passes a changed layer to update, and disposes removed layers", () => {
    const { experiment, registry, log } = setup();
    const [a] = experiment.getState().layers;
    experiment.getState().syncLayers([withPersisted(a, { name: "renamed" })], {}, null);
    expect(log).toContain("update a");
    expect(log).toContain("dispose b");
    expect(registry.size).toBe(1);
  });

  it("gives an undrawable layer no driver, and disposes everything on dispose", () => {
    const { registry, log } = setup([layer("a"), layer("u", { placement: "UNREGISTERED", asAffine: null })]);
    expect(registry.has("u")).toBe(false);
    registry.dispose();
    expect(log).toContain("dispose a");
    expect(registry.size).toBe(0);
  });
});

describe("LayerDriverRegistry and scale", () => {
  it("keeps a hidden layer's clim, and drops a removed layer's", () => {
    const { experiment, viewer } = setup();
    viewer.getState().setClim("a", { lo: 0, hi: 1 });
    viewer.getState().setClim("b", { lo: 0, hi: 1 });
    experiment.getState().patchLayer("a", { visible: false });
    expect(viewer.getState().clims.a).toEqual({ lo: 0, hi: 1 });
    experiment.getState().syncLayers([experiment.getState().serverLayers[0]], {}, null);
    expect(viewer.getState().clims.b).toBeUndefined();
  });
});
