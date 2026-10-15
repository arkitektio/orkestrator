import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  AddLayerLensCapabilitiesDocument,
  AddLayerLineageDocument,
  AddLayerReachableDocument,
  AddLayerWorldGraphDocument,
  CreateIntensityLayerDocument,
} from "@/mikro/api/graphql";

// The engine and the picker are tested on their own: here, what the stager
// does with their answers.
const sections = vi.fn();
const suggest = vi.fn();
vi.mock("./candidates", () => ({
  buildSections: (input: unknown) => sections(input),
  lensCandidateOf: (lens: unknown) => lens,
}));
vi.mock("./engine", () => ({
  stagedFromLayers: () => ({ layers: [], nodes: new Set(), spaces: new Set() }),
  suggestLensKinds: (...args: unknown[]) => suggest(...args),
  extentOf: () => 1,
}));
vi.mock("./spaceGraph", () => ({
  graphFromComponent: () => ({ graph: true }),
  graphFromLineage: () => ({ lineage: true }),
  mergeGraphs: (a: object, b: object) => ({ ...a, ...b }),
}));

import { drawsLens, stageLens } from "./stageLens";

const crop = { id: "42", dataset: { id: "d", intrinsicSystem: { id: "grid" } }, slices: [], renderAxes: null };
const rowOf = (lens: object) => [{ entries: [{ kind: "dataset", lenses: [{ lens, label: "soma crop" }] }] }];

const clientWith = (layers: unknown[]) => {
  const query = vi.fn(async ({ query: document }: { query: unknown }) => {
    if (document === AddLayerReachableDocument)
      return { data: { scene: { layers, worldCoordinateSystem: { id: "w", name: "World", placedSystems: [{ id: "grid" }] } } } };
    if (document === AddLayerWorldGraphDocument) return { data: { coordinateGraph: {} } };
    if (document === AddLayerLensCapabilitiesDocument) return { data: { drawable: [], labels: [], phasor: [], rgb: [] } };
    if (document === AddLayerLineageDocument) return { data: { lineageGraph: {} } };
    throw new Error("unexpected query");
  });
  const mutate = vi.fn(async () => ({ data: {} }));
  return { client: { query, mutate } as never, query, mutate };
};

const registry = { ensureChannelLens: vi.fn() };

beforeEach(() => {
  sections.mockReset();
  suggest.mockReset();
  suggest.mockReturnValue({ kinds: ["INTENSITY", "LABEL"], defaults: {} });
});

describe("stageLens", () => {
  it("adds the lens as the engine's first kind, asking every answer fresh", async () => {
    sections.mockReturnValue(rowOf(crop));
    const { client, query, mutate } = clientWith([]);

    expect(await stageLens(client, registry, { scene: "s", lens: "42" })).toEqual({
      status: "added",
      kind: "INTENSITY",
      label: "soma crop",
    });
    expect(query.mock.calls.every(([options]) => (options as { fetchPolicy: string }).fetchPolicy === "network-only")).toBe(true);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: CreateIntensityLayerDocument,
        variables: { input: { scene: "s", lens: "42" } },
        refetchQueries: ["GetScene"],
      }),
    );
  });

  it("adds nothing the scene already draws", async () => {
    sections.mockReturnValue(rowOf(crop));
    const { client, mutate } = clientWith([{ __typename: "IntensityLayer", id: "l1", lens: { id: "42", dataset: { id: "d" } } }]);

    expect(await stageLens(client, registry, { scene: "s", lens: "42" })).toEqual({ status: "present", label: "soma crop" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("guesses nothing for a lens the world does not reach", async () => {
    sections.mockReturnValue(rowOf({ ...crop, id: "other" }));
    const { client, mutate } = clientWith([]);

    expect(await stageLens(client, registry, { scene: "s", lens: "42" })).toEqual({ status: "unplaceable" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("counts a layer over one channel of the lens as drawing it, so a rerun adds no next channel", () => {
    const multichannel = { id: "42", dataset: { id: "d" }, slices: [{ axis: "y", start: 1, stop: 5 }] };
    const channelOne = { id: "43", dataset: { id: "d" }, slices: [{ axis: "y", start: 1, stop: 5 }, { axis: "c", start: 1, stop: 2 }] };
    const elsewhere = { id: "44", dataset: { id: "d" }, slices: [{ axis: "y", start: 2, stop: 5 }, { axis: "c", start: 1, stop: 2 }] };

    expect(drawsLens([{ lens: channelOne }], multichannel, "c")).toBe(true);
    expect(drawsLens([{ lens: elsewhere }], multichannel, "c")).toBe(false);
    expect(drawsLens([{ lens: { ...channelOne, dataset: { id: "other" } } }], multichannel, "c")).toBe(false);
    expect(drawsLens([{ lens: multichannel }], multichannel, null)).toBe(true);
    expect(drawsLens([{ lens: null }], multichannel, "c")).toBe(false);
  });
});
