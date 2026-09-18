import { describe, expect, it } from "vitest";
import { foldExperiment, type ExperimentLike } from "./foldExperiment";

const TIME = { name: "t", type: "TIME", order: 0 };

const trace = (id: string, extra: Record<string, unknown> = {}) => ({
  __typename: "TraceLayer",
  id,
  name: null,
  order: 0,
  visible: true,
  placement: "PLACED",
  asAffine: { matrix: [[0.1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  pathToWorld: [{ inverted: false, transformation: { id: `edge-${id}`, version: 1 } }],
  lens: {
    id: `lens-${id}`,
    axisNames: ["t"],
    shape: [1000],
    slices: [],
    coordinateSystem: { axes: [TIME] },
    dataset: {
      axisNames: ["t"],
      shape: [1000],
      intrinsicSystem: { axes: [TIME] },
      valueUnit: "mV",
      valueDimension: null,
      dataArrays: [
        {
          level: 0,
          shape: [1000],
          toParent: { __typename: "ScaleTransformation", scale: [1] },
          store: { id: `store-${id}` },
        },
      ],
    },
  },
  ...extra,
});

const experiment = (layers: unknown[], more: unknown[] = []): ExperimentLike =>
  ({
    world: { id: "w", axes: [TIME] },
    layers: [...layers, ...more],
  }) as unknown as ExperimentLike;

describe("foldExperiment", () => {
  it("normalizes layers and derives the world extent", () => {
    const folded = foldExperiment(experiment([trace("1")]), new Map(), null);
    expect(folded.layers).toHaveLength(1);
    expect(folded.layers[0].source).not.toBeNull();
    expect(folded.worldSpan).toEqual({ start: 0, end: 100 });
  });

  it("KEEPS a layer's pyramid object across a content-only change", () => {
    // The whole point: relabelling or hiding must not make a trace refetch.
    const first = foldExperiment(experiment([trace("1")]), new Map(), null);
    const second = foldExperiment(
      experiment([trace("1", { name: "renamed", visible: false })]),
      new Map(),
      first.memo,
    );
    expect(second.layers[0].source).toBe(first.layers[0].source);
    expect(second.layers[0].label).toBe("renamed");
  });

  it("keeps it across an annotation being minted beside it", () => {
    const first = foldExperiment(experiment([trace("1")]), new Map(), null);
    const second = foldExperiment(
      experiment(
        [trace("1")],
        [
          {
            __typename: "AnnotationLayer",
            id: "a1",
            placement: "PLACED",
            asAffine: {},
            pathToWorld: [],
            annotationCollection: { id: "c1", name: "marks" },
          },
        ],
      ),
      new Map(),
      first.memo,
    );
    expect(second.layers.find((v) => v.id === "1")?.source).toBe(first.layers[0].source);
    expect(second.rawLayers.a1).toBeDefined();
  });

  it("REBUILDS the pyramid when the layer is re-placed", () => {
    const first = foldExperiment(experiment([trace("1")]), new Map(), null);
    const second = foldExperiment(
      experiment([
        trace("1", {
          pathToWorld: [{ inverted: false, transformation: { id: "edge-1", version: 2 } }],
          asAffine: { matrix: [[0.1, 500]], inputAxes: ["t"], outputAxes: ["t"], total: true },
        }),
      ]),
      new Map(),
      first.memo,
    );
    expect(second.layers[0].source).not.toBe(first.layers[0].source);
    expect(second.layers[0].span?.start).toBe(500);
  });

  it("routes an asAffine error to the layer as a lookup placement", () => {
    const folded = foldExperiment(
      experiment([trace("1", { asAffine: null })]),
      new Map([["1", "FieldTransformation 7"]]),
      null,
    );
    expect(folded.layers[0].placeability).toMatchObject({
      drawable: true,
      timeSource: "LOOKUP",
    });
  });

  it("drops a kind it does not know rather than guessing", () => {
    const folded = foldExperiment(
      experiment([trace("1")], [{ __typename: "FutureLayer", id: "f", pathToWorld: [] }]),
      new Map(),
      null,
    );
    expect(folded.layers.map((l) => l.id)).toEqual(["1"]);
  });

  it("has no extent when nothing is placed", () => {
    const folded = foldExperiment(
      experiment([trace("1", { placement: "UNREGISTERED", asAffine: null })]),
      new Map(),
      null,
    );
    expect(folded.worldSpan).toBeNull();
  });
});

describe("foldExperiment reuse", () => {
  it("does not rebuild a kept pyramid", async () => {
    const sources = await import("../sources/traceSource");
    const { vi } = await import("vitest");
    const first = foldExperiment(experiment([trace("1")]), new Map(), null);
    const spy = vi.spyOn(sources, "buildTraceSource");
    foldExperiment(experiment([trace("1", { name: "renamed" })]), new Map(), first.memo);
    expect(spy).not.toHaveBeenCalled();
    // The spy does see builds — a fold with no memo rebuilds.
    foldExperiment(experiment([trace("1")]), new Map(), null);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
