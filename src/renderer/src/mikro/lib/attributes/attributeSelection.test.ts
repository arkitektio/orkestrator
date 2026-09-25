import { describe, expect, it } from "vitest";
import {
  EMPTY_SELECTION,
  columnsFor,
  defaultEnabled,
  executeOptionsFor,
  isHopEnabled,
  loadSelection,
  normalizeColumns,
  saveSelection,
  selectHops,
  selectionSignature,
  withHopColumns,
  withHopEnabled,
  withSparseLimit,
  type SelectionStorage,
} from "./attributeSelection";
import { hopKey, type TableHopLike } from "./attributeTypes";
import { chainPlan, sparsePlan, tablePlan } from "./__fixtures__/plans";

const fakeStorage = (initial: Record<string, string> = {}): SelectionStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

describe("defaults", () => {
  it("runs a table landing, not a sparse one", () => {
    expect(defaultEnabled(tablePlan(), tablePlan().hops[0])).toBe(true);
    expect(defaultEnabled(sparsePlan(), sparsePlan().hops[0])).toBe(false);
  });

  it("runs the names hop under a sparse landing, and no other later hop", () => {
    const sparse = sparsePlan();
    expect(defaultEnabled(sparse, sparse.hops[1])).toBe(true);
    const chain = chainPlan();
    expect(defaultEnabled(chain, chain.hops[1])).toBe(false);
    expect(defaultEnabled(chain, chain.hops[2])).toBe(false);
  });

  it("a default-on child still waits for its parent", () => {
    const sparse = sparsePlan();
    expect(selectHops(EMPTY_SELECTION, sparse)).toEqual([]);
    const on = withHopEnabled(EMPTY_SELECTION, hopKey(sparse, sparse.hops[0]), true);
    expect(selectHops(on, sparse).map((hop) => hop.index)).toEqual([0, 1]);
  });
});

describe("isHopEnabled / selectHops", () => {
  it("enabling a child without its parent runs nothing extra", () => {
    const chain = chainPlan();
    const on = withHopEnabled(EMPTY_SELECTION, hopKey(chain, chain.hops[2]), true);
    expect(selectHops(on, chain).map((hop) => hop.index)).toEqual([0, 2]);
    const off = withHopEnabled(on, hopKey(chain, chain.hops[0]), false);
    expect(selectHops(off, chain)).toEqual([]);
    expect(isHopEnabled(off, chain, chain.hops[2])).toBe(false);
  });
});

describe("executeOptionsFor", () => {
  it("hands the executor the selected hops, the projection per hop and the limit", () => {
    const chain = chainPlan();
    const landingKey = hopKey(chain, chain.hops[0]);
    const selection = withSparseLimit(withHopColumns(EMPTY_SELECTION, landingKey, ["area"]), 40);
    const options = executeOptionsFor(selection, chain);
    expect(options.hops?.map((hop) => hop.index)).toEqual([0]);
    expect(options.columnsFor?.(chain.hops[0] as TableHopLike)).toEqual(["area"]);
    expect(options.columnsFor?.(chain.hops[1] as TableHopLike)).toBeNull();
    expect(options.sparseLimit).toBe(40);
    expect(columnsFor(selection, landingKey)).toEqual(["area"]);
  });

  it("normalizes a projection: unknown names dropped, everything = null", () => {
    const hop = chainPlan().hops[0] as TableHopLike;
    expect(normalizeColumns(hop, ["cell_type", "nope"])).toEqual(["cell_type"]);
    expect(normalizeColumns(hop, ["area", "cell_type"])).toBeNull();
    expect(normalizeColumns(hop, null)).toBeNull();
  });
});

describe("selectionSignature", () => {
  it("is empty for the defaults and stable across key order", () => {
    expect(selectionSignature(EMPTY_SELECTION)).toBe("");
    const a = withHopColumns(withHopEnabled(EMPTY_SELECTION, "k1", false), "k2", ["b", "a"]);
    const b = withHopEnabled(withHopColumns(EMPTY_SELECTION, "k2", ["a", "b"]), "k1", false);
    expect(selectionSignature(a)).toBe(selectionSignature(b));
    expect(selectionSignature(a)).toBe("k1-;k2[a,b]");
    expect(selectionSignature(withSparseLimit(a, 50))).toBe("k1-;k2[a,b];limit=50");
  });
});

describe("persistence", () => {
  it("round-trips through storage", () => {
    const storage = fakeStorage();
    const selection = withSparseLimit(withHopColumns(withHopEnabled(EMPTY_SELECTION, "k1", true), "k1", ["x"]), 30);
    saveSelection(selection, storage);
    expect(loadSelection(storage)).toEqual({ hops: { k1: { enabled: true, columns: ["x"] } }, sparseLimit: 30 });
  });

  it("tolerates missing, corrupt and malformed entries, clamping the limit", () => {
    expect(loadSelection(null)).toBe(EMPTY_SELECTION);
    expect(loadSelection(fakeStorage({ "orkestrator.attributeFetch": "{nope" }))).toBe(EMPTY_SELECTION);
    const loaded = loadSelection(
      fakeStorage({
        "orkestrator.attributeFetch": JSON.stringify({
          hops: { good: { enabled: false }, junk: { enabled: "yes", columns: [1] }, empty: {} },
          sparseLimit: 9999,
        }),
      }),
    );
    expect(loaded).toEqual({ hops: { good: { enabled: false } }, sparseLimit: 200 });
  });
});
