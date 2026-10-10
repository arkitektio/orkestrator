import { describe, expect, it } from "vitest";
import type { LensSubjectFragment } from "./api/graphql";
import {
  containerFilter,
  describeLens,
  isWholeLens,
  LENS_KIND_ORDER,
  LENS_KINDS,
  lensHeadline,
  lensKindInfo,
  windowSummary,
} from "./lenses";

const arrayLens = (
  slices: { axis: string; start?: number | null; stop?: number | null }[] = [],
): LensSubjectFragment =>
  ({
    __typename: "ArrayLens",
    shape: [10, 512, 512],
    axisNames: ["t", "y", "x"],
    slices,
    dataset: { id: "ds-1", name: "dapi.zarr", axisNames: ["t", "y", "x"], shape: [10, 512, 512] },
  }) as LensSubjectFragment;

const tableLens = (
  windows: { axis: string; min?: number | null; max?: number | null }[] = [],
): LensSubjectFragment =>
  ({
    __typename: "TableLens",
    windows,
    tableDataset: { id: "tb-1", name: "spots" },
  }) as LensSubjectFragment;

const meshLens = (windows: { axis: string; min?: number | null; max?: number | null }[] = []) =>
  ({
    __typename: "MeshLens",
    windows,
    meshCollection: { id: "mc-1", version: "0.3" },
  }) as LensSubjectFragment;

describe("windowSummary", () => {
  it("spells a closed window as an inclusive range", () => {
    expect(windowSummary([{ axis: "t", min: 0, max: 10 }])).toBe("t 0…10");
  });

  it("spells an open side as a bound", () => {
    expect(windowSummary([{ axis: "x", min: null, max: 5 }])).toBe("x ≤ 5");
    expect(windowSummary([{ axis: "x", min: 2.5 }])).toBe("x ≥ 2.5");
  });

  it("joins several windows and trims float noise", () => {
    expect(
      windowSummary([
        { axis: "t", min: 0, max: 10 },
        { axis: "x", min: 0.1 + 0.2, max: null },
      ]),
    ).toBe("t 0…10, x ≥ 0.3");
  });
});

describe("describeLens", () => {
  it("calls a lens that cuts nothing by its container, looked at whole", () => {
    expect(describeLens(arrayLens()).title).toBe("Whole array");
    expect(describeLens(tableLens()).title).toBe("Whole table");
    expect(describeLens(tableLens()).selection).toBeNull();
  });

  it("falls back to the selection, and prefers a name over both", () => {
    const cut = tableLens([{ axis: "t", min: 0, max: 10 }]);
    expect(describeLens(cut).title).toBe("t 0…10");
    expect(describeLens({ ...cut, name: "  first ten  " }).title).toBe("first ten");
    // The technical line never takes the name.
    expect(describeLens({ ...cut, name: "first ten" }).label).toBe("t 0…10");
  });

  it("spells an array lens by its slices", () => {
    const described = describeLens(arrayLens([{ axis: "t", start: 0, stop: 3 }]));
    expect(described.title).toBe("t[0:3]");
    expect(described.label).toContain("t[0:3]");
    expect(described.container).toEqual(expect.objectContaining({ id: "ds-1", name: "dapi.zarr" }));
  });

  it("names a nameless container by its version", () => {
    expect(describeLens(meshLens()).container).toEqual({
      id: "mc-1",
      name: "Mesh collection 0.3",
    });
  });
});

describe("isWholeLens / containerFilter", () => {
  it("reads whole off slices for an array and off windows for the rest", () => {
    expect(isWholeLens(arrayLens())).toBe(true);
    expect(isWholeLens(arrayLens([{ axis: "t", start: 0, stop: 3 }]))).toBe(false);
    expect(isWholeLens(tableLens())).toBe(true);
    expect(isWholeLens(tableLens([{ axis: "t", max: 3 }]))).toBe(false);
  });

  it("names the container the way LensFilter does", () => {
    expect(containerFilter(arrayLens())).toEqual({ dataset: "ds-1" });
    expect(containerFilter(tableLens())).toEqual({ tableDataset: "tb-1" });
    expect(containerFilter(meshLens())).toEqual({ meshCollection: "mc-1" });
  });
});

describe("the kind catalogue", () => {
  it("covers each kind once and finds it by its enum value", () => {
    const kinds = LENS_KIND_ORDER.map((typename) => LENS_KINDS[typename].kind);
    expect(new Set(kinds).size).toBe(6);
    for (const kind of kinds) expect(lensKindInfo(kind).kind).toBe(kind);
  });
});

describe("lensHeadline", () => {
  it("heads an unnamed whole lens by its container", () => {
    expect(lensHeadline(arrayLens())).toEqual({ title: "dapi.zarr", subline: "Whole array" });
    expect(lensHeadline(tableLens())).toEqual({ title: "spots", subline: "Whole table" });
    expect(lensHeadline(meshLens())).toEqual({
      title: "Mesh collection 0.3",
      subline: "Whole mesh collection",
    });
  });

  it("heads a cut lens by its selection, over its container", () => {
    expect(lensHeadline(tableLens([{ axis: "t", min: 0, max: 10 }]))).toEqual({
      title: "t 0…10",
      subline: "spots",
    });
  });

  it("lets a name win, whole or cut", () => {
    expect(lensHeadline({ ...tableLens(), name: "All spots" })).toEqual({
      title: "All spots",
      subline: "spots",
    });
  });
});
