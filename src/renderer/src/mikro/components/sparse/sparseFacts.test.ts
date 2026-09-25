import { describe, expect, it } from "vitest";
import {
  cellCount,
  density,
  describeChunks,
  describeShape,
  formatDensity,
  layoutOfArray,
  nonZeroCount,
  sparseDatasetTitle,
} from "./sparseFacts";

const layout = (path: string, indexedAxis: number, nnz = 10) => ({
  path,
  indexedAxis,
  nnz,
  dtype: "float32",
  rangeReadable: true,
});

describe("describeShape", () => {
  it("pairs axis names with extents in order", () => {
    expect(describeShape(["obs", "var"], [2638, 1838])).toBe("obs 2638 × var 1838");
  });
  it("states what it knows when the two halves disagree in length", () => {
    expect(describeShape(["obs", "var"], [])).toBe("obs × var");
    expect(describeShape([], [4, 5])).toBe("4 × 5");
    expect(describeShape(["obs", "var"], [4])).toBe("obs 4 × var");
  });
  it("names an empty matrix", () => {
    expect(describeShape([], [])).toBe("empty matrix");
  });
});

describe("cellCount / density", () => {
  it("multiplies the extents and is zero for no shape", () => {
    expect(cellCount([2638, 1838])).toBe(2638 * 1838);
    expect(cellCount([])).toBe(0);
  });
  it("is null where there are no cells", () => {
    expect(density(5, 0)).toBeNull();
    expect(density(5, 10)).toBe(0.5);
  });
});

describe("formatDensity", () => {
  it("shows as many digits as the value needs", () => {
    expect(formatDensity(0.123)).toBe("12%");
    expect(formatDensity(0.034)).toBe("3.4%");
    expect(formatDensity(0.0021)).toBe("0.21%");
    expect(formatDensity(0.00001)).toBe("<0.01%");
  });
});

describe("layoutOfArray / nonZeroCount", () => {
  const store = { layouts: [layout("layouts/axis0", 0, 7), layout("layouts/axis1", 1, 7)] };

  it("resolves by the array's own path", () => {
    expect(layoutOfArray({ path: "layouts/axis1", indexedAxis: 1, store })?.path).toBe(
      "layouts/axis1",
    );
  });
  it("falls back to the indexed axis when the path is stale", () => {
    expect(layoutOfArray({ path: "layouts/csr_matrix", indexedAxis: 1, store })?.path).toBe(
      "layouts/axis1",
    );
  });
  it("is undefined when neither matches", () => {
    expect(layoutOfArray({ path: "nope", indexedAxis: 3, store })).toBeUndefined();
  });
  it("reads nnz off the first layout that resolves, null off none", () => {
    expect(
      nonZeroCount([
        { id: "a", path: "nope", indexedAxis: 9, store },
        { id: "b", path: "layouts/axis0", indexedAxis: 0, store },
      ]),
    ).toBe(7);
    expect(nonZeroCount([])).toBeNull();
  });
});

describe("describeChunks", () => {
  it("names each array's chunk length", () => {
    expect(describeChunks({ data: 65536, indices: 65536, indptr: 1024 })).toBe(
      "data 65536 · indices 65536 · indptr 1024",
    );
  });
  it("shows lists and scalars as they came, and nothing for nothing", () => {
    expect(describeChunks([1, 2])).toBe("1 · 2");
    expect(describeChunks({ data: [4, 4] })).toBe("data 4×4");
    expect(describeChunks(null)).toBe("");
    expect(describeChunks(undefined)).toBe("");
  });
});

describe("sparseDatasetTitle", () => {
  it("keeps a real name and falls back for a blank one", () => {
    expect(sparseDatasetTitle("pbmc3k")).toBe("pbmc3k");
    expect(sparseDatasetTitle("  pbmc3k ")).toBe("pbmc3k");
    expect(sparseDatasetTitle("")).toBe("Unnamed sparse dataset");
    expect(sparseDatasetTitle("   ")).toBe("Unnamed sparse dataset");
    expect(sparseDatasetTitle(null)).toBe("Unnamed sparse dataset");
    expect(sparseDatasetTitle(undefined)).toBe("Unnamed sparse dataset");
  });
});
