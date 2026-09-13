// @vitest-environment jsdom
// (the ColorMap enum comes from the generated `graphql.ts`, whose Apollo hooks
// barrel touches `window` on load.)
import { describe, expect, it } from "vitest";

import { ColorMap } from "@/mikro-next/api/graphql";
import type { AttributePlanLike } from "@/mikro-next/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro-next/lib/attributes/lookupEngine";
import { accessForTable } from "../../platform/attributes/columnLut";
import { buildLabelColorLut, LABEL_LUT_MAX_TEXELS } from "./labelColorLut";
import { CODE_HIDDEN, CODE_NO_VALUE, VALUE_CODE_MAX } from "../../platform/attributes/valueLut";

/**
 * The label LUT differs from the mesh one in exactly one thing — the slot mapping
 * — and inherits the rest from `attributes/columnLut.ts`. These cover the
 * difference: sparse ids offset into slots, the size cap, the identity for an id
 * the table never mentioned, and picking the right ARRAY plan for the right mask.
 */

const MASK_STORE = "zarr-mask-a";
const OTHER_MASK_STORE = "zarr-mask-b";
const lookupStore = { id: "parquet-a", bucket: "b", key: "k" };

const arrayPlan = (
  tableId: string,
  keyColumn: string,
  sampleStoreId: string,
): AttributePlanLike =>
  ({
    edge: { id: "edge", version: 1 },
    path: [],
    sample: {
      __typename: "ArraySample",
      system: { id: "sys", name: "sys", axes: [] },
      consumes: [],
      produces: ["object_id"],
      passthrough: false,
      store: { id: sampleStoreId, key: "k", bucket: "b", path: "p" },
    },
    hops: [
      {
        index: 0,
        parent: null,
        cardinality: "ONE",
        via: null,
        joinPath: [],
        table: { id: tableId, name: tableId },
        lookup: {
          kind: "TABLE",
          store: lookupStore,
          keyColumns: [{ axis: "object_id", column: { id: "c", name: keyColumn } }],
          attributes: [],
        },
      },
    ],
  }) as unknown as AttributePlanLike;

const meshPlan = (tableId: string, keyColumn: string): AttributePlanLike =>
  ({
    edge: { id: "edge", version: 1 },
    path: [],
    sample: {
      __typename: "MeshSample",
      system: { id: "sys", name: "sys", axes: [] },
      consumes: [],
      produces: ["object_id"],
      passthrough: false,
      store: { id: "fabriks", key: "k", bucket: "b", path: "p" },
    },
    hops: [
      {
        index: 0,
        parent: null,
        cardinality: "ONE",
        via: null,
        joinPath: [],
        table: { id: tableId, name: tableId },
        lookup: {
          kind: "TABLE",
          store: lookupStore,
          keyColumns: [{ axis: "object_id", column: { id: "c", name: keyColumn } }],
          attributes: [],
        },
      },
    ],
  }) as unknown as AttributePlanLike;

/**
 * An engine stand-in: one canned (object_id, value) result per column.
 *
 * Answers BOTH reads, because the builder asks for the columnar one and falls
 * back to rows. `columnar: false` makes it decline the columnar read the way a
 * result with no `getChild` does, which is the fallback's only test.
 */
const fakeEngine = (
  byColumn: Record<string, Record<number, unknown>>,
  { columnar = true }: { columnar?: boolean } = {},
) => {
  const columnOf = (sql: string) => Object.keys(byColumn).find((name) => sql.includes(`"${name}"`));
  /** Rows sorted by id — the `ORDER BY object_id` the columnar read issues. */
  const sorted = (column: string) =>
    Object.entries(byColumn[column])
      .map(([id, value]) => [Number(id), value] as const)
      .sort((a, b) => a[0] - b[0]);

  const engine = {
    readAcross: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
    ) => {
      const column = columnOf(buildSql(() => "s3://b/k"));
      if (!column) return [];
      return Object.entries(byColumn[column]).map(([id, value]) => ({
        object_id: Number(id),
        value,
      }));
    },
    readColumnsTyped: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
    ) => {
      if (!columnar) return null;
      const column = columnOf(buildSql(() => "s3://b/k"));
      if (!column) return { object_id: new Float64Array(0), value: new Float64Array(0) };
      const rows = sorted(column);
      const ids = Float64Array.from(rows.map(([id]) => id));
      const raw = rows.map(([, value]) => value);
      // A typed array for a measure, a plain string array for a category —
      // the two shapes Arrow actually hands back.
      const numeric = raw.every((value) => typeof value === "number");
      return { object_id: ids, value: numeric ? Float64Array.from(raw as number[]) : raw.map(String) };
    },
  } as unknown as AttributeLookupEngine;
  return engine;
};

const PLANS = [arrayPlan("t1", "label_id", MASK_STORE)];

// The table holds a 16-bit code per slot now, not an RGBA colour — see
// `valueLut.ts`. `code = G * 256 + R`, little-endian over the two RG8 bytes.
const codeAt = (data: Uint8Array, slot: number) => data[slot * 2 + 1] * 256 + data[slot * 2];
const visibleAt = (data: Uint8Array, slot: number) => (codeAt(data, slot) === CODE_HIDDEN ? 0 : 255);
const dataOf = (texture: { image: { data: Uint8Array } } | null) =>
  (texture as unknown as { image: { data: Uint8Array } }).image.data;

describe("accessForTable for an ARRAY-sampled mask", () => {
  it("finds the plan for THIS mask's store", () => {
    const access = accessForTable(PLANS, "t1", { kind: "array", storeId: MASK_STORE });
    expect(access).toEqual({ store: lookupStore, keyColumn: "label_id" });
  });

  it("refuses another mask's plan over the same table", () => {
    // A scene can key several masks into one table; reading the wrong mask's plan
    // resolves these ids against the wrong column, silently.
    expect(
      accessForTable(PLANS, "t1", { kind: "array", storeId: OTHER_MASK_STORE }),
    ).toBeNull();
  });

  it("refuses a MESH plan for the same table", () => {
    // A mesh plan keys the table by a geometry row's id, which a pixel value is
    // not.
    expect(
      accessForTable([meshPlan("t1", "label_id")], "t1", {
        kind: "array",
        storeId: MASK_STORE,
      }),
    ).toBeNull();
  });

  it("still refuses an array plan when asked for a mesh one", () => {
    expect(accessForTable(PLANS, "t1", { kind: "mesh" })).toBeNull();
  });
});

describe("buildLabelColorLut — sparse id slots", () => {
  const colorBy = { table: "t1", column: "area", colormap: ColorMap.Viridis, joinPath: [] };

  it("offsets by the smallest id, so the lowest one lands at slot 0", async () => {
    // The common segmentation case: ids 1..N → offset 1, slots 0..N-1. Exactly N
    // texels, not N+1.
    const result = await buildLabelColorLut({
      colorBy,
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1: 10, 2: 20, 3: 30 } }),
    });
    expect(result.idOffset).toBe(1);
    expect(result.width * result.height).toBe(3);
  });

  it("offsets ids that all sit above a floor", async () => {
    const result = await buildLabelColorLut({
      colorBy,
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1000: 10, 1001: 20, 1002: 30 } }),
    });
    expect(result.idOffset).toBe(1000);
    // Three slots, not a thousand-and-three.
    expect(result.width * result.height).toBeGreaterThanOrEqual(3);
    expect(result.width * result.height).toBeLessThan(10);

    const data = dataOf(result.texture);
    // The lowest id sits at slot 0 and takes the bottom of the ramp.
    expect(codeAt(data, 0)).not.toBe(CODE_NO_VALUE);
  });

  it("leaves an id the table never mentioned at the IDENTITY texel", async () => {
    // White and opaque: it keeps its hue hash and stays visible. A filter must
    // never hide something because a read did not cover it.
    const result = await buildLabelColorLut({
      colorBy,
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1: 10, 5: 50 } }),
    });
    const data = dataOf(result.texture);
    // Ids 1 and 5 at offset 1 → slots 0 and 4; slots 1..3 (ids 2..4) were never
    // mentioned and keep the identity.
    // "visible, no value": the slot keeps its hue hash and stays drawn.
    expect(codeAt(data, 2)).toBe(CODE_NO_VALUE);
  });

  it("REFUSES ids too sparse to index, and says so", async () => {
    const result = await buildLabelColorLut({
      colorBy,
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1: 10, [LABEL_LUT_MAX_TEXELS + 5000]: 20 } }),
    });
    expect(result.texture).toBeNull();
    expect(result.skipped.join(" ")).toMatch(/too sparse/);
  });

  it("builds nothing when no entry could be read", async () => {
    const result = await buildLabelColorLut({
      colorBy: { table: "nope", column: "area", joinPath: [] },
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });
    expect(result.texture).toBeNull();
    expect(result.skipped.join(" ")).toMatch(/no attribute plan reaches/);
  });

  it("does not read a JOINED entry, and badges it instead", async () => {
    const result = await buildLabelColorLut({
      colorBy: {
        table: "t1",
        column: "area",
        joinPath: [{ table: "t0", column: "track_id" }],
      },
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1: 10 } }),
    });
    expect(result.texture).toBeNull();
    expect(result.skipped.join(" ")).toMatch(/reached through a join/);
  });
});

describe("buildLabelColorLut — filters over sparse ids", () => {
  it("drops the ids a bound excludes, at their offset slots", async () => {
    const result = await buildLabelColorLut({
      colorBy: null,
      filterBys: [{ table: "t1", column: "area", min: 15, max: 100, exclude: false, joinPath: [] }],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 100: 10, 101: 20, 102: 30 } }),
    });
    const data = dataOf(result.texture);
    expect(result.idOffset).toBe(100);
    expect(visibleAt(data, 0)).toBe(0); // id 100, area 10 → out of bounds
    expect(visibleAt(data, 1)).toBe(255); // id 101, area 20 → kept
    expect(visibleAt(data, 2)).toBe(255); // id 102, area 30 → kept
  });

  it("combines two rules with AND", async () => {
    const result = await buildLabelColorLut({
      colorBy: null,
      filterBys: [
        { table: "t1", column: "area", min: 15, max: 100, exclude: false, joinPath: [] },
        { table: "t1", column: "kind", values: ["good"], exclude: false, joinPath: [] },
      ],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({
        area: { 1: 20, 2: 20, 3: 5 },
        kind: { 1: "good", 2: "bad", 3: "good" },
      }),
    });
    const data = dataOf(result.texture);
    // Ids 1,2,3 at offset 1 → slots 0,1,2.
    expect(result.idOffset).toBe(1);
    expect(visibleAt(data, 0)).toBe(255); // id 1: area 20, kind good → both pass
    expect(visibleAt(data, 1)).toBe(0); // id 2: kind bad
    expect(visibleAt(data, 2)).toBe(0); // id 3: area 5, out of bounds
  });

  it("keeps everything when a rule's column could not be read", async () => {
    // Silently hiding every object because a read failed is the worst possible
    // reading of "filter".
    const result = await buildLabelColorLut({
      colorBy: { table: "t1", column: "area", colormap: ColorMap.Viridis, joinPath: [] },
      filterBys: [{ table: "gone", column: "x", min: 0, max: 1, exclude: false, joinPath: [] }],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({ area: { 1: 10, 2: 20 } }),
    });
    const data = dataOf(result.texture);
    expect(visibleAt(data, 0)).toBe(255);
    expect(visibleAt(data, 1)).toBe(255);
  });
});

describe("buildLabelColorLut — a sparse matrix colouring", () => {
  /** A `SparseReadRequest` stand-in: one canned slice over a fixed object axis. */
  const fakeSparse = (values: Map<number, number>, slotCount: number) =>
    ({
      source: { name: "expression" },
      read: async () => ({ values, slotCount }),
    }) as unknown as NonNullable<Parameters<typeof buildLabelColorLut>[0]["sparse"]>;

  const SPARSE_COLOR_BY = {
    dataset: "ds",
    at: [{ axis: "gene", value: 4711 }],
    colormap: ColorMap.Viridis,
    joinPath: [],
  };

  const buildSparse = (values: Map<number, number>, slotCount: number) =>
    buildLabelColorLut({
      colorBy: SPARSE_COLOR_BY,
      sparse: fakeSparse(values, slotCount),
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });

  it("gives an unread slot the code for ZERO, not the no-value sentinel", async () => {
    // A slice is the complete truth for its feature, so a bin it does not
    // mention has expression exactly zero. The baseline is now the allocation's
    // fill rather than a second pass over every slot — this pins that the
    // ANSWER did not change with the pass that used to produce it.
    const result = await buildSparse(new Map([[3, 7]]), 10);
    const data = dataOf(result.texture);

    expect(result.valueMin).toBe(0);
    expect(result.valueMax).toBe(7);
    expect(result.idOffset).toBe(0);

    // The window runs 0..7, so the code for zero is 0 and the code for 7 is the max.
    expect(codeAt(data, 3)).toBe(VALUE_CODE_MAX);
    for (const slot of [0, 1, 2, 4, 9]) {
      expect(codeAt(data, slot)).toBe(0);
      expect(codeAt(data, slot)).not.toBe(CODE_NO_VALUE);
    }
  });

  it("includes zero in the window, so an all-positive gene does not start at its own minimum", async () => {
    const result = await buildSparse(
      new Map([
        [1, 5],
        [2, 9],
      ]),
      4,
    );
    expect(result.valueMin).toBe(0);
    expect(result.valueMax).toBe(9);
    // Slot 0 was never mentioned: it decodes to the bottom of the window, zero.
    expect(codeAt(dataOf(result.texture), 0)).toBe(0);
  });

  it("keeps a negative value in the window and still zeroes the unmentioned slots", async () => {
    const result = await buildSparse(new Map([[1, -4]]), 3);
    expect(result.valueMin).toBe(-4);
    expect(result.valueMax).toBe(0);
    const data = dataOf(result.texture);
    // Window -4..0, so zero is the TOP of the range, not the bottom.
    expect(codeAt(data, 1)).toBe(0);
    expect(codeAt(data, 0)).toBe(VALUE_CODE_MAX);
    expect(codeAt(data, 2)).toBe(VALUE_CODE_MAX);
  });

  it("does not divide by a zero span when every value is zero", async () => {
    const result = await buildSparse(new Map([[0, 0]]), 2);
    expect(result.valueMin).toBe(0);
    expect(result.valueMax).toBe(1);
    expect(codeAt(dataOf(result.texture), 1)).toBe(0);
  });
});

describe("buildLabelColorLut — reusing the table", () => {
  const fakeSparse = (values: Map<number, number>, slotCount: number) =>
    ({
      source: { name: "expression" },
      read: async () => ({ values, slotCount }),
    }) as unknown as NonNullable<Parameters<typeof buildLabelColorLut>[0]["sparse"]>;

  const gene = (
    values: Map<number, number>,
    slotCount: number,
    extra: Partial<Parameters<typeof buildLabelColorLut>[0]> = {},
  ) =>
    buildLabelColorLut({
      colorBy: { dataset: "ds", at: [{ axis: "gene", value: 1 }], colormap: ColorMap.Viridis, joinPath: [] },
      sparse: fakeSparse(values, slotCount),
      filterBys: [],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
      ...extra,
    });

  it("refills the SAME buffer and texture on a gene switch", async () => {
    // The whole point: the slot table spans the object axis, so a gene switch
    // changes what is in it and never how big it is. Allocating again would be
    // eleven megabytes of garbage and a GPU texture destroyed and recreated.
    const first = await gene(new Map([[1, 4]]), 8);
    const second = await gene(new Map([[2, 9]]), 8, { reuse: first.arena });

    expect(second.arena).toBe(first.arena);
    expect(second.texture).toBe(first.texture);
    expect(second.arena!.lut.data).toBe(first.arena!.lut.data);
  });

  it("leaves NO trace of the previous gene in the refilled table", async () => {
    // The hazard reuse invites: slot 1 carried a value last gene and carries
    // none this gene, so the fill has to have reached it.
    const first = await gene(new Map([[1, 4]]), 8);
    const second = await gene(new Map([[2, 9]]), 8, { reuse: first.arena });

    const data = dataOf(second.texture);
    expect(second.valueMax).toBe(9);
    expect(codeAt(data, 2)).toBe(VALUE_CODE_MAX); // this gene's value
    expect(codeAt(data, 1)).toBe(0); // last gene's slot, back to zero
  });

  it("allocates afresh when the slot count moves", async () => {
    const first = await gene(new Map([[1, 4]]), 8);
    const second = await gene(new Map([[1, 4]]), 16, { reuse: first.arena });

    expect(second.arena).not.toBe(first.arena);
    expect(second.texture).not.toBe(first.texture);
  });

  it("marks the texture for re-upload after a refill", async () => {
    // `needsUpdate` is write-only on a three texture — it bumps `version`,
    // which is what the renderer actually reads to decide to re-upload.
    const first = await gene(new Map([[1, 4]]), 8);
    const before = first.texture!.version;
    const second = await gene(new Map([[2, 9]]), 8, { reuse: first.arena });
    expect(second.texture!.version).toBeGreaterThan(before);
  });

  it("writes NOTHING when the build is superseded", async () => {
    // Two builds racing on one shared buffer is what reuse makes possible, so
    // a superseded build must bow out before its first write — not after.
    const first = await gene(new Map([[1, 4]]), 8);
    const before = Array.from(first.arena!.lut.data);

    const second = await gene(new Map([[2, 9]]), 8, {
      reuse: first.arena,
      stillWanted: () => false,
    });

    expect(second.superseded).toBe(true);
    expect(second.texture).toBeNull();
    expect(second.arena).toBeNull();
    expect(Array.from(first.arena!.lut.data)).toEqual(before);
  });
});

describe("buildLabelColorLut — columnar and row reads agree", () => {
  const CASES: Record<string, Record<number, unknown>> = {
    area: { 3: 30, 1: 10, 2: 20 },
    kind: { 1: "a", 2: "b", 3: "a" },
  };

  const build = (column: string, columnar: boolean, colormap: ColorMap) =>
    buildLabelColorLut({
      colorBy: { table: "t1", column, colormap, joinPath: [] },
      filterBys: [{ table: "t1", column: "area", min: 15, exclude: false, joinPath: [] }],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine(CASES, { columnar }),
    });

  it("paints a MEASURE colouring identically either way", async () => {
    const columnar = await build("area", true, ColorMap.Viridis);
    const rows = await build("area", false, ColorMap.Viridis);

    expect(columnar.valueMin).toBe(rows.valueMin);
    expect(columnar.valueMax).toBe(rows.valueMax);
    expect(columnar.idOffset).toBe(rows.idOffset);
    expect(Array.from(dataOf(columnar.texture))).toEqual(Array.from(dataOf(rows.texture)));
  });

  it("paints a CATEGORICAL colouring identically either way", async () => {
    // The ranking walks the values twice — once for the distinct set, once to
    // paint — so it is the shape most likely to differ between the two readers.
    const columnar = await build("kind", true, ColorMap.Hues);
    const rows = await build("kind", false, ColorMap.Hues);

    expect(Array.from(dataOf(columnar.texture))).toEqual(Array.from(dataOf(rows.texture)));
  });

  it("still applies the filter when the columnar read declines", async () => {
    const rows = await build("area", false, ColorMap.Viridis);
    const data = dataOf(rows.texture);
    expect(visibleAt(data, 0)).toBe(0); // id 1: area 10, under the bound
    expect(visibleAt(data, 1)).toBe(255); // id 2: area 20
    expect(visibleAt(data, 2)).toBe(255); // id 3: area 30
  });
});

describe("buildLabelColorLut — a rule over a sparse matrix", () => {
  /** Reads one canned slice, whichever matrix and position is asked for. */
  const fakeReadSparse = (values: Map<number, number>, slotCount: number) => async () => ({
    values,
    slotCount,
  });

  const sparseRule = (min: number, max: number) => ({
    dataset: "ds",
    at: [{ axis: "ion", value: 7 }],
    min,
    max,
    exclude: false,
    joinPath: [],
  });

  it("hides the objects a bound excludes, the absent ones read as zero", async () => {
    // Six objects in the matrix, two of them detected. The bound starts above
    // zero, so the four the slice never mentions are dropped with the low one.
    const result = await buildLabelColorLut({
      colorBy: null,
      filterBys: [sparseRule(5, 100)],
      readSparse: fakeReadSparse(
        new Map([
          [1, 40],
          [2, 1],
        ]),
        6,
      ),
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });
    const data = dataOf(result.texture);

    // The table spans the matrix's whole object axis: the absent objects need
    // slots to be hidden in.
    expect(result.idOffset).toBe(0);
    expect(visibleAt(data, 1)).toBe(255); // detected, inside the band
    expect(visibleAt(data, 2)).toBe(0); // detected, below it
    expect(visibleAt(data, 5)).toBe(0); // absent -> zero -> below it
  });

  it("keeps the absent objects when the bound contains zero", async () => {
    // The widest legal rule a picker can seed is the slice's own range, which
    // contains 0. Adding one must hide nothing.
    const result = await buildLabelColorLut({
      colorBy: null,
      filterBys: [sparseRule(0, 100)],
      readSparse: fakeReadSparse(new Map([[1, 40]]), 4),
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });
    const data = dataOf(result.texture);
    for (const slot of [0, 1, 2, 3]) expect(visibleAt(data, slot)).toBe(255);
  });

  it("badges a sparse rule it has no reader for instead of applying it to nothing", async () => {
    const result = await buildLabelColorLut({
      colorBy: null,
      filterBys: [sparseRule(5, 100)],
      readSparse: null,
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });
    expect(result.texture).toBeNull();
    expect(result.skipped.join(" ")).toContain("no datalayer connection");
  });

  it("says so when a sparse COLOURING is what silences the rules", async () => {
    const result = await buildLabelColorLut({
      colorBy: { dataset: "ds", at: [{ axis: "gene", value: 1 }], colormap: ColorMap.Viridis, joinPath: [] },
      sparse: {
        source: { name: "expression" },
        read: async () => ({ values: new Map([[1, 3]]), slotCount: 4 }),
      } as unknown as NonNullable<Parameters<typeof buildLabelColorLut>[0]["sparse"]>,
      filterBys: [sparseRule(5, 100)],
      plans: PLANS,
      storeId: MASK_STORE,
      engine: fakeEngine({}),
    });
    expect(result.skipped.join(" ")).toContain("no filter is applied");
  });
});
