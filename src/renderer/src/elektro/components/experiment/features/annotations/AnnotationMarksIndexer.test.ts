import { describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { normalizeAnnotationLayer } from "../../platform/model/layerModel";
import { createExperimentStore } from "../../platform/stores/experimentStore";
import { createViewerStore } from "../../platform/stores/viewerStore";
import { AnnotationMarksIndexer } from "./AnnotationMarksIndexer";
import { createAnnotationSlice, type AnnotationSlice } from "./store/annotationSlice";

const world = { axes: [{ name: "t", type: "TIME", order: 0 }] };
const raw = (id: string, times: number[]) => ({
  __typename: "AnnotationLayer",
  id,
  placement: "PLACED",
  asAffine: { matrix: [[1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  annotationCollection: {
    name: id,
    coordinateSystem: world,
    annotations: times.map((t, i) => ({ id: `${id}${i}`, name: null, kind: "EVENT", vectors: [[t]] })),
  },
});

const setup = () => {
  const a = raw("a", [1, 2]);
  const experiment = createExperimentStore({
    experimentId: "e",
    world,
    annotatable: true,
    layers: [normalizeAnnotationLayer(a as never)],
    rawLayers: { a } as never,
    timeOrigin: 0,
    worldSpan: null,
  });
  const viewer = createViewerStore([createAnnotationSlice]) as unknown as StoreApi<AnnotationSlice>;
  const indexer = new AnnotationMarksIndexer(experiment, viewer);
  return { a, experiment, viewer, indexer };
};

describe("AnnotationMarksIndexer", () => {
  it("indexes every annotation layer's marks once", () => {
    const { viewer } = setup();
    expect(viewer.getState().annotationMarks.a.events.map((e) => e.time)).toEqual([1, 2]);
  });

  it("keeps an unchanged layer's marks by identity across a fold", () => {
    const { a, experiment, viewer } = setup();
    const before = viewer.getState().annotationMarks.a;
    const b = raw("b", [5]);
    experiment.getState().syncLayers(experiment.getState().serverLayers, { a, b } as never, null);
    expect(viewer.getState().annotationMarks.a).toBe(before);
    expect(viewer.getState().annotationMarks.b.events).toHaveLength(1);
  });

  it("clears on dispose", () => {
    const { viewer, indexer } = setup();
    indexer.dispose();
    expect(viewer.getState().annotationMarks).toEqual({});
  });
});
