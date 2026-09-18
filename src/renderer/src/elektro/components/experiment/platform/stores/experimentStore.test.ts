import { describe, expect, it } from "vitest";
import { normalizeAnnotationLayer } from "../model/layerModel";
import { createExperimentStore } from "./experimentStore";

const layer = (id: string, order = 0) =>
  normalizeAnnotationLayer({
    __typename: "AnnotationLayer",
    id,
    order,
    placement: "PLACED",
    asAffine: {},
    annotationCollection: { name: id },
  });

const store = () =>
  createExperimentStore({
    experimentId: "e",
    world: null,
    annotatable: true,
    layers: [layer("a"), layer("b", 1)],
    rawLayers: {},
    timeOrigin: 0,
    worldSpan: { start: 0, end: 10 },
  });

describe("experimentStore", () => {
  it("widens the world by what layers report after reading, and narrows when withdrawn", () => {
    const s = store();
    s.getState().reportSpan("events", { start: -5, end: 3 });
    expect(s.getState().worldSpan).toEqual({ start: -5, end: 10 });
    s.getState().reportSpan("events", null);
    expect(s.getState().worldSpan).toEqual({ start: 0, end: 10 });
  });

  it("keeps a reported extent across folds, and drops it with its layer", () => {
    const s = store();
    s.getState().reportSpan("b", { start: 20, end: 30 });
    s.getState().syncLayers([layer("a"), layer("b", 1)], {}, { start: 0, end: 10 });
    expect(s.getState().worldSpan).toEqual({ start: 0, end: 30 });
    s.getState().syncLayers([layer("a")], {}, { start: 0, end: 10 });
    expect(s.getState().worldSpan).toEqual({ start: 0, end: 10 });
  });

  it("applies an edit at once and rolls it back on failure", () => {
    const s = store();
    const rollback = s.getState().patchLayer("a", { visible: false, order: 5 });
    expect(s.getState().layers.map((l) => [l.id, l.visible])).toEqual([
      ["b", true],
      ["a", false],
    ]);
    rollback();
    expect(s.getState().layers.map((l) => [l.id, l.visible])).toEqual([
      ["a", true],
      ["b", true],
    ]);
  });
});
