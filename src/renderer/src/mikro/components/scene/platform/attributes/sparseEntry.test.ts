import { describe, expect, it } from "vitest";
import type { LensLookup } from "@/mikro/lib/lenses/lensSelection";
import { entryDataKeyOf } from "./entryKeys";
import {
  hydrateLayerEntries,
  hydrateSparseEntries,
  hydrateSparseEntry,
  sortedAt,
} from "./sparseEntry";

/** The session registry, as the store sees it: one sparse lens known. */
const lookup: LensLookup = (id) =>
  id === "lens-gene"
    ? {
        kind: "sparse",
        id,
        dataset: "matrix-1",
        at: [{ axis: "gene", value: 4711 }],
      }
    : id === "lens-range"
      ? { kind: "sparse", id, dataset: "matrix-1", at: null }
      : undefined;

const column = { kind: "COLUMN", table: "t1", column: "area", lens: null };
const sparse = { kind: "SPARSE", table: null, column: null, lens: "lens-gene" };

describe("hydrateSparseEntry", () => {
  it("fills the matrix and position a sparse lens stands for", () => {
    expect(hydrateSparseEntry(sparse, lookup)).toEqual({
      ...sparse,
      dataset: "matrix-1",
      at: [{ axis: "gene", value: 4711 }],
    });
  });

  it("leaves a column entry, and an entry already positioned, as the same object", () => {
    expect(hydrateSparseEntry(column, lookup)).toBe(column);
    const draft = { ...sparse, lens: null, dataset: "matrix-1", at: [{ axis: "gene", value: 1 }] };
    expect(hydrateSparseEntry(draft, lookup)).toBe(draft);
  });

  it("leaves an entry whose lens is unknown, or selects a range, untouched", () => {
    const unknown = { ...sparse, lens: "lens-nobody" };
    expect(hydrateSparseEntry(unknown, lookup)).toBe(unknown);
    const range = { ...sparse, lens: "lens-range" };
    expect(hydrateSparseEntry(range, lookup)).toBe(range);
  });
});

describe("hydrateSparseEntries / hydrateLayerEntries", () => {
  it("returns the same array when nothing was filled", () => {
    const entries = [column, column];
    expect(hydrateSparseEntries(entries, lookup)).toBe(entries);
  });

  it("returns the same layer when it carries no sparse entry", () => {
    const image = { id: "l1", channels: [] };
    expect(hydrateLayerEntries(image, lookup)).toBe(image);
    const mesh = { id: "l2", colorBys: [column], filterBys: [] };
    expect(hydrateLayerEntries(mesh, lookup)).toBe(mesh);
  });

  it("fills a mesh layer's pickers and a label layer's, inside its render", () => {
    const mesh = hydrateLayerEntries({ id: "l2", colorBys: [sparse], filterBys: [column] }, lookup);
    expect(mesh.colorBys[0]).toMatchObject({ dataset: "matrix-1" });
    const label = hydrateLayerEntries(
      { id: "l3", labelRender: { seed: 1, colorBys: [column], filterBys: [sparse] } },
      lookup,
    );
    expect(label.labelRender.filterBys[0]).toMatchObject({ dataset: "matrix-1" });
    expect(label.labelRender.seed).toBe(1);
  });

  it("fills a PATCH the same way (a saved layer's pickers come back naming lenses)", () => {
    const patch = hydrateLayerEntries({ colorBys: [sparse], activeColorBy: 0 }, lookup);
    expect(patch.colorBys[0]).toMatchObject({ at: [{ axis: "gene", value: 4711 }] });
    expect(patch.activeColorBy).toBe(0);
  });
});

describe("key stability across a save", () => {
  it("keys a draft and the server's echo of it identically", () => {
    // What a picker holds before Save, and what the store holds after the
    // server answers with a lens id. Same data key ⇒ no LUT or buffer rebuild.
    const draft = {
      kind: "SPARSE",
      dataset: "matrix-1",
      at: sortedAt([{ axis: "gene", value: 4711 }]),
      lens: null,
    };
    const echo = hydrateSparseEntry(sparse, lookup);
    expect(entryDataKeyOf(echo, [])).toBe(entryDataKeyOf(draft, []));
  });

  it("orders a position by axis, whichever way it was picked", () => {
    expect(sortedAt([{ axis: "gene", value: 1 }, { axis: "batch", value: 2 }])).toEqual([
      { axis: "batch", value: 2 },
      { axis: "gene", value: 1 },
    ]);
  });
});
