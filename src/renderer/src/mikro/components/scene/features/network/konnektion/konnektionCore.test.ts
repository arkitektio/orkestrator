import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { KonnektionCollection } from "./konnektionCollection";
import type { KonnektionTransport } from "./konnektionCollection";
import { parseKonnektionManifest, KonnektionFormatError } from "./konnektionManifest";
import { groupByRowGroup, planKonnektionCells } from "./konnektionPlanner";
import { buildKonnektionCellIndex } from "./konnektionCatalogs";
import { Matrix4 } from "three";

/**
 * The byte contract, asserted against konnektion ITSELF.
 *
 * `__fixtures__/expected.json` holds what the Python reader decodes for every
 * cell of every fixture, so these are two independent implementations of one
 * format compared against each other — not the TS reader compared against its
 * own output. The fixtures are committed BYTES, written by
 * `__fixtures__/generate.py` through the konnektion checkout's venv; nothing
 * here generates them at test time.
 *
 * The `crossing` fixture exists for one assertion: three collinear nodes at
 * x = 8, 24, 40 with 16-voxel cells, so each edge spans two cells and every
 * cell carries exactly one ghost. It is the discriminator for the format's
 * silent failure — a ghost decoded against the box of the cell that STORES it
 * rather than the one that OWNS it lands inside that cell (≈8) instead of
 * where the node really is (24), with no error at any layer.
 */

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/** A transport over a fixture directory — the same seam S3 plugs into. */
const fixtureTransport = (variant: string): KonnektionTransport => {
  const root = join(FIXTURES, variant);
  return {
    get: async (path) => new Uint8Array(await readFile(join(root, path))),
    getRange: async (path, start, end) => {
      const bytes = new Uint8Array(await readFile(join(root, path)));
      return bytes.subarray(start, end);
    },
  };
};

type ExpectedCell = {
  nodeCount: number;
  ghostCount: number;
  positions: number[];
  edges: number[];
  radii: number[] | null;
  objectIds: number[];
  objectNodeOffsets: number[];
  objectGhostOffsets: number[];
};
type Expected = Record<
  string,
  { manifest: Record<string, unknown>; cells: Record<string, ExpectedCell> }
>;

const expected: Expected = JSON.parse(
  await readFile(join(FIXTURES, "expected.json"), "utf8"),
) as Expected;

/** Read every cell of a fixture through the full plan → fetch → decode path. */
const readAllCells = async (variant: string) => {
  const collection = await KonnektionCollection.open(fixtureTransport(variant));
  const rows = await collection.loadCellCatalog();
  const index = buildKonnektionCellIndex(rows, collection.manifest, new Matrix4());
  const decoded = new Map<string, Awaited<ReturnType<typeof collection.readFetchGroup>> extends Map<string, infer V> ? V : never>();
  for (const group of groupByRowGroup(index.cells)) {
    for (const [key, cell] of await collection.readFetchGroup(group)) decoded.set(key, cell);
  }
  return { collection, index, decoded };
};

// Positions come back as Float32Array; Python decodes in float64. The tolerance
// is float32's, not a fudge factor — the two agree exactly to that precision.
const FLOAT32_EPSILON = 1e-3;

describe("konnektion manifest", () => {
  it("parses a real manifest, including the one camel-cased encoding key", async () => {
    const raw = JSON.parse(
      await readFile(join(FIXTURES, "crossing", "konnektion.json"), "utf8"),
    );
    const manifest = parseKonnektionManifest(raw);
    expect(manifest.grid.cellSize).toEqual([16, 16, 16]);
    expect(manifest.grid.levels).toBe(1);
    // `nodeIds` is the ONLY camel-cased key the writer emits. A parser that
    // assumed snake_case throughout would reject every collection ever written.
    expect(manifest.encoding.nodeIds).toBe("UINT64");
    expect(manifest.encoding.edges).toBe("UINT32_PAIRS");
    expect(manifest.encoding.ghosts).toBe("TRAILING_PER_OWNER_CELL");
    expect(manifest.encoding.radii).toBe("NONE");
    // Levels are optional and 1 is the EXPECTED case for traced data, so a
    // single-level collection declares that it coarsened nothing.
    expect(manifest.encoding.pruning).toBe("NONE");
    expect(manifest.encoding.simplification).toBe("NONE");
  });

  it("refuses an encoding that omits the edge arity rather than defaulting it", async () => {
    const raw = JSON.parse(
      await readFile(join(FIXTURES, "crossing", "konnektion.json"), "utf8"),
    ) as { encoding: Record<string, unknown> };
    delete raw.encoding.edges;
    // The arity is the one key whose wrong value produces no error anywhere —
    // a flat uint32 array read as triangles divides evenly and draws nonsense.
    expect(() => parseKonnektionManifest(raw)).toThrow(KonnektionFormatError);
    expect(() => parseKonnektionManifest(raw)).toThrow(/omits edges/);
  });

  it("refuses a manifest with no files at all", () => {
    expect(() => parseKonnektionManifest({ specVersion: "1" })).toThrow(
      KonnektionFormatError,
    );
  });
});

describe("konnektion geometry decode", () => {
  for (const variant of [
    "crossing",
    "arbor",
    "arbor_zstd",
    "two_objects",
    "arbor_qradii",
    "many_groups",
  ] as const) {
    it(`matches the Python decoder cell for cell (${variant})`, async () => {
      const { decoded } = await readAllCells(variant);
      const want = expected[variant].cells;

      expect([...decoded.keys()].sort()).toEqual(Object.keys(want).sort());

      for (const [key, wanted] of Object.entries(want)) {
        const cell = decoded.get(key)!;
        expect(cell.nodeCount, `${key} nodeCount`).toBe(wanted.nodeCount);
        expect(cell.ghostCount, `${key} ghostCount`).toBe(wanted.ghostCount);
        expect([...cell.edges], `${key} edges`).toEqual(wanted.edges);

        expect(cell.positions.length, `${key} position count`).toBe(
          wanted.positions.length,
        );
        for (let i = 0; i < wanted.positions.length; i++) {
          expect(cell.positions[i], `${key} position[${i}]`).toBeCloseTo(
            wanted.positions[i],
            3,
          );
        }

        if (wanted.radii === null) {
          // The columns are absent exactly when the encoding says NONE — a
          // required-but-empty column would be a place to find zeros and
          // believe them.
          expect(cell.radii, `${key} radii`).toBeNull();
        } else {
          expect(cell.radii, `${key} radii`).not.toBeNull();
          for (let i = 0; i < wanted.radii.length; i++) {
            expect(cell.radii![i], `${key} radius[${i}]`).toBeCloseTo(wanted.radii[i], 3);
          }
        }
      }
    });
  }

  it("carries radii only where the encoding declares them", async () => {
    const withRadii = await readAllCells("arbor");
    expect(withRadii.collection.manifest.encoding.radii).toBe("FLOAT32");
    expect([...withRadii.decoded.values()].every((cell) => cell.radii !== null)).toBe(true);

    const without = await readAllCells("crossing");
    expect(without.collection.manifest.encoding.radii).toBe("NONE");
    expect([...without.decoded.values()].every((cell) => cell.radii === null)).toBe(true);
  });

  it("dequantizes UINT16 radii against the cell's LARGEST extent", async () => {
    const { collection, decoded } = await readAllCells("arbor_qradii");
    // The branch with the non-obvious rule: a radius is one scalar and has no
    // axis to be quantized along, so it scales by max(extent), not per-axis.
    // Checked against Python by the cell-for-cell test above; this pins the
    // encoding actually being exercised, since a fixture that silently wrote
    // FLOAT32 would make that test pass for the wrong reason.
    expect(collection.manifest.encoding.radii).toBe("UINT16_QUANTIZED_PER_CELL");
    expect([...decoded.values()].every((cell) => cell.radii !== null)).toBe(true);
    expect([...decoded.values()].some((cell) => cell.radii!.some((r) => r > 0))).toBe(true);
  });

  it("decodes ZSTD blobs, whose length comes from the row's counts", async () => {
    const { collection, decoded } = await readAllCells("arbor_zstd");
    // The format's ZSTD framing carries no size of its own, so a decoder that
    // did not pass the expanded length through would fail here rather than
    // silently truncate.
    expect(collection.manifest.encoding.compression).toBe("ZSTD");
    expect([...decoded.values()].some((cell) => cell.nodeCount > 0)).toBe(true);
  });
});

describe("ghosts", () => {
  it("reconstructs a ghost against its OWNER's box, not the cell that stores it", async () => {
    const { decoded } = await readAllCells("crossing");

    // Cell 0 owns the node at x=8 and ghosts the one at x=24, which cell 1 owns.
    const holder = decoded.get("0:0")!;
    expect(holder.nodeCount).toBe(1);
    expect(holder.ghostCount).toBe(1);

    const ownedX = holder.positions[0];
    const ghostX = holder.positions[3]; // the ghost is the TAIL of the node array
    expect(ownedX).toBeCloseTo(8, 3);

    // THE ASSERTION. Cell 0's grid box is [0, 16); a ghost dequantized against
    // it could not exceed 16 whatever its stored uint16 was. Landing at 24
    // proves the owner's box was used.
    expect(ghostX).toBeGreaterThan(16);
    expect(ghostX).toBeCloseTo(24, 3);

    // And exactness: konnektion guarantees a ghost reconstructs BIT-IDENTICALLY
    // to what the owning cell stores, which is what makes its own
    // verify(tier="topology") an exact check rather than an approximate one.
    // Both go through the same decode path here, so this is `toBe`, not
    // `toBeCloseTo`.
    const owner = decoded.get("0:1")!;
    const ownerFirstX = owner.positions[0];
    expect(ghostX).toBe(ownerFirstX);
    for (let axis = 0; axis < 3; axis++) {
      expect(holder.positions[3 + axis]).toBe(owner.positions[axis]);
    }
  });

  it("keeps every crossing edge whole, in exactly one cell", async () => {
    const { decoded } = await readAllCells("crossing");
    // Two input edges, one owner each — never drawn twice. konnektion assigns an
    // edge to the LOWER Morton code of its endpoints' cells precisely so that a
    // segment does not double-draw along every cell plane.
    const total = [...decoded.values()].reduce((sum, cell) => sum + cell.edgeCount, 0);
    expect(total).toBe(2);
  });

  it("indexes ghosts past nodeCount, and every endpoint resolves", async () => {
    const { decoded } = await readAllCells("crossing");
    for (const cell of decoded.values()) {
      const total = cell.nodeCount + cell.ghostCount;
      for (const index of cell.edges) {
        // A cell is SELF-CONTAINED: fetch it and you can draw it. Every endpoint
        // is either owned here or ghosted here.
        expect(index).toBeLessThan(total);
      }
      // The crossing fixture is built so each edge reaches out of its cell.
      if (cell.edgeCount > 0) {
        expect([...cell.edges].some((index) => index >= cell.nodeCount)).toBe(true);
      }
    }
  });
});

describe("per-object offsets are START offsets, not fenceposts", () => {
  it("keeps every object in a cell that holds more than one", async () => {
    const { decoded } = await readAllCells("two_objects");
    const shared = [...decoded.values()].find((cell) => cell.nodeCount > 0)!;
    const want = expected.two_objects.cells[`${shared.level}:${shared.cell}`];

    // The fixture exists for this: two arbors in one cell.
    expect(want.objectIds.length).toBe(2);
    expect(want.objectNodeOffsets.length).toBe(2);

    // THE ASSERTION. `object_node_offsets` has length n, and the LAST object
    // runs to the end of the span. A reader treating them as n+1 fenceposts
    // reads one object too few — here it would leave every node of the second
    // arbor carrying the first one's ordinal, so the count of distinct ordinals
    // would be 1 instead of 2. Nothing else would look wrong.
    const owned = [...shared.nodeOrdinals.slice(0, shared.nodeCount)];
    expect(new Set(owned).size).toBe(2);

    // And the boundary is where the offsets say, not merely somewhere.
    const [firstStart, secondStart] = want.objectNodeOffsets;
    expect(owned[firstStart]).not.toBe(owned[secondStart]);
    expect(new Set(owned.slice(firstStart, secondStart)).size).toBe(1);
    expect(new Set(owned.slice(secondStart, shared.nodeCount)).size).toBe(1);
  });
});

describe("the row-group locator", () => {
  it("addresses each row group by its cumulative row offset", async () => {
    // Every other fixture has ONE row group, so `rowGroup` is always 0 and a
    // cumulative-offset bug is invisible: the plan's `wanted` filter would just
    // drop the mis-addressed rows and draw a partial network, silently.
    const { collection, index, decoded } = await readAllCells("many_groups");
    const groups = groupByRowGroup(index.cells);
    expect(new Set(groups.map((g) => g.rowGroup)).size).toBeGreaterThan(1);

    // Every catalogued cell came back, from whichever row group holds it — so
    // each locator resolved to the rows it actually names.
    expect(decoded.size).toBe(index.cells.length);
    for (const entry of index.cells) {
      const cell = decoded.get(entry.key);
      expect(cell, `cell ${entry.key} (row group ${entry.rowGroup})`).toBeDefined();
      // The catalog and the geometry agree about this cell, which they could
      // not if the read had landed on a different row group's rows.
      expect(cell!.nodeCount).toBe(entry.nodeCount);
      expect(cell!.edgeCount).toBe(entry.edgeCount);
      expect(cell!.ghostCount).toBe(entry.ghostCount);
    }
    expect(collection.manifest.grid.cellSize).toEqual([8, 8, 8]);
  });
});

describe("the planner draws one level", () => {
  it("selects a single level and groups its cells by row group", async () => {
    const { collection, index } = await readAllCells("arbor");
    const plan = planKonnektionCells({
      index,
      frustum: null,
      cameraPosition: null,
      focalPixels: 0,
      pixelBudget: 4,
      maxCells: 1000,
    });
    // Every selected cell belongs to the plan's ONE level. konnektion makes no
    // boundary claim, so a seam between levels is a missing branch rather than
    // a crack — mixing them would draw a dendrite that stops in mid-air.
    expect(plan.cells.every((cell) => cell.level === plan.level)).toBe(true);
    expect(plan.cells.length).toBeGreaterThan(0);

    const groups = groupByRowGroup(plan.cells);
    // The locator columns exist so several planned cells cost one ranged read.
    expect(groups.length).toBeLessThanOrEqual(plan.cells.length);
    expect(groups.every((group) => group.level === plan.level)).toBe(true);
    expect(collection.manifest.grid.levels).toBeGreaterThanOrEqual(1);
  });

  it("honours maxLevel as a cap on detail", async () => {
    const { index } = await readAllCells("arbor");
    const plan = planKonnektionCells({
      index,
      frustum: null,
      cameraPosition: null,
      focalPixels: 0,
      pixelBudget: 4,
      maxCells: 1000,
      maxLevel: 0,
    });
    expect(plan.level).toBe(0);
  });
});
