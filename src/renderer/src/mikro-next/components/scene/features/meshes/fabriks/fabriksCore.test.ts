import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  FabriksFormatError,
  levelParts,
  parseFabriksManifest,
  rootLevel,
} from "./fabriksManifest";
import { cellExtent, cellGridBox, maskedChildren, mortonChildren, mortonParent } from "./fabriksGrid";
import { encodeMorton3, decodeMorton3 } from "@/mikro-next/components/scene/platform/parquet/mortonCell";
import { buildFabriksCellIndex, maxAxisScale, parseCellRow, type FabriksCellRow } from "./fabriksCatalogs";
import { groupByRowGroup, planFabriksCells, screenError } from "./fabriksPlanner";
import { computeSmoothNormals, objectRange, positionStride, indexStride } from "./fabriksDecode";
import { FabriksBatchRenderer } from "./fabriksBatch";
import { FabriksCollection, type FabriksTransport } from "./fabriksCollection";
import { decodeRowGroupSpan } from "./fabriksDecodeCore";
import {
  createFabriksDecodeDispatcher,
  createSyncFabriksDecodeDispatcher,
  type FabriksDecodeDispatcher,
} from "./fabriksDecodeDispatcher";
import { FabriksCollectionManager } from "./fabriksManager";
import { createFabriksMaterial, setInstanceColoring } from "./fabriksMaterial";
import { INSTANCE_COLORMAPS } from "../../../platform/gpu/instanceColormaps";
import { LruByteCache } from "@/mikro-next/components/scene/platform/parquet/lruByteCache";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/** A transport over a fixture directory — the same seam S3 plugs into. */
const fixtureTransport = (variant: string): FabriksTransport => {
  const root = join(FIXTURES, variant);
  return {
    async get(path) {
      return new Uint8Array(await readFile(join(root, path)));
    },
    async getRange(path, start, end) {
      const bytes = new Uint8Array(await readFile(join(root, path)));
      return bytes.subarray(start, end);
    },
  };
};

const RAW_MANIFEST = JSON.parse(
  await readFile(join(FIXTURES, "raw", "fabriks.json"), "utf8"),
) as Record<string, unknown>;

// --------------------------------------------------------------------------
describe("fabriksManifest", () => {
  it("parses the fixture the real writer produced", () => {
    const manifest = parseFabriksManifest(RAW_MANIFEST);
    expect(manifest.specVersion).toBeTruthy();
    expect(manifest.grid.cellSize).toEqual([64, 64, 32]);
    expect(manifest.grid.levels).toBe(3);
    expect(manifest.encoding.positions).toBe("UINT16_QUANTIZED_PER_CELL");
    expect(manifest.encoding.codec).toBe("NONE");
    expect(manifest.cells.path).toBe("catalog/cells.parquet");
    expect(manifest.cells.bytes).toBeGreaterThan(0);
    expect(levelParts(manifest, 0)[0].rowGroups).toBeGreaterThan(1);
    expect(rootLevel(manifest)).toBe(2);
  });

  it("records the spec version without gating on it", () => {
    // The writer and the deployment are both at 1 and every change so far
    // landed inside it, so the label carries no decision. `encoding` is the
    // check that actually protects decoding.
    for (const version of ["1", "2", "9"]) {
      expect(parseFabriksManifest({ ...RAW_MANIFEST, specVersion: version }).specVersion).toBe(version);
    }
  });

  it("refuses an encoding missing a key instead of defaulting it", () => {
    const { codec: _dropped, ...rest } = RAW_MANIFEST.encoding as Record<string, unknown>;
    expect(() => parseFabriksManifest({ ...RAW_MANIFEST, encoding: rest })).toThrow(/omits codec/);
  });

  it("refuses MESHOPT paired with ZSTD, which is undecodable", () => {
    const encoding = { ...(RAW_MANIFEST.encoding as object), codec: "MESHOPT", compression: "ZSTD" };
    expect(() => parseFabriksManifest({ ...RAW_MANIFEST, encoding })).toThrow(/cannot be decoded/);
  });

  it("refuses a manifest whose files name no levels, because we cannot list a prefix", () => {
    const files = { ...(RAW_MANIFEST.files as object), levels: undefined };
    expect(() => parseFabriksManifest({ ...RAW_MANIFEST, files })).toThrow(/cannot list/);
  });

  it("accepts a bare path string as a file entry", () => {
    const files = { ...(RAW_MANIFEST.files as Record<string, unknown>), cells: "catalog/cells.parquet" };
    const manifest = parseFabriksManifest({ ...RAW_MANIFEST, files });
    expect(manifest.cells).toEqual({ path: "catalog/cells.parquet", bytes: null, rowGroups: null });
  });
});

// --------------------------------------------------------------------------
describe("morton cells and the octree", () => {
  it("round-trips coordinates", () => {
    for (const triple of [[0, 0, 0], [1, 2, 3], [37, 12, 99]] as const) {
      expect(decodeMorton3(encodeMorton3(...triple))).toEqual([...triple]);
    }
  });

  it("interleaves with component 0 least significant", () => {
    expect(encodeMorton3(1, 0, 0)).toBe(1);
    expect(encodeMorton3(0, 1, 0)).toBe(2);
    expect(encodeMorton3(0, 0, 1)).toBe(4);
  });

  it("children of c are exactly 8c+octant, so descent needs no decode", () => {
    // The identity the whole child_mask descent rests on.
    const [i, j, k] = [5, 3, 9];
    const parent = encodeMorton3(i, j, k);
    for (let octant = 0; octant < 8; octant++) {
      const child = encodeMorton3(2 * i + (octant & 1), 2 * j + ((octant >> 1) & 1), 2 * k + ((octant >> 2) & 1));
      expect(child).toBe(parent * 8 + octant);
    }
    expect(mortonChildren(parent)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((o) => parent * 8 + o));
    expect(mortonParent(parent * 8 + 5)).toBe(parent);
  });

  it("child_mask names only the children that carry geometry", () => {
    expect(maskedChildren(3, 0)).toEqual([]);
    expect(maskedChildren(3, 0b1000_0001)).toEqual([24, 31]);
    expect(maskedChildren(0, 0b1111_1111)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("a level-L cell spans cellSize·2^L voxels", () => {
    const grid = { cellSize: [64, 64, 32] as [number, number, number], levels: 3, sortKey: "MORTON" as const };
    expect(cellExtent(grid, 0)).toEqual([64, 64, 32]);
    expect(cellExtent(grid, 2)).toEqual([256, 256, 128]);
    // cell 1 is (1,0,0) on its level's grid
    expect(cellGridBox(grid, 0, 1)).toEqual({ min: [64, 0, 0], max: [128, 64, 32] });
  });
});

// --------------------------------------------------------------------------
describe("fabriksDecode arithmetic", () => {
  it("uses stride 6 for raw blobs and 8 for meshopt", () => {
    // The single most consequential number in the port: fabriks writes three
    // bare uint16 (6 B), and only pads to 8 under meshopt's stride rule.
    expect(positionStride("NONE")).toBe(6);
    expect(positionStride("MESHOPT")).toBe(8);
    expect(indexStride("UINT32")).toBe(4);
    expect(indexStride("UINT16")).toBe(2);
  });

  it("treats offsets as START offsets of length n, not n+1 fenceposts", () => {
    // fabriks writes [0, 17, 32] for three objects in a 48-vertex cell — the
    // last object's end is the total, not a further entry.
    const offsets = [0, 17, 32];
    expect(objectRange(offsets, 0, 48)).toEqual({ start: 0, end: 17 });
    expect(objectRange(offsets, 1, 48)).toEqual({ start: 17, end: 32 });
    expect(objectRange(offsets, 2, 48)).toEqual({ start: 32, end: 48 });
  });
});

// --------------------------------------------------------------------------
describe("world-space cell index", () => {
  const manifest = parseFabriksManifest(RAW_MANIFEST);
  const row = (over: Partial<FabriksCellRow>): FabriksCellRow => ({
    level: 2, cell: 0, vertexCount: 10, indexCount: 30,
    bboxMin: [0, 0, 0], bboxMax: [10, 10, 10],
    lodError: 2, objectCount: 1, childMask: 0,
    part: 0, rowGroup: 0, blobBytes: 100, ...over,
  });

  it("takes the max basis length, so anisotropy can only over-refine", () => {
    const matrix = new THREE.Matrix4().makeScale(1, 1, 5);
    expect(maxAxisScale(matrix)).toBe(5);
  });

  it("transforms boxes and scales lodError into world units", () => {
    const matrix = new THREE.Matrix4().makeScale(1, 1, 5);
    const index = buildFabriksCellIndex([row({})], manifest, matrix);
    expect(index.cells[0].worldMax).toEqual([10, 10, 50]);
    // A voxel error of 2 is worth 10 world units along the tall axis.
    expect(index.cells[0].worldLodError).toBe(10);
  });

  it("falls back to the coarsest level present when the declared root is empty", () => {
    const index = buildFabriksCellIndex([row({ level: 1, cell: 3 })], manifest, new THREE.Matrix4());
    expect(index.roots.map((entry) => entry.level)).toEqual([1]);
  });
});

// --------------------------------------------------------------------------
describe("fabriksPlanner", () => {
  const manifest = parseFabriksManifest(RAW_MANIFEST);
  const identity = new THREE.Matrix4();

  /** A two-level pyramid: one root with two children that carry geometry. */
  const rows: FabriksCellRow[] = [
    { level: 1, cell: 0, vertexCount: 40, indexCount: 120, bboxMin: [0, 0, 0], bboxMax: [128, 128, 64],
      lodError: 8, objectCount: 2, childMask: 0b0000_0011, part: 0, rowGroup: 0, blobBytes: 400 },
    { level: 0, cell: 0, vertexCount: 30, indexCount: 90, bboxMin: [0, 0, 0], bboxMax: [64, 64, 32],
      lodError: 0.1, objectCount: 1, childMask: 0, part: 0, rowGroup: 0, blobBytes: 300 },
    { level: 0, cell: 1, vertexCount: 30, indexCount: 90, bboxMin: [64, 0, 0], bboxMax: [128, 64, 32],
      lodError: 0.1, objectCount: 1, childMask: 0, part: 0, rowGroup: 1, blobBytes: 300 },
  ];
  const index = buildFabriksCellIndex(rows, manifest, identity);
  const base = {
    index, frustum: null, focalPixels: 540, pixelBudget: 1, maxCells: 64,
  } as const;

  it("keeps a far region coarse and refines a near one", () => {
    const far = planFabriksCells({ ...base, cameraPosition: [64, 64, 100_000] });
    expect(far.cells.map((c) => c.level)).toEqual([1]);

    const near = planFabriksCells({ ...base, cameraPosition: [64, 64, 100] });
    expect(near.cells.map((c) => c.level).sort()).toEqual([0, 0]);
  });

  it("returns Infinity for a camera inside the box, so it always refines", () => {
    const root = index.byKey.get("1:0")!;
    expect(screenError(root, [10, 10, 10], 540)).toBe(Number.POSITIVE_INFINITY);
  });

  it("degrades to a coarser cell rather than dropping geometry when out of budget", () => {
    const plan = planFabriksCells({ ...base, cameraPosition: [64, 64, 100], maxCells: 1 });
    // The region is still covered — just coarsely. A dropped cell would be a
    // hole in a surface, which reads as corruption rather than a lower setting.
    expect(plan.cells).toHaveLength(1);
    expect(plan.cells[0].level).toBe(1);
    expect(plan.coarsenedRegions).toBe(1);
  });

  it("keeps a coarse cell where the pyramid has no finer geometry", () => {
    const sparse = buildFabriksCellIndex([{ ...rows[0], childMask: 0 }], manifest, identity);
    const plan = planFabriksCells({ ...base, index: sparse, cameraPosition: [64, 64, 100] });
    expect(plan.cells.map((c) => c.key)).toEqual(["1:0"]);
  });

  it("culls against the exact geometry box, not the cell address box", () => {
    const away = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().makeTranslation(1e6, 1e6, 1e6),
    );
    expect(planFabriksCells({ ...base, frustum: away, cameraPosition: [0, 0, 0] }).cells).toHaveLength(0);
  });

  it("holds a level inside the hysteresis band so a settled camera cannot flap", () => {
    // Camera placed so the root sits just inside the refine threshold.
    const root = index.byKey.get("1:0")!;
    const eye: [number, number, number] = [64, 64, 64 + root.worldLodError * 540];
    const wasDrawn = planFabriksCells({ ...base, cameraPosition: eye, previousKeys: new Set(["1:0"]) });
    expect(wasDrawn.cells.map((c) => c.key)).toEqual(["1:0"]);
  });

  it("coarsens rather than refines past the index budget", () => {
    // Refining the root swaps its 120 indices for the children's 180; a cap
    // between the two must keep the root — a complete covering, just coarse.
    const capped = planFabriksCells({ ...base, cameraPosition: [64, 64, 100], maxIndices: 150 });
    expect(capped.cells.map((c) => c.key)).toEqual(["1:0"]);
    expect(capped.coarsenedRegions).toBe(1);

    const roomy = planFabriksCells({ ...base, cameraPosition: [64, 64, 100], maxIndices: 180 });
    expect(roomy.cells.map((c) => c.level).sort()).toEqual([0, 0]);
    expect(roomy.coarsenedRegions).toBe(0);
  });

  it("groups planned cells by the row group that holds them", () => {
    const groups = groupByRowGroup([index.byKey.get("0:0")!, index.byKey.get("0:1")!]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.rowGroup)).toEqual([0, 1]);

    const shared = groupByRowGroup([index.byKey.get("0:0")!, index.byKey.get("1:0")!]);
    expect(shared).toHaveLength(2); // different levels never share a row group
  });
});

// --------------------------------------------------------------------------
describe("FabriksCollection against fixtures written by fabriks itself", () => {
  for (const variant of ["raw", "zstd", "meshopt"] as const) {
    it(`opens, plans and decodes the ${variant} collection`, async () => {
      const collection = await FabriksCollection.open(fixtureTransport(variant));
      expect(collection.manifest.specVersion).toBeTruthy();

      const rows = await collection.loadCellCatalog();
      expect(rows.length).toBeGreaterThan(0);
      const index = buildFabriksCellIndex(rows, collection.manifest, new THREE.Matrix4());

      const plan = planFabriksCells({
        index, frustum: null, cameraPosition: [100, 100, 200],
        focalPixels: 540, pixelBudget: 1, maxCells: 512,
      });
      expect(plan.cells.length).toBeGreaterThan(0);

      // meshopt blobs need a decoder; the raw paths must not.
      const decoder =
        collection.manifest.encoding.codec === "MESHOPT"
          ? (await import("three/examples/jsm/libs/meshopt_decoder.module.js")).MeshoptDecoder
          : null;
      if (decoder) await (decoder as unknown as { ready: Promise<void> }).ready;

      // Decode the WHOLE plan, not one group: the locator only earns its
      // keep when several row groups are involved, and the fixtures are
      // written with a small row-group budget precisely to force that.
      const groups = groupByRowGroup(plan.cells);
      expect(groups.length).toBeGreaterThan(1);
      const decoded = new Map<string, Awaited<ReturnType<typeof collection.readFetchGroup>> extends Map<string, infer V> ? V : never>();
      for (const group of groups) {
        for (const [key, cell] of await collection.readFetchGroup(group, decoder)) decoded.set(key, cell);
      }
      // Every planned cell must come back — a missing one is a hole.
      expect(decoded.size).toBe(plan.cells.length);

      for (const [key, cell] of decoded) {
        const entry = index.byKey.get(key)!;
        expect(cell.positions).toHaveLength(entry.vertexCount * 3);
        expect(cell.indices).toHaveLength(entry.indexCount);
        expect(cell.objectOrdinals).toHaveLength(entry.vertexCount);
        // Every vertex must land inside the exact bounds the catalog declares,
        // give or take one quantization step of the cell's grid box.
        const step = cellGridBox(collection.manifest.grid, entry.level, entry.cell);
        const slack = (step.max[0] - step.min[0]) / 65535 + 1e-6;
        for (let v = 0; v < entry.vertexCount; v++) {
          for (const axis of [0, 1, 2] as const) {
            expect(cell.positions[v * 3 + axis]).toBeGreaterThanOrEqual(entry.bboxMin[axis] - slack);
            expect(cell.positions[v * 3 + axis]).toBeLessThanOrEqual(entry.bboxMax[axis] + slack);
          }
        }
        // Indices address the cell's concatenated vertex array.
        for (const i of cell.indices) expect(i).toBeLessThan(entry.vertexCount);
      }
    });
  }

  it("reads ONE ranged span per row group, not one per column chunk", async () => {
    let rangeReads = 0;
    const base = fixtureTransport("raw");
    const counting: FabriksTransport = {
      get: base.get,
      getRange: (path, start, end) => {
        rangeReads++;
        return base.getRange(path, start, end);
      },
    };
    const collection = await FabriksCollection.open(counting);
    const rows = await collection.loadCellCatalog();
    const index = buildFabriksCellIndex(rows, collection.manifest, new THREE.Matrix4());
    const plan = planFabriksCells({
      index, frustum: null, cameraPosition: [100, 100, 200],
      focalPixels: 540, pixelBudget: 1, maxCells: 512,
    });
    const groups = groupByRowGroup(plan.cells);

    // First read out of a part: the footer (one tail read for these small
    // fixtures) plus the group's span. Ten geometry columns would cost ten
    // reads if hyparquet's per-column slices hit the wire.
    rangeReads = 0;
    await collection.readFetchGroup(groups[0], null);
    expect(rangeReads).toBeLessThanOrEqual(3);

    // Second group of the SAME part: footer cached, so exactly the span.
    const sibling = groups.find(
      (g) => g.level === groups[0].level && g.part === groups[0].part && g.rowGroup !== groups[0].rowGroup,
    );
    expect(sibling).toBeDefined(); // the fixtures force multi-row-group parts
    rangeReads = 0;
    await collection.readFetchGroup(sibling!, null);
    expect(rangeReads).toBe(1);
  });

  it("reads the object catalog's list<struct<>> inverted index", async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const objects = await collection.loadObjectCatalog();
    // The fixture's sparse instance ids, written through unchanged.
    expect([...objects.keys()].sort((a, b) => a - b)).toEqual([3, 7, 11, 42, 108, 4711]);

    const ordinals = [...objects.values()].map((o) => o.ordinal).sort((a, b) => a - b);
    expect(ordinals).toEqual([0, 1, 2, 3, 4, 5]); // dense, 0-based — the LUT index

    const one = objects.get(4711)!;
    expect(one.cells.length).toBeGreaterThan(0);
    for (const ref of one.cells) {
      expect(Number.isInteger(ref.level)).toBe(true);
      expect(Number.isInteger(ref.cell)).toBe(true);
    }
  });

  it("reports a prefix with no manifest as an interrupted write", async () => {
    const empty: FabriksTransport = {
      get: async () => { throw new Error("404"); },
      getRange: async () => new Uint8Array(),
    };
    await expect(FabriksCollection.open(empty)).rejects.toThrow(/interrupted write/);
  });
});

// --------------------------------------------------------------------------
describe("fabriksDecodeCore across the worker boundary", () => {
  const planFirstGroup = async (collection: FabriksCollection) => {
    const rows = await collection.loadCellCatalog();
    const index = buildFabriksCellIndex(rows, collection.manifest, new THREE.Matrix4());
    const plan = planFabriksCells({
      index, frustum: null, cameraPosition: [100, 100, 200],
      focalPixels: 540, pixelBudget: 1, maxCells: 512,
    });
    return groupByRowGroup(plan.cells)[0];
  };

  for (const variant of ["raw", "zstd", "meshopt"] as const) {
    it(`the ${variant} decode request survives structuredClone — the worker contract`, async () => {
      const collection = await FabriksCollection.open(fixtureTransport(variant));
      const group = await planFirstGroup(collection);
      const decoder =
        collection.manifest.encoding.codec === "MESHOPT"
          ? (await import("three/examples/jsm/libs/meshopt_decoder.module.js")).MeshoptDecoder
          : null;
      if (decoder) await (decoder as unknown as { ready: Promise<void> }).ready;

      // Once inline, once through the exact copy a worker would receive.
      const direct = await collection.readFetchGroupVia(group, (request) =>
        decodeRowGroupSpan(request, decoder),
      );
      const cloned = await collection.readFetchGroupVia(group, (request) =>
        decodeRowGroupSpan(structuredClone(request), decoder),
      );
      expect(direct.size).toBeGreaterThan(0);
      expect(cloned.size).toBe(direct.size);
      for (const [key, cell] of direct) {
        const twin = cloned.get(key)!;
        expect(twin.positions).toEqual(cell.positions);
        expect(twin.indices).toEqual(cell.indices);
        expect(twin.objectOrdinals).toEqual(cell.objectOrdinals);
        expect(twin.bytes).toBe(cell.bytes);
      }
    });
  }

  it("computeSmoothNormals: CCW triangle → +z, unreferenced vertices stay zero", () => {
    // One CCW triangle in the xy-plane; a fourth vertex no index touches must
    // keep a ZERO normal (three's `length() || 1` normalize), not NaN.
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5]);
    const normals = computeSmoothNormals(positions, new Uint32Array([0, 1, 2]));
    for (const v of [0, 1, 2]) {
      expect(normals[v * 3]).toBeCloseTo(0);
      expect(normals[v * 3 + 1]).toBeCloseTo(0);
      expect(normals[v * 3 + 2]).toBeCloseTo(1);
    }
    expect([...normals.slice(9)]).toEqual([0, 0, 0]);
  });

  it("computes smooth normals in the decode, matching three's computeVertexNormals", async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const group = await planFirstGroup(collection);

    const plain = await collection.readFetchGroupVia(group, (request) =>
      decodeRowGroupSpan(request, null),
    );
    const withNormals = await collection.readFetchGroupVia(
      group,
      (request) => decodeRowGroupSpan(request, null),
      { computeNormals: true },
    );

    expect(withNormals.size).toBe(plain.size);
    for (const [key, cell] of withNormals) {
      const bare = plain.get(key)!;
      // Flat requests carry no normals at all; smooth requests carry one per
      // vertex and account for them in the cache bytes.
      expect(bare.normals).toBeUndefined();
      expect(cell.normals).toHaveLength(cell.positions.length);
      expect(cell.bytes).toBe(bare.bytes + cell.normals!.byteLength);

      // Parity with three: the worker math and the main-thread fallback must
      // never disagree across cells.
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(cell.positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(cell.indices, 1));
      geometry.computeVertexNormals();
      const reference = geometry.getAttribute("normal").array as Float32Array;
      for (let i = 0; i < reference.length; i++) {
        expect(cell.normals![i]).toBeCloseTo(reference[i], 5);
      }
      geometry.dispose();
    }
  });

  it("falls back to the sync dispatcher where Worker does not exist (vitest/node)", async () => {
    expect(typeof Worker).toBe("undefined");
    const dispatcher = createFabriksDecodeDispatcher();
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const group = await planFirstGroup(collection);
    const decoded = await collection.readFetchGroupVia(group, (request) =>
      dispatcher.decode(request, async () => null),
    );
    expect(decoded.size).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------------------
describe("FabriksCollectionManager against the raw fixture", () => {
  const VIEW = {
    frustum: null,
    cameraPosition: [100, 100, 200] as [number, number, number],
    focalPixels: 540,
  };

  const openManager = async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    const manager = new FabriksCollectionManager({
      collection,
      loadDecoder: async () => null, // the raw fixture's codec is NONE
      onInvalidate: () => {},
    });
    await manager.ensureIndex();
    return manager;
  };

  /** The drain is fire-and-forget; poll until it reports itself complete. */
  const drained = async (manager: FabriksCollectionManager) => {
    for (let i = 0; i < 200; i++) {
      if (manager.buildDebugReport().stats.completeMs > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("drain did not complete");
  };

  it("plans, streams and mounts every planned cell, with the stats to prove it", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);

    const report = manager.buildDebugReport();
    expect(report.lastPlan).not.toBeNull();
    expect(report.mountedCells).toBe(report.lastPlan!.cellCount);
    expect(report.stats.plans).toBe(1);
    expect(report.stats.decodedCells).toBe(report.lastPlan!.cellCount);
    expect(report.stats.streamMs).toBeGreaterThan(0);
    expect(report.stats.buildMs).toBeGreaterThan(0);
    expect(report.cache.cells).toBe(report.lastPlan!.cellCount);
    expect(report.cache.bytes).toBeGreaterThan(0);
    expect(report.catalog!.cells).toBeGreaterThan(0);
    // Batched by default: the whole plan is ONE render object, and it is
    // visible only now that it holds geometry.
    expect(report.batch!.instances).toBe(report.lastPlan!.cellCount);
    const batches = manager.group.children.filter(
      (c): c is THREE.BatchedMesh => c instanceof THREE.BatchedMesh,
    );
    expect(batches).toHaveLength(1);
    expect(batches[0].visible).toBe(true);
    manager.dispose();
  });

  it("smooth-mode streaming takes its normals from the decode, not the main thread", async () => {
    const manager = await openManager();
    manager.setFlatNormals(false); // BEFORE the plan: every decode carries normals
    manager.updatePlan(VIEW);
    await drained(manager);

    const report = manager.buildDebugReport();
    expect(report.mountedCells).toBe(report.lastPlan!.cellCount);
    // `normalsMs` brackets the main-thread computeVertexNormals FALLBACK
    // (toggle races) and the toggle retrofit — a clean smooth-mode stream
    // must never enter either.
    expect(report.stats.normalsMs).toBe(0);
    manager.dispose();
  });

  it("a replan mid-decode abandons the stale drain and still completes the new plan", async () => {
    const collection = await FabriksCollection.open(fixtureTransport("raw"));
    let inFlight = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sync = createSyncFabriksDecodeDispatcher();
    // Every decode hangs on the gate until released — a stand-in for slow
    // workers, so the replan reliably lands mid-drain.
    const dispatcher: FabriksDecodeDispatcher = {
      decode: async (request, loadDecoder) => {
        inFlight++;
        await gate;
        return sync.decode(request, loadDecoder);
      },
      dispose: () => {},
    };
    const manager = new FabriksCollectionManager({
      collection,
      loadDecoder: async () => null,
      onInvalidate: () => {},
      decodeDispatcher: dispatcher,
    });
    await manager.ensureIndex();
    manager.updatePlan(VIEW);
    for (let i = 0; i < 200 && inFlight === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(inFlight).toBeGreaterThan(0);

    // Supersede while the decodes hang, then let everything through.
    manager.updatePlan({ ...VIEW, cameraPosition: [10, 10, 20] });
    release();
    await drained(manager);

    const report = manager.buildDebugReport();
    expect(report.stats.abortedDrains).toBeGreaterThan(0);
    // The replacement plan is COMPLETE: the abandoned drain neither mounted
    // stale work nor stranded the new plan's missing cells (the drain loop
    // continues into `pendingView` on staleness rather than exiting).
    expect(report.stats.plans).toBe(2);
    expect(report.mountedCells).toBe(report.lastPlan!.cellCount);
    manager.dispose();
  });

  it("hide/show keeps every byte: no refetch, remount straight from cache", async () => {
    const transport = fixtureTransport("raw");
    let rangeGets = 0;
    const counting: FabriksTransport = {
      get: transport.get,
      getRange: async (path, start, end) => {
        rangeGets++;
        return transport.getRange(path, start, end);
      },
    };
    const collection = await FabriksCollection.open(counting);
    const manager = new FabriksCollectionManager({
      collection,
      loadDecoder: async () => null,
      onInvalidate: () => {},
    });
    await manager.ensureIndex();
    manager.updatePlan(VIEW);
    await drained(manager);
    const mounted = manager.buildDebugReport().mountedCells;
    expect(mounted).toBeGreaterThan(0);
    const fetchedWhileVisible = rangeGets;

    manager.setVisible(false);
    expect(manager.group.visible).toBe(false);
    // Settles while hidden are RECORDED (for the re-show) but never planned,
    // fetched or decoded.
    const plansBefore = manager.buildDebugReport().stats.plans;
    manager.updatePlan(VIEW);
    expect(manager.buildDebugReport().stats.plans).toBe(plansBefore);
    expect(rangeGets).toBe(fetchedWhileVisible);

    manager.setVisible(true);
    expect(manager.group.visible).toBe(true);
    // Showing does not plan by itself: `CollectionDriver.update` owns the show
    // edge for both collection formats (planning here too would run the whole
    // plan+drain twice per toggle). This is that call.
    expect(manager.buildDebugReport().stats.plans).toBe(plansBefore);
    manager.updatePlan(VIEW);
    // The re-show replans from the caches: same cells mounted, and NOT ONE
    // more ranged GET — this is what keeping the manager alive across
    // `visible: false` buys.
    expect(manager.buildDebugReport().stats.plans).toBe(plansBefore + 1);
    expect(manager.buildDebugReport().mountedCells).toBe(mounted);
    expect(rangeGets).toBe(fetchedWhileVisible);
    manager.dispose();
  });

  it("clips to the 2D slab as an overlay and restores the 3D state", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);

    manager.setSlabClip({ z: 12, thickness: 2 });
    expect(manager.buildDebugReport().slab).toEqual({ z: 12, thickness: 2 });
    const batch = manager.group.children.find(
      (c): c is THREE.BatchedMesh => c instanceof THREE.BatchedMesh,
    )!;
    expect(batch.renderOrder).toBe(2); // overlay: above the image quad
    // Clipping rides the GROUP: the WebGPU node path only reads planes from
    // a ClippingGroup, never from material.clippingPlanes.
    expect(manager.group.enabled).toBe(true);
    expect(manager.group.clippingPlanes).toHaveLength(2);
    expect(manager.group.clippingPlanes[0].constant).toBe(13); // keeps z ≤ 13
    expect(manager.group.clippingPlanes[1].constant).toBe(-11); // keeps z ≥ 11

    // Z-scrub with the slab on: constants only, same clip state.
    const planes = manager.group.clippingPlanes;
    manager.setSlabClip({ z: 20, thickness: 2 });
    expect(manager.buildDebugReport().slab).toEqual({ z: 20, thickness: 2 });
    expect(manager.group.clippingPlanes).toBe(planes); // same array, mutated
    expect(planes[0].constant).toBe(21);
    expect(planes[1].constant).toBe(-19);

    manager.setSlabClip(null);
    expect(manager.buildDebugReport().slab).toBeNull();
    expect(manager.group.enabled).toBe(false);
    expect(batch.renderOrder).toBe(0);
    manager.dispose();
  });

  it("an ortho errorBudget coarsens the plan the camera-free path would fully refine", async () => {
    const manager = await openManager();
    // No eye, no budget: the planner refines to the finest level everywhere.
    manager.updatePlan({ frustum: null, cameraPosition: null, focalPixels: 0 });
    const fine = manager.buildDebugReport().lastPlan!;

    // A huge world-space error allowance keeps everything coarse.
    manager.updatePlan({
      frustum: null,
      cameraPosition: null,
      focalPixels: 0,
      errorBudget: 1e9,
    });
    const coarse = manager.buildDebugReport().lastPlan!;
    expect(coarse.cellCount).toBeLessThan(fine.cellCount);
    manager.dispose();
  });

  it("colors by instance by default; only an EXPLICIT opt-out goes uniform", async () => {
    const manager = await openManager();
    expect(manager.getAppliedColormap()).toBe("hues");

    // A stored materialColor decides nothing on its own — instance stays.
    manager.setMaterialConfig({ color: [255, 0, 0], wireframe: false, opacity: 1 });
    expect(manager.getAppliedColormap()).toBe("hues");

    manager.setMaterialConfig({
      color: [255, 0, 0],
      wireframe: false,
      opacity: 1,
      colorByInstance: false,
    });
    expect(manager.getAppliedColormap()).toBeNull();

    manager.setMaterialConfig({
      color: null,
      wireframe: true,
      opacity: 1,
      instanceColormap: "vivid",
      colorByInstance: true,
    });
    expect(manager.getAppliedColormap()).toBe("vivid");
    manager.dispose();
  });

  it("doubleSided flips the material side without disturbing the colormap", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    const batch = manager.group.children.find(
      (c): c is THREE.BatchedMesh => c instanceof THREE.BatchedMesh,
    )!;
    const material = batch.material as THREE.Material;
    expect(material.side).toBe(THREE.DoubleSide); // today's default

    manager.setMaterialConfig({ color: null, wireframe: false, opacity: 1, doubleSided: false });
    expect(material.side).toBe(THREE.FrontSide);
    expect(manager.getAppliedColormap()).toBe("hues"); // coloring untouched

    manager.setMaterialConfig({ color: null, wireframe: false, opacity: 1, doubleSided: true });
    expect(material.side).toBe(THREE.DoubleSide);
    manager.dispose();
  });

  it("setSelection writes uniforms and the report; identify resolves ids from the catalog", async () => {
    let gets = 0;
    const base = fixtureTransport("raw");
    const counting: FabriksTransport = {
      get: (path) => {
        gets++;
        return base.get(path);
      },
      getRange: base.getRange,
    };
    const collection = await FabriksCollection.open(counting);
    const manager = new FabriksCollectionManager({
      collection,
      loadDecoder: async () => null,
      onInvalidate: () => {},
    });

    // The raw fixture's sparse ids over dense ordinals 0..5 (see the object
    // catalog test above); concurrent identifies load the catalog ONCE.
    const getsBefore = gets;
    const entries = await Promise.all(
      [0, 1, 2, 3, 4, 5].map((ordinal) => manager.identifyOrdinal(ordinal)),
    );
    expect(entries.every(Boolean)).toBe(true);
    expect(new Set(entries.map((entry) => entry!.objectId))).toEqual(
      new Set([3, 7, 11, 42, 108, 4711]),
    );
    expect(gets - getsBefore).toBe(1); // objects.parquet read once
    expect(await manager.identifyOrdinal(999)).toBeNull();

    const byId = await manager.identifyObjectId(4711);
    expect(byId!.ordinal).toBe(entries.find((entry) => entry!.objectId === 4711)!.ordinal);

    // The hover hot path: once the catalog resolved, peeking is SYNCHRONOUS.
    expect(manager.peekOrdinal(0)!.objectId).toBe(entries[0]!.objectId);
    expect(manager.peekOrdinal(999)).toBeNull();

    manager.setSelection({ ordinal: 3, isolate: true });
    expect(manager.buildDebugReport().selection).toEqual({ ordinal: 3, isolate: true });
    manager.setSelection(null);
    expect(manager.buildDebugReport().selection).toBeNull();
    manager.dispose();
  });

  it("the selection hull is the catalog bbox in the instance's hue, latest-wins", async () => {
    const manager = await openManager();
    // The hull's objects persist for the manager's lifetime (a fresh material
    // per selection would compile a pipeline per hover); VISIBILITY is what
    // selection toggles.
    const hulls = () =>
      manager.group.children.filter((c) => c.name === "__fabriks-selection-hull__" && c.visible);
    const until = async (predicate: () => boolean) => {
      for (let i = 0; i < 200 && !predicate(); i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      expect(predicate()).toBe(true);
    };

    manager.setSelection({ ordinal: 0, isolate: false });
    await until(() => hulls().length === 1);
    const entry0 = (await manager.identifyOrdinal(0))!;
    const fillOf = (hull: THREE.Object3D) =>
      hull.children.find((c): c is THREE.Mesh => c instanceof THREE.Mesh)!;
    expect(fillOf(hulls()[0]).position.x).toBeCloseTo((entry0.bboxMin[0] + entry0.bboxMax[0]) / 2);
    const firstHull = hulls()[0];
    const firstFillMaterial = fillOf(firstHull).material;

    // Latest-wins under rapid re-selection: the hull must land on ordinal 2.
    manager.setSelection({ ordinal: 1, isolate: false });
    manager.setSelection({ ordinal: 2, isolate: false });
    const entry2 = (await manager.identifyOrdinal(2))!;
    await until(
      () =>
        hulls().length === 1 &&
        Math.abs(fillOf(hulls()[0]).position.x - (entry2.bboxMin[0] + entry2.bboxMax[0]) / 2) <
          1e-6,
    );
    // Reuse, not rebuild: same group, same material instance across selections.
    expect(hulls()[0]).toBe(firstHull);
    expect(fillOf(hulls()[0]).material).toBe(firstFillMaterial);

    manager.setSelection(null);
    expect(hulls()).toHaveLength(0);
    // Re-selecting shows the SAME objects again.
    manager.setSelection({ ordinal: 0, isolate: false });
    await until(() => hulls().length === 1);
    expect(hulls()[0]).toBe(firstHull);
    manager.dispose();
  });

  it("raycast picking reads ordinals from the MERGED batch buffers", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    manager.group.updateMatrixWorld(true);
    const batch = manager.group.children.find(
      (c): c is THREE.BatchedMesh => c instanceof THREE.BatchedMesh,
    )!;

    // Rain rays down over the collection's bounds until one hits.
    batch.computeBoundingBox();
    const box = batch.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const raycaster = new THREE.Raycaster();
    let hit: THREE.Intersection | null = null;
    for (const [ox, oy] of [[0, 0], [0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
      raycaster.set(
        new THREE.Vector3(center.x + ox * size.x, center.y + oy * size.y, box.max.z + 100),
        new THREE.Vector3(0, 0, -1),
      );
      const hits = raycaster.intersectObject(batch, false);
      if (hits.length > 0) {
        hit = hits[0];
        break;
      }
    }
    expect(hit).not.toBeNull();
    // BatchedMesh.raycast windows the SHARED merged buffers via drawRange, so
    // face indices address the batch geometry's own attributes — the property
    // the click-identify path depends on.
    const ordinal = (batch.geometry.getAttribute("objectOrdinal") as THREE.BufferAttribute).getX(
      hit!.face!.a,
    );
    expect([0, 1, 2, 3, 4, 5]).toContain(ordinal);
    expect(await manager.identifyOrdinal(ordinal)).not.toBeNull();
    manager.dispose();
  });

  it("the batching toggle remounts from cache in either direction, refetching nothing", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    const decoded = manager.buildDebugReport().stats.decodedCells;
    const cellCount = manager.buildDebugReport().lastPlan!.cellCount;

    manager.setBatching(false);
    const meshes = manager.group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && !(c instanceof THREE.BatchedMesh),
    );
    expect(meshes).toHaveLength(cellCount);
    expect(manager.buildDebugReport().mountedCells).toBe(cellCount);
    expect(manager.buildDebugReport().batch).toBeNull();

    manager.setBatching(true);
    const report = manager.buildDebugReport();
    expect(report.batch!.instances).toBe(cellCount);
    expect(report.stats.decodedCells).toBe(decoded); // nothing refetched
    manager.dispose();
  });

  it("freeze ignores settles and a thaw replays the newest one", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    expect(manager.buildDebugReport().stats.plans).toBe(1);

    manager.setPlanConfig({ frozen: true });
    manager.updatePlan({ ...VIEW, focalPixels: 5400 });
    expect(manager.buildDebugReport().stats.plans).toBe(1); // ignored

    manager.setPlanConfig({ frozen: false }); // replays the recorded settle
    expect(manager.buildDebugReport().stats.plans).toBe(2);
    manager.dispose();
  });

  it("a pixel-budget change replans immediately against the last settle", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    const fine = manager.buildDebugReport().lastPlan!;

    // A huge budget must coarsen the plan without waiting for a camera move.
    manager.setPlanConfig({ pixelBudget: 1000 });
    const coarse = manager.buildDebugReport().lastPlan!;
    expect(manager.buildDebugReport().stats.plans).toBe(2);
    expect(coarse.cellCount).toBeLessThan(fine.cellCount);
    manager.dispose();
  });

  it("retries a transiently-failed row group once, so a 403 blip leaves no hole", async () => {
    // Every geometry part's FIRST ranged read fails (the expired-grant 403
    // shape); the drain's retry round must still mount the full plan.
    const base = fixtureTransport("raw");
    const failedOnce = new Set<string>();
    const flaky: FabriksTransport = {
      get: base.get,
      getRange: (path, start, end) => {
        if (path.startsWith("level=") && !failedOnce.has(path)) {
          failedOnce.add(path);
          return Promise.reject(new Error("read failed: 403"));
        }
        return base.getRange(path, start, end);
      },
    };
    const collection = await FabriksCollection.open(flaky);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const manager = new FabriksCollectionManager({
        collection,
        loadDecoder: async () => null,
        onInvalidate: () => {},
      });
      await manager.ensureIndex();
      manager.updatePlan(VIEW);
      await drained(manager);

      const report = manager.buildDebugReport();
      expect(report.stats.fetchErrors).toBeGreaterThan(0); // failures happened…
      expect(report.mountedCells).toBe(report.lastPlan!.cellCount); // …and healed
      manager.dispose();
    } finally {
      errors.mockRestore();
    }
  });

  it("a placement change rebuilds the index and replans but never drops the caches", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);
    const before = manager.buildDebugReport();
    expect(before.stats.indexRebuilds).toBe(0);

    // Value-equal placement: a complete no-op, however many times it arrives.
    manager.setVoxelToWorld(new THREE.Matrix4());
    expect(manager.buildDebugReport().stats.indexRebuilds).toBe(0);
    expect(manager.buildDebugReport().stats.plans).toBe(before.stats.plans);

    // A real placement change: index rebuilt, plan re-run — and every cached
    // cell survives, because geometry is in voxel space.
    manager.setVoxelToWorld(new THREE.Matrix4().makeScale(1, 1, 5));
    const after = manager.buildDebugReport();
    expect(after.stats.indexRebuilds).toBe(1);
    expect(after.stats.plans).toBe(before.stats.plans + 1);
    expect(after.cache.cells).toBeGreaterThanOrEqual(before.cache.cells);
    expect(manager.group.matrix.elements[10]).toBe(5);
    manager.dispose();
  });

  it("flat normals by default; the smooth toggle retrofits and rebuilds the batch layout", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);

    // No normals computed or uploaded — the material shades by derivatives,
    // and the batch's fixed attribute layout carries none.
    const batch = () =>
      manager.group.children.find((c): c is THREE.BatchedMesh => c instanceof THREE.BatchedMesh)!;
    expect(batch().geometry.getAttribute("normal")).toBeUndefined();
    expect(manager.buildDebugReport().stats.normalsMs).toBe(0);

    // Smooth: cached geometries gain normals and the batch rebuilds under the
    // widened layout (a fixed-layout batch cannot absorb a new attribute).
    manager.setFlatNormals(false);
    expect(batch().geometry.getAttribute("normal")).toBeDefined();
    expect(manager.buildDebugReport().stats.normalsMs).toBeGreaterThan(0);

    // Back to flat: normals are DELETED from the cache so future decodes
    // (which carry none) still match the batch layout.
    manager.setFlatNormals(true);
    expect(batch().geometry.getAttribute("normal")).toBeUndefined();
    manager.dispose();
  });

  it("the unbatched path shares cache-owned geometry with analytic bounds", async () => {
    const manager = await openManager();
    manager.setBatching(false);
    manager.updatePlan(VIEW);
    await drained(manager);

    const meshes = manager.group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && !(c instanceof THREE.BatchedMesh),
    );
    expect(meshes.length).toBeGreaterThan(0);
    for (const mesh of meshes) {
      expect(mesh.geometry.getAttribute("normal")).toBeUndefined();
      // Bounds come from the catalog, not a walk over the positions.
      expect(mesh.geometry.boundingBox).not.toBeNull();
      expect(mesh.geometry.boundingSphere!.radius).toBeGreaterThan(0);
    }
    manager.dispose();
  });

  it("the cell-box overlay is one LineSegments that survives reconciliation", async () => {
    const manager = await openManager();
    manager.updatePlan(VIEW);
    await drained(manager);

    manager.setShowCellBoxes(true);
    const overlays = () =>
      manager.group.children.filter((child) => child.name === "__fabriks-cell-boxes__");
    expect(overlays()).toHaveLength(1);
    expect(overlays()[0]).toBeInstanceOf(THREE.LineSegments);

    // A replan reconciles cells but must never sweep the overlay away, and
    // the report's mountedCells must not count it.
    manager.updatePlan({ ...VIEW, focalPixels: 100 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(overlays()).toHaveLength(1);
    const report = manager.buildDebugReport();
    expect(report.mountedCells).toBe(report.batch!.instances);

    manager.setShowCellBoxes(false);
    expect(overlays()).toHaveLength(0);
    manager.dispose();
  });
});

// --------------------------------------------------------------------------
describe("fabriks material coloring & selection", () => {
  it("colors by instance by default, builds every colormap, and keeps a colorNode in uniform mode", () => {
    const handle = createFabriksMaterial();
    expect(handle.material.colorNode).not.toBeNull(); // instance-colored by default
    expect(handle.material.flatShading).toBe(true); // derivative normals
    for (const name of INSTANCE_COLORMAPS) {
      setInstanceColoring(handle, name);
      expect(handle.material.colorNode).not.toBeNull();
    }
    // Uniform mode still composes a colorNode (materialColor accessor), so
    // the selection highlight/isolation applies in BOTH modes.
    setInstanceColoring(handle, null);
    expect(handle.material.colorNode).not.toBeNull();
    handle.material.dispose();
  });

  it("selection is uniform writes only — never a material version bump", () => {
    const handle = createFabriksMaterial();
    expect(handle.uniforms.selectedOrdinal.value).toBe(-1);
    expect(handle.uniforms.isolate.value).toBe(0);
    const version = handle.material.version;
    handle.uniforms.selectedOrdinal.value = 42;
    handle.uniforms.isolate.value = 1;
    expect(handle.material.version).toBe(version); // no recompile
    handle.material.dispose();
  });
});

// --------------------------------------------------------------------------
describe("FabriksBatchRenderer", () => {
  it("stays off the render list while empty", () => {
    // A BatchedMesh initializes its attributes on the first addGeometry, so
    // an empty one has no `position` — rendering it makes the WebGPU node
    // builder warn and compile a junk pipeline every frame.
    const material = new THREE.MeshStandardMaterial();
    let mesh: THREE.BatchedMesh | null = null;
    const batch = new FabriksBatchRenderer(material, (next) => {
      mesh = next;
    });
    batch.ensureCapacity(8, 1024, 1024); // plan-time sizing, nothing mounted
    expect(mesh!.visible).toBe(false);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2]), 1));
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    batch.mount("a", geometry);
    expect(mesh!.visible).toBe(true);

    batch.unmount("a");
    expect(mesh!.visible).toBe(false);
    batch.dispose();
    material.dispose();
  });
});

// --------------------------------------------------------------------------
describe("LruByteCache", () => {
  it("evicts least-recently-used unprotected entries over budget", () => {
    const evicted: string[] = [];
    const cache = new LruByteCache<string>(100, (key) => evicted.push(key));
    cache.set("a", "a", 60);
    cache.set("b", "b", 60);
    expect(evicted).toEqual(["a"]);
  });

  it("never evicts protected keys", () => {
    const evicted: string[] = [];
    const cache = new LruByteCache<string>(100, (key) => evicted.push(key));
    cache.set("a", "a", 60);
    cache.protect(["a"]);
    cache.set("b", "b", 60);
    expect(evicted).toEqual([]);
  });
});
