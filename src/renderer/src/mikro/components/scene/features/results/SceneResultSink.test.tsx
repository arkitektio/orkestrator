// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resultOriginKey, useResultSink, type ResultSink } from "@/core/smart/extensions/results";
import { CreateMeshLayerDocument, DeleteLayerDocument } from "@/mikro/api/graphql";

const stage = vi.fn();
const mutate = vi.fn();
const refetchQueries = vi.fn(async () => []);
const client = { mutate, refetchQueries };

vi.mock("@/mikro/api/funcs", () => ({ useMikro: () => client }));
vi.mock("@/mikro/lib/lenses/useLensRegistry", () => ({ useLensRegistry: () => ({}) }));
vi.mock("@/mikro/forms/addLayer/stageLens", () => ({ stageLens: (...args: unknown[]) => stage(...args) }));
vi.mock("@/mikro/forms/addLayer/engine", () => ({ LAYER_KIND_INFO: { LABEL: { title: "Label" } } }));
vi.mock("@/core/notify", () => ({ toast: { success: vi.fn(), info: vi.fn() }, reportError: vi.fn() }));
vi.mock("../../platform/stores/sceneStore", () => ({
  useSceneStore: (select: (state: { id: string }) => unknown) => select({ id: "scene-1" }),
}));

import { RerunLayers, SceneResultSink } from "./SceneResultSink";

const label = (id: string) => ({ identifier: "@mikro/arraylens", id });
const surface = (id: string) => ({ identifier: "@mikro/meshlens", id });
const refined = { identifier: "@mikro/annotation", id: "a-refined" };
const onPath = { action: "segment", on: { path: { __identifier: "@mikro/annotation", object: "p1" } } };

/** The sink the scene mounts, as a run's row would read it. */
const mountSink = (): ResultSink => {
  let sink: ResultSink | null = null;
  const Grab = () => {
    sink = useResultSink();
    return null;
  };
  render(
    <SceneResultSink>
      <Grab />
    </SceneResultSink>,
  );
  return sink!;
};

const deleted = () =>
  mutate.mock.calls
    .map(([options]) => options as { mutation: unknown; variables: { input: { id: string } } })
    .filter((options) => options.mutation === DeleteLayerDocument)
    .map((options) => options.variables.input.id);

afterEach(cleanup);

beforeEach(() => {
  stage.mockReset();
  mutate.mockReset();
  refetchQueries.mockClear();
  let layers = 0;
  stage.mockImplementation(async () => ({ status: "added", kind: "LABEL", label: "labels", layer: `label-layer-${++layers}` }));
  mutate.mockImplementation(async ({ mutation }: { mutation: unknown }) =>
    mutation === CreateMeshLayerDocument ? { data: { createMeshLayer: { id: `mesh-layer-${++layers}` } } } : { data: {} },
  );
});

describe("resultOriginKey", () => {
  it("is the action and the args, whatever their order", () => {
    expect(resultOriginKey({ action: "a", on: { x: 1, y: { id: 2 } } })).toBe(
      resultOriginKey({ action: "a", on: { y: { id: 2 }, x: 1 } }),
    );
    expect(resultOriginKey({ action: "a", on: { x: 1 } })).not.toBe(resultOriginKey({ action: "b", on: { x: 1 } }));
    expect(resultOriginKey({ action: "a", on: { x: 1 } })).not.toBe(resultOriginKey({ action: "a", on: { x: 2 } }));
  });
});

describe("RerunLayers", () => {
  it("answers the previous run's layers once the same run adds new ones", () => {
    const reruns = new RerunLayers();
    expect(reruns.replace(onPath, ["l1", "m1"])).toEqual([]);
    expect(reruns.replace(onPath, ["l2"])).toEqual(["l1", "m1"]);
    expect(reruns.replace({ ...onPath, action: "other" }, ["l3"])).toEqual([]);
  });

  it("keeps a layer the rerun still draws, and forgets nothing for a run that added none", () => {
    const reruns = new RerunLayers();
    reruns.replace(onPath, ["l1"]);
    expect(reruns.replace(onPath, [])).toEqual([]);
    expect(reruns.replace(onPath, ["l1", "l2"])).toEqual([]);
    expect(reruns.replace(undefined, ["l9"])).toEqual([]);
  });
});

describe("SceneResultSink", () => {
  it("stages the label, adds the surface as a mesh layer and refetches the shapes", async () => {
    const sink = mountSink();
    sink([label("42"), refined, surface("m7")], onPath);

    await waitFor(() => expect(refetchQueries).toHaveBeenCalledWith({ include: ["GetSceneAnnotations"] }));
    expect(stage).toHaveBeenCalledWith(client, {}, { scene: "scene-1", lens: "42" });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: CreateMeshLayerDocument,
        variables: { input: { scene: "scene-1", lens: "m7" } },
      }),
    );
    expect(deleted()).toEqual([]);
  });

  it("replaces what the previous run of the same action on the same path added", async () => {
    const sink = mountSink();
    sink([label("42"), surface("m7")], onPath);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    sink([label("43"), surface("m8")], onPath);
    await waitFor(() => expect(deleted()).toEqual(["label-layer-1", "mesh-layer-2"]));

    // Another path is another run: both results stay.
    sink([label("44")], { ...onPath, on: { path: { __identifier: "@mikro/annotation", object: "p2" } } });
    await waitFor(() => expect(stage).toHaveBeenCalledTimes(3));
    expect(deleted()).toEqual(["label-layer-1", "mesh-layer-2"]);
  });

  it("removes nothing when a rerun could not place its result", async () => {
    const sink = mountSink();
    sink([label("42")], onPath);
    await waitFor(() => expect(stage).toHaveBeenCalledTimes(1));

    stage.mockResolvedValueOnce({ status: "unplaceable" });
    sink([label("43")], onPath);
    await waitFor(() => expect(stage).toHaveBeenCalledTimes(2));
    expect(deleted()).toEqual([]);
  });
});
