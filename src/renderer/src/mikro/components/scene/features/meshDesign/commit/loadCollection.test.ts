import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { FabriksCollection, type FabriksTransport } from "../../meshes/fabriks/fabriksCollection";
import { buildFabriksPrefix } from "../../meshes/fabriks/writer/fabriksPrefix";
import { loadObjectsFromCollection } from "./loadCollection";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "meshes", "fabriks", "__fixtures__");

const fixtureTransport = (variant: string): FabriksTransport => {
  const root = join(FIXTURES, variant);
  return {
    async get(path) {
      return new Uint8Array(await readFile(join(root, path)));
    },
    async getRange(path, start, end) {
      return new Uint8Array(await readFile(join(root, path))).subarray(start, end);
    },
  };
};

const memoryTransport = (files: Map<string, Uint8Array>): FabriksTransport => ({
  async get(path) {
    const bytes = files.get(path);
    if (!bytes) throw new Error(`no such file ${path}`);
    return bytes;
  },
  async getRange(path, start, end) {
    const bytes = files.get(path);
    if (!bytes) throw new Error(`no such file ${path}`);
    return bytes.subarray(start, end);
  },
});

describe("loadObjectsFromCollection", () => {
  it("extracts one object from the Python-written fixture, inside its catalog bbox", async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const [loaded] = await loadObjectsFromCollection(collection, new THREE.Matrix4(), { objectIds: [7] });
    const entry = (await collection.loadObjectCatalog()).get(7)!;
    expect(loaded.objectId).toBe(7);
    // Welding across LOCKED cell borders can only reduce the vertex count.
    expect(loaded.geometry.positions.length / 3).toBeLessThanOrEqual(entry.vertexCount);
    expect(loaded.geometry.indices.length).toBeGreaterThan(0);
    expect(loaded.geometry.indices.length).toBeLessThanOrEqual(entry.indexCount);
    const tolerance = 64 / 65535 + 1e-3;
    for (let v = 0; v < loaded.geometry.positions.length; v += 3) {
      for (let axis = 0; axis < 3; axis++) {
        expect(loaded.geometry.positions[v + axis]).toBeGreaterThanOrEqual(entry.bboxMin[axis] - tolerance);
        expect(loaded.geometry.positions[v + axis]).toBeLessThanOrEqual(entry.bboxMax[axis] + tolerance);
      }
    }
  });

  it("applies the placement and refuses over the index cap", async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const shift = new THREE.Matrix4().makeTranslation(100, 0, 0);
    const [loaded] = await loadObjectsFromCollection(collection, shift, { objectIds: [3] });
    const entry = (await collection.loadObjectCatalog()).get(3)!;
    expect(loaded.geometry.positions[0]).toBeGreaterThanOrEqual(entry.bboxMin[0] + 100 - 1e-2);
    await expect(loadObjectsFromCollection(collection, shift, { maxIndices: 1 })).rejects.toThrow(/over the/);
  });

  it("round-trips a designed mesh through bake → load", async () => {
    const tri = {
      objectId: 5,
      positions: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0]),
      indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
    };
    const prefix = buildFabriksPrefix([tri], { cellSize: 4 });
    const collection = await FabriksCollection.open(memoryTransport(prefix.files));
    const offset = new THREE.Matrix4().makeTranslation(...prefix.baked.offset);
    const [loaded] = await loadObjectsFromCollection(collection, offset);
    expect(loaded.objectId).toBe(5);
    // The two triangles were clipped into 4-voxel cells and welded back;
    // the surface still spans the same square.
    const box = new THREE.Box3().setFromArray(loaded.geometry.positions);
    expect(box.min.toArray().map((v) => Math.round(v * 100) / 100)).toEqual([0, 0, 0]);
    expect(box.max.toArray().map((v) => Math.round(v * 100) / 100)).toEqual([10, 10, 0]);
  });
});
