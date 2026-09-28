import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { parquetMetadata } from "hyparquet";
import { describe, expect, it } from "vitest";

import { buildFabriksCellIndex } from "../fabriksCatalogs";
import { FabriksCollection, type FabriksTransport } from "../fabriksCollection";
import { parseFabriksManifest, rootLevel } from "../fabriksManifest";
import { groupByRowGroup, planFabriksCells } from "../fabriksPlanner";
import { decodeMorton3 } from "@/mikro/components/scene/platform/parquet/mortonCell";
import { bakeFabriksCollection, type BakeMesh } from "./fabriksBake";
import { buildFabriksPrefix } from "./fabriksPrefix";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__", "raw");

/** A transport over an in-memory prefix — the same seam S3 plugs into. */
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

/** An icosphere-ish mesh: a UV sphere is enough to exercise every cell path. */
const sphere = (objectId: number, centre: [number, number, number], radius: number, segments = 12): BakeMesh => {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  geometry.translate(centre[0], centre[1], centre[2]);
  const merged = geometry.toNonIndexed();
  return {
    objectId,
    positions: new Float32Array(merged.getAttribute("position").array),
    indices: Uint32Array.from({ length: merged.getAttribute("position").count }, (_, i) => i),
  };
};

const triangleArea = (p: ArrayLike<number>, i: ArrayLike<number>, t: number): number => {
  const a = i[t] * 3;
  const b = i[t + 1] * 3;
  const c = i[t + 2] * 3;
  const abx = p[b] - p[a];
  const aby = p[b + 1] - p[a + 1];
  const abz = p[b + 2] - p[a + 2];
  const acx = p[c] - p[a];
  const acy = p[c + 1] - p[a + 1];
  const acz = p[c + 2] - p[a + 2];
  const x = aby * acz - abz * acy;
  const y = abz * acx - abx * acz;
  const z = abx * acy - aby * acx;
  return 0.5 * Math.sqrt(x * x + y * y + z * z);
};

const surfaceArea = (p: ArrayLike<number>, i: ArrayLike<number>): number => {
  let sum = 0;
  for (let t = 0; t + 2 < i.length; t += 3) sum += triangleArea(p, i, t);
  return sum;
};

/** Read the whole collection back through the production reader. */
const readBack = async (files: Map<string, Uint8Array>) => {
  const collection = await FabriksCollection.open(memoryTransport(files));
  const rows = await collection.loadCellCatalog();
  const index = buildFabriksCellIndex(rows, collection.manifest, new THREE.Matrix4());
  const plan = planFabriksCells({
    index,
    frustum: null,
    cameraPosition: null,
    focalPixels: 1,
    pixelBudget: 1,
    maxCells: 1,
    maxIndices: 1,
  });
  const decoded = new Map<string, { positions: Float32Array; indices: Uint32Array | Uint16Array; objectOrdinals: Float32Array }>();
  for (const group of groupByRowGroup(plan.cells)) {
    for (const [key, cell] of await collection.readFetchGroup(group, null)) decoded.set(key, cell);
  }
  return { collection, rows, index, plan, decoded };
};

const schemaSignature = (bytes: Uint8Array) =>
  parquetMetadata(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).schema.map((s) => ({
    name: s.name,
    type: s.type,
    repetition_type: s.repetition_type,
    converted_type: s.converted_type,
    num_children: s.num_children,
  }));

describe("fabriksBake", () => {
  const meshes = [sphere(7, [40, 40, 30], 14), sphere(3, [95, 57, 41], 17)];

  it("refuses unusable input", () => {
    expect(() => bakeFabriksCollection([])).toThrow(/at least one mesh/);
    expect(() => bakeFabriksCollection([{ ...meshes[0], objectId: 0 }])).toThrow(/positive integers/);
    expect(() => bakeFabriksCollection([meshes[0], { ...meshes[1], objectId: 7 }])).toThrow(/used twice/);
  });

  it("translates into a non-negative frame and keeps every Morton code exact", () => {
    const shifted = meshes.map((mesh) => ({ ...mesh, positions: mesh.positions.map((v) => v - 200) }));
    const baked = bakeFabriksCollection(shifted);
    for (let axis = 0; axis < 3; axis++) {
      const min = Math.min(...shifted.flatMap((m) => Array.from(m.positions).filter((_, i) => i % 3 === axis)));
      expect(baked.offset[axis]).toBe(Math.floor(min));
    }
    for (const row of baked.cells) {
      const coords = decodeMorton3(row.cell);
      expect(coords.every((c) => c >= 0)).toBe(true);
      expect(row.bboxMin.every((v) => v >= 0)).toBe(true);
    }
    expect(baked.grid.levels).toBe(1);
    expect(baked.objects.map((o) => [o.objectId, o.ordinal])).toEqual([
      [3, 0],
      [7, 1],
    ]);
  });

  it("splits cells until none exceeds the index cap", () => {
    const coarse = bakeFabriksCollection(meshes, { maxIndicesPerCell: 1_000_000 });
    const fine = bakeFabriksCollection(meshes, { maxIndicesPerCell: 60 });
    expect(fine.cells.length).toBeGreaterThan(coarse.cells.length);
    expect(fine.grid.cellSize[0]).toBeLessThan(coarse.grid.cellSize[0]);
    for (const row of fine.cells) expect(row.indexCount).toBeLessThanOrEqual(60);
  });

  it("bakes a single cell on request and reports its quantization", async () => {
    const baked = bakeFabriksCollection(meshes, { cells: "single" });
    expect(baked.cells).toHaveLength(1);
    expect(baked.cells[0].objectCount).toBe(2);
    expect(baked.quantizationVoxels).toBeCloseTo(baked.grid.cellSize[0] / 65535, 9);
    const prefix = buildFabriksPrefix(meshes, { cells: "single" });
    const { decoded, rows } = await readBack(prefix.files);
    expect(rows).toHaveLength(1);
    expect(decoded.size).toBe(1);
  });

  it("round-trips through the production reader", async () => {
    const prefix = buildFabriksPrefix(meshes, { maxIndicesPerCell: 600, rowGroupBytes: 4096 });
    expect([...prefix.files.keys()].at(-1)).toBe("fabriks.json");

    const manifest = parseFabriksManifest(prefix.manifest);
    expect(rootLevel(manifest)).toBe(0);
    expect(manifest.encoding.decimation).toBe("CUSTOM");

    const { rows, plan, decoded, collection } = await readBack(prefix.files);
    // Single level: every root is planned even with a budget of one index.
    expect(plan.cells.length).toBe(rows.length);
    expect(plan.coarsenedRegions).toBe(0);
    expect(decoded.size).toBe(rows.length);
    expect(rows.length).toBeGreaterThan(1);
    expect(new Set(rows.map((r) => r.rowGroup)).size).toBeGreaterThan(1);

    // Surface area is invariant under clipping + welding, per object.
    const tolerance = Math.max(...prefix.baked.grid.cellSize) / 65535;
    const areaByOrdinal = new Map<number, number>();
    for (const [key, cell] of decoded) {
      const row = rows.find((r) => `${r.level}:${r.cell}` === key)!;
      expect(cell.positions.length / 3).toBe(row.vertexCount);
      expect(cell.indices.length).toBe(row.indexCount);
      for (let t = 0; t + 2 < cell.indices.length; t += 3) {
        const ordinal = cell.objectOrdinals[cell.indices[t]];
        expect(cell.objectOrdinals[cell.indices[t + 1]]).toBe(ordinal);
        areaByOrdinal.set(ordinal, (areaByOrdinal.get(ordinal) ?? 0) + triangleArea(cell.positions, cell.indices, t));
      }
      // Every vertex lies inside the cell's catalog bbox (+ quantization).
      for (let v = 0; v < cell.positions.length; v += 3) {
        for (let axis = 0; axis < 3; axis++) {
          expect(cell.positions[v + axis]).toBeGreaterThanOrEqual(row.bboxMin[axis] - tolerance);
          expect(cell.positions[v + axis]).toBeLessThanOrEqual(row.bboxMax[axis] + tolerance);
        }
      }
    }
    const objects = await collection.loadObjectCatalog();
    for (const mesh of meshes) {
      const entry = objects.get(mesh.objectId)!;
      const expected = surfaceArea(mesh.positions, mesh.indices);
      expect(areaByOrdinal.get(entry.ordinal)! / expected).toBeCloseTo(1, 2);
      expect(entry.cells.length).toBeGreaterThan(0);
      expect(new Set(entry.cells.map((c) => c.cell)).size).toBe(entry.cells.length);
      const vertexSum = rows
        .filter((r) => entry.cells.some((c) => c.cell === r.cell))
        .reduce((sum, r) => sum + r.vertexCount, 0);
      expect(entry.vertexCount).toBeLessThanOrEqual(vertexSum);
    }
  });

  it("reproduces vertices exactly (to quantization) when nothing straddles a cell", async () => {
    // One cell of 256 voxels holds the whole sphere: no clipping happens.
    const mesh = sphere(11, [100, 100, 100], 20, 8);
    const prefix = buildFabriksPrefix([mesh], { cellSize: 256 });
    const { decoded, rows } = await readBack(prefix.files);
    expect(rows.length).toBe(1);
    const cell = [...decoded.values()][0];
    const tolerance = 256 / 65535;
    const positions = [...mesh.positions];
    for (let v = 0; v < cell.positions.length; v += 3) {
      let best = Infinity;
      for (let w = 0; w < positions.length; w += 3) {
        const d = Math.max(
          Math.abs(cell.positions[v] - positions[w] + prefix.baked.offset[0]),
          Math.abs(cell.positions[v + 1] - positions[w + 1] + prefix.baked.offset[1]),
          Math.abs(cell.positions[v + 2] - positions[w + 2] + prefix.baked.offset[2]),
        );
        if (d < best) best = d;
      }
      expect(best).toBeLessThanOrEqual(tolerance);
    }
  });

  it("writes the same Parquet schema as the Python producer", async () => {
    const prefix = buildFabriksPrefix(meshes);
    for (const [ours, theirs] of [
      ["level=0/part-00000.parquet", "level=0/part-00000.parquet"],
      ["catalog/cells.parquet", "catalog/cells.parquet"],
      ["catalog/objects.parquet", "catalog/objects.parquet"],
    ]) {
      const fixture = new Uint8Array(await readFile(join(FIXTURES, theirs)));
      expect(schemaSignature(prefix.files.get(ours)!)).toEqual(schemaSignature(fixture));
    }
  });
});
