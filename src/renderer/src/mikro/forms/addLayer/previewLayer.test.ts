import { InMemoryCache } from "@apollo/client";
import { parse } from "graphql";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/mikro/api/graphql", () => ({
  CreateIntensityLayerDocument: { kind: "Document", name: "CreateIntensityLayer" },
  CreateLabelLayerDocument: {},
  CreateMeshLayerDocument: {},
  CreatePhasorLayerDocument: {},
  CreateRgbLayerDocument: {},
  CreateVectorLayerDocument: {},
  CreateVolumeLayerDocument: {},
  PreviewLayerDocument: {},
}));

import { keepPreviewLayer } from "./previewLayer";

const UPDATE = parse("mutation U($input: UpdateIntensityLayerInput!) { updateIntensityLayer(input: $input) { id } }");

describe("keepPreviewLayer", () => {
  it("creates the layer, replays the held edits against it, and only then links it into the cached scene", async () => {
    // The scene as the cache holds it, and the create's answer already written (Apollo does that).
    const cache = new InMemoryCache();
    const SCENE = parse('query S { scene(id: "1") { id layers { id } } }');
    cache.writeQuery({ query: SCENE, data: { scene: { __typename: "Scene", id: "1", layers: [] } } });
    const linked = () =>
      (cache.readQuery({ query: SCENE }) as { scene: { layers: { id: string }[] } }).scene.layers.map((layer) => layer.id);
    const calls: string[] = [];
    const client = {
      cache,
      mutate: vi.fn(async (options: { mutation: unknown; variables: { input: { id?: string } } }) => {
        if (options.mutation === UPDATE) {
          calls.push(`edit ${options.variables.input.id} (${linked().includes("42") ? "linked" : "not linked yet"})`);
          return { data: {} };
        }
        calls.push("create");
        cache.writeFragment({
          fragment: parse("fragment F on IntensityLayer { id }"),
          data: { __typename: "IntensityLayer", id: "42" },
        });
        return { data: { createIntensityLayer: { __typename: "IntensityLayer", id: "42" } } };
      }),
      refetchQueries: vi.fn(async () => []),
    };
    const saved = await keepPreviewLayer(
      client as never,
      { intensity: { scene: "1", lens: "2" } } as never,
      { visible: false },
      [{ document: UPDATE, variables: { input: { id: "staged:a", climMax: 900 } } }],
    );
    expect(saved).toBe("42");
    // The saved layer joins the scene only once it is tuned, and nothing is refetched.
    expect(calls).toEqual(["create", "edit 42 (not linked yet)"]);
    expect(linked()).toEqual(["42"]);
    expect(client.refetchQueries).not.toHaveBeenCalled();
    expect(client.mutate.mock.calls[0][0].variables).toEqual({ input: { scene: "1", lens: "2", visible: false } });
    expect(client.mutate.mock.calls[1][0].variables).toEqual({ input: { id: "42", climMax: 900 } });
  });
});
