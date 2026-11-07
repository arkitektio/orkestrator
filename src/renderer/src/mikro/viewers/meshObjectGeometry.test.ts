import { describe, expect, it, vi } from "vitest";
import type { MikroClient } from "@/core/data/zarr/store/types";
import type { FabriksObjectEntry } from "@/mikro/components/scene/features/meshes/fabriks/fabriksCatalogs";
import type { FabriksCollectionRef } from "@/mikro/components/scene/features/meshes/fabriks/fabriksSource";
import { createMeshGeometrySource } from "./meshObjectGeometry";

const entry = (objectId: number, indexCount = 6): FabriksObjectEntry => ({
  objectId,
  ordinal: objectId,
  bboxMin: [0, 0, 0],
  bboxMax: [1, 1, 1],
  vertexCount: 4,
  indexCount,
  cells: [],
});

const ref = (id: string) => ({ id, store: { id: `store-${id}` } }) as unknown as FabriksCollectionRef;

const setup = (catalog = new Map([[7, entry(7)], [9, entry(9, 50)]])) => {
  const open = vi.fn(async () => ({ loadObjectCatalog: async () => catalog }));
  const extract = vi.fn(async (_collection: unknown, objectId: number) => ({
    positions: new Float32Array([objectId, 0, 0]),
    indices: new Uint32Array([0, 0, 0]),
  }));
  const source = createMeshGeometrySource({ open, extract, maxIndices: 10 });
  return { open, extract, source, client: {} as MikroClient };
};

describe("one mesh object's geometry, off the scene", () => {
  it("opens a collection once and keeps each object it read", async () => {
    const { open, extract, source, client } = setup();
    const first = await source.load(client, "dl", ref("c1"), 7);
    const again = await source.load(client, "dl", ref("c1"), 7);
    expect(first).toBe(again);
    expect(first).toMatchObject({ kind: "mesh", geometry: { entry: { objectId: 7 } } });
    await source.load(client, "dl", ref("c1"), 8);
    expect(open).toHaveBeenCalledTimes(1);
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it("says an object is too large rather than downloading it", async () => {
    const { extract, source, client } = setup();
    expect(await source.load(client, "dl", ref("c1"), 9)).toEqual({ kind: "too-large", indexCount: 50 });
    expect(extract).not.toHaveBeenCalled();
  });

  it("says an object the catalog lacks is absent", async () => {
    const { source, client } = setup();
    expect(await source.load(client, "dl", ref("c1"), 123)).toEqual({ kind: "absent" });
  });

  it("forgets a failed read, so the next try reads again", async () => {
    const { open, source, client } = setup();
    open.mockRejectedValueOnce(new Error("offline"));
    await expect(source.load(client, "dl", ref("c1"), 7)).rejects.toThrow("offline");
    await expect(source.load(client, "dl", ref("c1"), 7)).resolves.toMatchObject({ kind: "mesh" });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("keeps clients apart", async () => {
    const { open, source } = setup();
    await source.load({} as MikroClient, "dl", ref("c1"), 7);
    await source.load({} as MikroClient, "dl", ref("c1"), 7);
    expect(open).toHaveBeenCalledTimes(2);
  });
});
