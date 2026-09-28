// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { pickLayout, sliceAsValues, type SparseLayoutHandle } from "./sparseSlice";

const layout = (indexedAxis: number, over: Record<string, unknown> = {}) => ({
  path: `layouts/axis${indexedAxis}`,
  indexedAxis,
  indexOrder: [indexedAxis === 0 ? 1 : 0],
  nnz: 10,
  dtype: "float32",
  chunks: { data: 32768, indices: 32768, indptr: 16384 },
  rangeReadable: false,
  ...over,
});

const dataset = (over: Record<string, unknown> = {}) =>
  ({
    id: "d1",
    name: "expression",
    axisNames: ["cell", "gene"],
    indexableAxes: ["cell", "gene"],
    shape: [1000, 20],
    arrays: [
      {
        id: "a0",
        indexedAxis: 0,
        indexedAxisName: "cell",
        path: "layouts/axis0",
        store: { id: "s", key: "k", bucket: "b", path: "p", shape: [1000, 20], spec: "1", layouts: [layout(0)] },
      },
      {
        id: "a1",
        indexedAxis: 1,
        indexedAxisName: "gene",
        path: "layouts/axis1",
        store: { id: "s", key: "k", bucket: "b", path: "p", shape: [1000, 20], spec: "1", layouts: [layout(1)] },
      },
    ],
    axisReferences: [],
    ...over,
  }) as never;

describe("pickLayout", () => {
  it("picks the layout indexed on the axis the position names", () => {
    // The whole cost model. Colouring by a gene wants the GENE-major layout;
    // the cell-major one has no range to read and would scan every byte —
    // 1,777 ms against 2.2 ms, measured.
    const choice = pickLayout(dataset(), [{ axis: "gene", value: 4 }]);
    expect("error" in choice).toBe(false);
    if ("error" in choice) return;
    expect(choice.indexedAxis).toBe(1);
    expect(choice.objectAxis).toBe(0); // the mask's ids run along `cell`
  });

  it("refuses an axis no layout indexes, naming what it does index", () => {
    const oneLayout = dataset({
      arrays: [
        {
          id: "a0",
          indexedAxis: 0,
          indexedAxisName: "cell",
          path: "layouts/axis0",
          store: { id: "s", key: "k", bucket: "b", path: "p", shape: [1000, 20], spec: "1", layouts: [layout(0)] },
        },
      ],
      indexableAxes: ["cell"],
    });
    const choice = pickLayout(oneLayout, [{ axis: "gene", value: 4 }]);
    expect("error" in choice).toBe(true);
    if (!("error" in choice)) return;
    expect(choice.error).toContain("no layout indexed");
    expect(choice.error).toContain("cell");
  });

  it("refuses a byte-addressable store rather than downloading all of it", () => {
    const addressable = dataset({
      arrays: [
        {
          id: "a1",
          indexedAxis: 1,
          indexedAxisName: "gene",
          path: "layouts/axis1",
          store: {
            id: "s",
            key: "k",
            bucket: "b",
            path: "p",
            shape: [1000, 20],
            spec: "1",
            layouts: [layout(1, { rangeReadable: true })],
          },
        },
      ],
    });
    const choice = pickLayout(addressable, [{ axis: "gene", value: 4 }]);
    expect("error" in choice).toBe(true);
    if (!("error" in choice)) return;
    expect(choice.error).toContain("byte-addressable");
  });

  it("refuses an `at` that leaves no axis for the ids", () => {
    const choice = pickLayout(dataset(), [
      { axis: "cell", value: 1 },
      { axis: "gene", value: 2 },
    ]);
    expect("error" in choice).toBe(true);
  });
});

describe("sliceAsValues", () => {
  const handleFor = (choice: never, indexOrder: number[]): SparseLayoutHandle =>
    ({
      choice: { ...(choice as object), layout: { ...(choice as { layout: object }).layout, indexOrder } },
      indices: null,
      data: null,
      indptr: new Int32Array([0, 3]),
      slotCount: 1000,
    }) as never;

  it("takes an index as the object position at rank two", () => {
    const choice = pickLayout(dataset(), [{ axis: "gene", value: 4 }]) as never;
    const values = sliceAsValues(
      handleFor(choice, [0]),
      { indices: [7, 9], values: [1.5, 2.5] },
      dataset(),
      [{ axis: "gene", value: 4 }],
    );
    expect([...values]).toEqual([
      [7, 1.5],
      [9, 2.5],
    ]);
  });

  it("unravels through indexOrder at rank three, keeping only the named cell", () => {
    // The format's own warning: `indexOrder` is the one fact that cannot be
    // recovered from the bytes, so reading it wrong does not fail — it reads a
    // DIFFERENT cell. A metabolite-major slice carries every adduct, and only
    // the named one survives.
    const rank3 = dataset({
      axisNames: ["cell", "metabolite", "adduct"],
      shape: [1000, 50, 4],
    });
    const choice = {
      store: null,
      layout: { indexOrder: [0, 2] },
      indexedAxis: 1,
      objectAxis: 0,
    } as never;
    // indices raveled over (cell, adduct) with extents (1000, 4):
    //   cell 7 adduct 0 -> 28 ; cell 7 adduct 2 -> 30 ; cell 9 adduct 0 -> 36
    const values = sliceAsValues(
      handleFor(choice, [0, 2]),
      { indices: [28, 30, 36], values: [1, 99, 2] },
      rank3,
      [
        { axis: "metabolite", value: 7 },
        { axis: "adduct", value: 0 },
      ],
    );
    expect([...values]).toEqual([
      [7, 1],
      [9, 2],
    ]);
  });
});
