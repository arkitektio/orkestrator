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
  it("creates the layer, replays the held edits against it, and only then refetches the scene", async () => {
    const calls: string[] = [];
    const client = {
      mutate: vi.fn(async (options: { mutation: unknown; variables: { input: { id?: string } } }) => {
        if (options.mutation === UPDATE) {
          calls.push(`edit ${options.variables.input.id}`);
          return { data: {} };
        }
        calls.push("create");
        return { data: { createIntensityLayer: { id: "42" } } };
      }),
      refetchQueries: vi.fn(async () => {
        calls.push("refetch");
        return [];
      }),
    };
    const saved = await keepPreviewLayer(
      client as never,
      { intensity: { scene: "1", lens: "2" } } as never,
      { visible: false },
      [{ document: UPDATE, variables: { input: { id: "staged:a", climMax: 900 } } }],
    );
    expect(saved).toBe("42");
    expect(calls).toEqual(["create", "edit 42", "refetch"]);
    expect(client.mutate.mock.calls[0][0].variables).toEqual({ input: { scene: "1", lens: "2", visible: false } });
    expect(client.mutate.mock.calls[1][0].variables).toEqual({ input: { id: "42", climMax: 900 } });
  });
});
