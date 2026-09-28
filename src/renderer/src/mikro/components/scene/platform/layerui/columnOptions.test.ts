// @vitest-environment jsdom
// (`columnOptions.ts` imports the ColumnControl enum from the generated
// `graphql.ts`, whose Apollo hooks barrel touches `window` on load.)
import { ColorMap } from "@/mikro/api/graphql";
import { describe, expect, it } from "vitest";

import {
  ColorSourceKind,
  ColumnControl,
  type LabelColorByFragment,
  type LabelFilterByFragment,
  type MeshColorByFragment,
  type MeshFilterByFragment,
} from "@/mikro/api/graphql";
import {
  activeColorByAfterRemoval,
  activeFilterBysAfterRemoval,
  colorByEntryToInput,
  describeColouring,
  describeFilterRule,
  entryKey,
  entryLabel,
  entryMatchesOption,
  filterByEntryToInput,
  isColumnColorBy,
  isColumnOption,
  toSparseColorByInput,
  isSparseOption,
  isJoinedEntry,
  optionKey,
  toColorByInput,
  toFilterByInput,
  type ColumnOption,
} from "./columnOptions";

const column = (name: string, longName?: string) =>
  ({
    id: `col-${name}`,
    name,
    longName: longName ?? null,
    dtype: "double",
    role: "ATTRIBUTE",
    axisType: null,
    unit: null,
    order: 0,
  }) as ColumnOption["column"];

const table = (id: string, name: string) =>
  ({
    id,
    name,
    description: null,
    axisNames: [],
    store: { id: `store-${id}`, key: "k", bucket: "b", path: "p" },
    columns: [],
  }) as unknown as ColumnOption["table"];

const directOption = (): ColumnOption => ({
  __typename: "ColorByOption",
  control: ColumnControl.Measure,
  table: table("t1", "objects"),
  column: column("area"),
  joinPath: [],
});

/** The case the whole `joinPath` round-trip exists for: a `references` hop. */
const joinedOption = (): ColumnOption => ({
  __typename: "ColorByOption",
  control: ColumnControl.Categorical,
  table: table("t2", "tracks"),
  column: column("phenotype", "Phenotype"),
  joinPath: [{ table: table("t1", "objects"), column: column("track_id") }],
});

describe("option → input", () => {
  it("names the table by id and the column by name", () => {
    const input = toColorByInput(directOption());
    expect(input.table).toBe("t1");
    expect(input.column).toBe("area");
    expect(input.joinPath).toEqual([]);
  });

  it("collapses join steps to {table: id, column: name}", () => {
    const input = toColorByInput(joinedOption());
    expect(input.table).toBe("t2");
    expect(input.joinPath).toEqual([{ table: "t1", column: "track_id" }]);
  });

  it("qualifies a joined entry's label with its table, and leaves a direct one bare", () => {
    expect(toColorByInput(directOption()).label).toBe("area");
    expect(toColorByInput(joinedOption()).label).toBe("tracks · Phenotype");
  });

  it("defaults a filter rule to keeping rather than excluding", () => {
    expect(toFilterByInput(directOption()).exclude).toBe(false);
  });

  it("lets a caller patch the control fields without touching the address", () => {
    const input = toFilterByInput(directOption(), { min: 3, max: 9 });
    expect(input).toMatchObject({ table: "t1", column: "area", min: 3, max: 9 });
  });
});

describe("entry → input round trip", () => {
  // The regression this file mostly exists for: re-sending an entry without its
  // joinPath flattens the join to [] and silently resolves the same column name
  // against the wrong table.
  it("carries joinPath back through a read-modify-write", () => {
    const stored = {
      __typename: "MeshColorBy",
      table: "t2",
      column: "phenotype",
      joinPath: [{ __typename: "JoinStep", table: "t1", column: "track_id" }],
      colormap: null,
      classColors: null,
      label: "tracks · Phenotype",
    } as MeshColorByFragment;

    expect(colorByEntryToInput(stored).joinPath).toEqual([
      { table: "t1", column: "track_id" },
    ]);
  });

  it("matches a stored entry back to the option it came from", () => {
    const option = joinedOption();
    const stored = toColorByInput(option) as unknown as MeshColorByFragment;
    expect(entryMatchesOption(stored, option)).toBe(true);
    expect(entryMatchesOption(stored, directOption())).toBe(false);
  });

  it("keeps the direct and the joined reach of one column apart", () => {
    // Same table and column name, different path — two distinct candidates.
    const joined: ColumnOption = { ...directOption(), joinPath: joinedOption().joinPath };
    expect(optionKey(joined)).not.toBe(optionKey(directOption()));
  });
});

/**
 * The label entries are a different generated type reached through a different
 * root query (`labelColorByOptions`, keyed by the lens), and the whole point of
 * this module is that they take the SAME path. These assert that — so the day
 * the server gives one kind a field the other lacks, this fails here rather
 * than by flattening a join on a label layer only.
 */
describe("label entries take the same path as mesh ones", () => {
  const labelColouring: LabelColorByFragment = {
    __typename: "LabelColorBy",
    kind: ColorSourceKind.Column,
    table: "t2",
    column: "phenotype",
    dataset: null,
    at: [],
    joinPath: [{ __typename: "JoinStep", table: "t1", column: "track_id" }],
    colormap: null,
    classColors: null,
    min: null,
    max: null,
    label: "tracks · Phenotype",
  };

  const labelRule: LabelFilterByFragment = {
    __typename: "LabelFilterBy",
    table: "t1",
    column: "area",
    joinPath: [],
    label: "area",
    min: 3,
    max: 9,
    values: null,
    exclude: true,
  };

  // The clims are the same hazard as the joinPath: the card authors them, the
  // server now stores them, and an entry read back without them and re-sent
  // blanks them on every OTHER entry in the same whole-array replace.
  it("carries a label colouring's clims back through a read-modify-write", () => {
    expect(
      colorByEntryToInput({ ...labelColouring, min: 0.25, max: 4 }),
    ).toMatchObject({ min: 0.25, max: 4 });
  });

  it("carries a label colouring's joinPath back through a read-modify-write", () => {
    expect(colorByEntryToInput(labelColouring).joinPath).toEqual([
      { table: "t1", column: "track_id" },
    ]);
  });

  it("round-trips a label rule's bounds and its exclude flag", () => {
    expect(filterByEntryToInput(labelRule)).toMatchObject({
      table: "t1",
      column: "area",
      joinPath: [],
      min: 3,
      max: 9,
      values: null,
      exclude: true,
    });
  });

  it("maps a mesh and a label entry of the same column to the same input", () => {
    const meshColouring = {
      ...labelColouring,
      __typename: "MeshColorBy",
    } as unknown as MeshColorByFragment;
    expect(colorByEntryToInput(labelColouring)).toEqual(colorByEntryToInput(meshColouring));

    const meshRule = { ...labelRule, __typename: "MeshFilterBy" } as unknown as MeshFilterByFragment;
    expect(filterByEntryToInput(labelRule)).toEqual(filterByEntryToInput(meshRule));
  });

  it("keys a label entry the same way, so 'already added' works in its picker", () => {
    const option = joinedOption();
    expect(entryKey(labelColouring)).toBe(optionKey(option));
    expect(entryMatchesOption(labelColouring, option)).toBe(true);
  });

  it("badges a joined label entry and leaves a direct one bare", () => {
    expect(isJoinedEntry(labelColouring)).toBe(true);
    expect(isJoinedEntry(labelRule)).toBe(false);
  });
});

const labelColumnColouring: LabelColorByFragment = {
  __typename: "LabelColorBy",
  kind: ColorSourceKind.Column,
  table: "t1",
  column: "area",
  dataset: null,
  at: [],
  joinPath: [],
  colormap: null,
  classColors: null,
  min: null,
  max: null,
  label: null,
};

/**
 * The SPARSE arm. A colouring can now name a slice of a matrix instead of a
 * column, and nothing in this client renders one — but `colorBys` is a
 * WHOLE-ARRAY replace, so editing any other entry re-sends this one. These pin
 * that it survives that trip intact, which is the only way it can: read it
 * back without `kind`/`dataset`/`at` and the server stores a COLUMN entry
 * naming nothing.
 */
describe("a sparse colouring round-trips untouched", () => {
  const sparseColouring: LabelColorByFragment = {
    __typename: "LabelColorBy",
    kind: ColorSourceKind.Sparse,
    table: null,
    column: null,
    dataset: "sparse-1",
    at: [{ __typename: "AxisPosition", axis: "feature", value: 17 }],
    joinPath: [],
    colormap: "VIRIDIS" as never,
    classColors: null,
    min: 0,
    max: 1,
    label: "CD3",
  };

  it("sends every field the sparse arm names back", () => {
    expect(colorByEntryToInput(sparseColouring)).toMatchObject({
      kind: ColorSourceKind.Sparse,
      table: null,
      column: null,
      dataset: "sparse-1",
      at: [{ axis: "feature", value: 17 }],
      min: 0,
      max: 1,
    });
  });

  it("strips __typename off a position, as it does off a join step", () => {
    // `AxisPositionInput` has no such field; spreading one read off the wire
    // sends an unknown key into the mutation's variables.
    expect(colorByEntryToInput(sparseColouring).at).toEqual([
      { axis: "feature", value: 17 },
    ]);
  });

  it("is not a column colouring, so no LUT is built from it", () => {
    expect(isColumnColorBy(sparseColouring)).toBe(false);
    expect(isColumnColorBy(labelColumnColouring)).toBe(true);
  });

  it("keys on what it names, so two of them are not one entry", () => {
    const other: LabelColorByFragment = {
      ...sparseColouring,
      at: [{ __typename: "AxisPosition", axis: "feature", value: 18 }],
    };
    expect(entryKey(sparseColouring)).not.toBe(entryKey(other));
  });
});

describe("entry captions", () => {
  it("falls back to the column when an entry carries no label", () => {
    expect(entryLabel({ label: null, column: "area" })).toBe("area");
    expect(entryLabel({ label: "   ", column: "area" })).toBe("area");
    expect(entryLabel({ label: "Area", column: "area" })).toBe("Area");
  });

  it("describes a colouring by which half of the split applies", () => {
    expect(describeColouring({ colormap: "VIRIDIS" as never })).toContain("viridis");
    // A qualitative colormap is the categorical half now -- named, so the caption can say
    // which palette rather than "explicit colours per value" over a map it had to inspect.
    expect(describeColouring({ colormap: ColorMap.Distinct })).toBe(
      '"distinct" palette, a colour per distinct value',
    );
    expect(describeColouring({ colormap: null })).toBe("a colour per distinct value");
  });

  it("describes a rule by its bounds or its value set", () => {
    expect(describeFilterRule({ min: 3, max: 9 })).toBe("is between 3 and 9");
    expect(describeFilterRule({ min: 3 })).toBe("is at least 3");
    expect(describeFilterRule({ max: 9 })).toBe("is at most 9");
    expect(describeFilterRule({ values: ["a", "b"] })).toBe("is one of a, b");
    // A list cut at four says how many it is not showing, rather than reading
    // as the whole set.
    expect(describeFilterRule({ values: ["a", "b", "c", "d", "e", "f"] })).toBe(
      "is one of a, b, c, d, +2 more",
    );
    expect(describeFilterRule({})).toBe("matches");
  });
});

describe("active indices after a removal", () => {
  it("clears the colouring when the active one is what was removed", () => {
    expect(activeColorByAfterRemoval(1, 1)).toBeNull();
  });

  it("shifts a later colouring down and leaves an earlier one alone", () => {
    expect(activeColorByAfterRemoval(2, 1)).toBe(1);
    expect(activeColorByAfterRemoval(0, 1)).toBe(0);
    expect(activeColorByAfterRemoval(null, 1)).toBeNull();
  });

  it("drops the removed rule and shifts every later one down", () => {
    expect(activeFilterBysAfterRemoval([0, 1, 3], 1)).toEqual([0, 2]);
    expect(activeFilterBysAfterRemoval([0, 1], 2)).toEqual([0, 1]);
    expect(activeFilterBysAfterRemoval([], 0)).toEqual([]);
  });
});


describe("the sparse arm of the picker", () => {
  const sparseOption = {
    __typename: "ColorByOption",
    control: "MEASURE",
    axes: ["gene"],
    sparseDataset: { id: "d1", name: "expression" },
    table: null,
    column: null,
    joinPath: [],
  } as never;

  const columnOption = {
    __typename: "ColorByOption",
    control: "MEASURE",
    axes: [],
    sparseDataset: null,
    table: { id: "t1", name: "cells" },
    column: { name: "area" },
    joinPath: [],
  } as never;

  it("narrows the two arms apart", () => {
    expect(isSparseOption(sparseOption)).toBe(true);
    expect(isSparseOption(columnOption)).toBe(false);
    expect(isColumnOption(columnOption)).toBe(true);
    expect(isColumnOption(sparseOption)).toBe(false);
  });

  it("keys a sparse option on the MATRIX, not on a slice of it", () => {
    // The position is not part of the option — a 19,059-feature matrix is one
    // row — so "already added" has to mean "this matrix is in the picker".
    expect(optionKey(sparseOption)).toBe("sparse|d1");
  });

  it("emits kind, dataset and at — the fields toColorByInput never had", () => {
    const input = toSparseColorByInput(sparseOption, [{ axis: "gene", value: 4711 }]);
    expect(input.kind).toBe(ColorSourceKind.Sparse);
    expect(input.dataset).toBe("d1");
    expect(input.at).toEqual([{ axis: "gene", value: 4711 }]);
    // Always measured: a slice is a value per object, never a class map.
    expect(input.colormap).toBe(ColorMap.Magma);
  });

  it("refuses an `at` that does not name every identified axis", () => {
    // The server refuses this too; catching it here keeps a mutation from being
    // sent that cannot succeed.
    const rank3 = { ...sparseOption, axes: ["metabolite", "adduct"] } as never;
    expect(() => toSparseColorByInput(rank3, [{ axis: "metabolite", value: 7 }])).toThrow(
      /names a position along adduct, metabolite/,
    );
    expect(() =>
      toSparseColorByInput(rank3, [
        { axis: "metabolite", value: 7 },
        { axis: "adduct", value: 0 },
      ]),
    ).not.toThrow();
  });

  it("round-trips a sparse entry back to an input without losing its arm", () => {
    // The whole-array replace hazard: an entry read back and re-sent without
    // `kind`/`dataset`/`at` would return as a COLUMN entry naming nothing.
    const entry = {
      kind: ColorSourceKind.Sparse,
      dataset: "d1",
      at: [{ axis: "gene", value: 4711 }],
      table: null,
      column: null,
      joinPath: [],
      colormap: ColorMap.Magma,
      label: "expression",
      min: null,
      max: null,
    } as never;
    const back = colorByEntryToInput(entry);
    expect(back.kind).toBe(ColorSourceKind.Sparse);
    expect(back.dataset).toBe("d1");
    expect(back.at).toEqual([{ axis: "gene", value: 4711 }]);
  });
});
