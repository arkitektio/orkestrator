import { describe, expect, it } from "vitest";
import { groupDerived, parentDatasetOfEdge, UNPLACED_GROUP } from "./derivedGrouping";

const INTRINSIC = "cs-intrinsic";

const lens = (id: string, systemId: string | null, slices: { axis: string; start?: number; stop?: number }[] = []) => ({
  id,
  axisNames: ["c", "y", "x"],
  shape: [3, 512, 512],
  slices,
  coordinateSystem: systemId ? { id: systemId } : null,
});

const child = (
  id: string,
  edges: { kind: string; output?: string | null }[],
) => ({
  id,
  derivedFrom: edges.map((edge) => ({
    kind: edge.kind,
    output: edge.output === undefined || edge.output === null ? null : { id: edge.output },
  })),
});

describe("groupDerived", () => {
  it("returns no groups when nothing was derived", () => {
    expect(groupDerived(INTRINSIC, "intrinsic", [lens("l1", "cs-a")], [])).toEqual([]);
  });

  it("puts a child off the intrinsic grid in the whole-dataset group", () => {
    const c = child("d1", [{ kind: "AFFINE", output: INTRINSIC }]);
    const groups = groupDerived(INTRINSIC, "intrinsic", [], [c]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe(INTRINSIC);
    expect(groups[0].title).toBe("Whole dataset");
    expect(groups[0].items.map((i) => i.dataset)).toEqual([c]);
  });

  it("puts a child off a sliced lens' space in that lens' group", () => {
    const l = lens("l1", "cs-lens", [{ axis: "c", start: 0, stop: 1 }]);
    const c = child("d1", [{ kind: "IDENTITY", output: "cs-lens" }]);

    const groups = groupDerived(INTRINSIC, "intrinsic", [l], [c]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("cs-lens");
    expect(groups[0].title).toBe("Lens");
    expect(groups[0].subtitle).toContain("c[0:1]");
  });

  it("folds an unsliced lens into the whole-dataset group rather than duplicating it", () => {
    // An unsliced lens' coordinateSystem resolves to the dataset's intrinsic
    // system — same space, so it must not get a bucket of its own.
    const unsliced = lens("l-full", INTRINSIC);
    const c = child("d1", [{ kind: "AFFINE", output: INTRINSIC }]);

    const groups = groupDerived(INTRINSIC, "intrinsic", [unsliced], [c]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe(INTRINSIC);
    expect(groups[0].title).toBe("Whole dataset");
  });

  it("collects unmappable children and unknown parent spaces in the trailing group", () => {
    const unmappable = child("d1", [{ kind: "UNMAPPABLE", output: INTRINSIC }]);
    const stranger = child("d2", [{ kind: "AFFINE", output: "cs-elsewhere" }]);
    const parentless = child("d3", []);
    const placed = child("d4", [{ kind: "AFFINE", output: INTRINSIC }]);

    const groups = groupDerived(
      INTRINSIC,
      "intrinsic",
      [],
      [unmappable, stranger, parentless, placed],
    );

    expect(groups.map((g) => g.key)).toEqual([INTRINSIC, UNPLACED_GROUP]);
    expect(groups[1].items.map((i) => i.dataset.id)).toEqual(["d1", "d2", "d3"]);
  });

  it("lists a multi-parent child once, under its primary parent, and counts the rest", () => {
    const l = lens("l1", "cs-lens", [{ axis: "c", start: 1, stop: 2 }]);
    const fusion = child("d1", [
      { kind: "AFFINE", output: INTRINSIC },
      { kind: "AFFINE", output: "cs-lens" },
    ]);

    const groups = groupDerived(INTRINSIC, "intrinsic", [l], [fusion]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe(INTRINSIC);
    expect(groups[0].items[0].otherParents).toBe(1);
  });

  it("orders groups intrinsic-first, then lenses as given, then the catch-all", () => {
    const groups = groupDerived(
      INTRINSIC,
      "intrinsic",
      [lens("l1", "cs-a"), lens("l2", "cs-b")],
      [
        child("d1", [{ kind: "AFFINE", output: "cs-b" }]),
        child("d2", [{ kind: "UNMAPPABLE", output: null }]),
        child("d3", [{ kind: "AFFINE", output: "cs-a" }]),
        child("d4", [{ kind: "AFFINE", output: INTRINSIC }]),
      ],
    );

    expect(groups.map((g) => g.key)).toEqual([
      INTRINSIC,
      "cs-a",
      "cs-b",
      UNPLACED_GROUP,
    ]);
  });
});

describe("parentDatasetOfEdge", () => {
  const edge = (residents: { __typename: string; [k: string]: unknown }[]) => ({
    output: { residents },
  });

  it("names the dataset living in the space the edge lands in", () => {
    expect(
      parentDatasetOfEdge(
        edge([{ __typename: "ArrayDataset", id: "ds-1", name: "Raw stack" }]),
      ),
    ).toEqual({ id: "ds-1", name: "Raw stack" });
  });

  it("reaches through a lens when the parent was a crop", () => {
    expect(
      parentDatasetOfEdge(
        edge([
          { __typename: "Lens", id: "lens-1", dataset: { id: "ds-2", name: "Timelapse" } },
        ]),
      ),
    ).toEqual({ id: "ds-2", name: "Timelapse" });
  });

  it("prefers the dataset itself over a lens onto it", () => {
    // Both present means the space IS the dataset's grid; naming the dataset
    // directly is the more useful of two true answers.
    expect(
      parentDatasetOfEdge(
        edge([
          { __typename: "Lens", id: "lens-1", dataset: { id: "ds-lens", name: "Via lens" } },
          { __typename: "ArrayDataset", id: "ds-direct", name: "Direct" },
        ]),
      ),
    ).toEqual({ id: "ds-direct", name: "Direct" });
  });

  it("skips resident kinds that are not datasets", () => {
    expect(
      parentDatasetOfEdge(
        edge([{ __typename: "MeshCollection" }, { __typename: "TableDataset" }]),
      ),
    ).toBeNull();
  });

  it("is null for an empty or absent output space", () => {
    expect(parentDatasetOfEdge(edge([]))).toBeNull();
    expect(parentDatasetOfEdge({ output: null })).toBeNull();
    expect(parentDatasetOfEdge({})).toBeNull();
  });
});
