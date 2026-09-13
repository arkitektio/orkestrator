// @vitest-environment jsdom
// (`fabriksColorLut.ts` reaches the generated `graphql.ts` for the ColorMap
// enum, whose Apollo hooks barrel touches `window` on load.)
import { describe, expect, it } from "vitest";

import { ColorMap } from "@/mikro-next/api/graphql";
import type { AttributePlanLike } from "@/mikro-next/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro-next/lib/attributes/lookupEngine";
import {
  accessForTable,
  buildColorLut,
  composeMeshLutAppearance,
  isDirectEntry,
  type ColorLutPaint,
  type ColorLutRequest,
} from "./fabriksColorLut";
import { CODE_HIDDEN, CODE_NO_VALUE, VALUE_CODE_MAX } from "../../../platform/attributes/valueLut";
import type { FabriksObjectEntry } from "./fabriksCatalogs";

/** Build and paint in one step — what most assertions want. */
const paintColorLut = async (request: ColorLutRequest) => {
  const prepared = await buildColorLut(request);
  return { ...prepared.paint(), skipped: prepared.skipped };
};

const codeAt = ({ arena }: Pick<ColorLutPaint, "arena">, ordinal: number): number =>
  arena.lut.view[ordinal];

const object = (objectId: number, ordinal: number): FabriksObjectEntry => ({
  objectId,
  ordinal,
  bboxMin: [0, 0, 0],
  bboxMax: [1, 1, 1],
  vertexCount: 3,
  indexCount: 3,
  cells: [],
});

const OBJECTS = [object(10, 0), object(20, 1), object(30, 2)];

const store = { id: "store-a", bucket: "b", key: "k" };

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
          store,
          keyColumns: [{ axis: "object_id", column: { id: "c", name: keyColumn } }],
          attributes: [],
        },
      },
    ],
  }) as unknown as AttributePlanLike;

/** An engine stand-in: one canned (object_id, value) result per read. */
const fakeEngine = (byColumn: Record<string, Record<number, unknown>>) => {
  const reads: string[] = [];
  const engine = {
    readAcross: async (
      _stores: readonly unknown[],
      buildSql: (urlOf: (id: string) => string) => string,
    ) => {
      const sql = buildSql(() => "s3://b/k");
      reads.push(sql);
      const column = Object.keys(byColumn).find((name) => sql.includes(`"${name}"`));
      if (!column) return [];
      return Object.entries(byColumn[column]).map(([id, value]) => ({
        object_id: Number(id),
        value,
      }));
    },
  } as unknown as AttributeLookupEngine;
  return { engine, reads };
};



describe("accessForTable", () => {
  it("takes the store and key column off the MESH-sampled plan for that table", () => {
    const access = accessForTable([meshPlan("t1", "label_id")], "t1");
    expect(access).toEqual({ store, keyColumn: "label_id" });
  });

  it("is null for a table no plan reaches", () => {
    expect(accessForTable([meshPlan("t1", "label_id")], "t2")).toBeNull();
  });

  it("ignores an array-sampled plan — a mesh id cannot execute one", () => {
    const arrayPlan = {
      ...meshPlan("t1", "label_id"),
      sample: { ...meshPlan("t1", "label_id").sample, __typename: "ArraySample" },
    } as unknown as AttributePlanLike;
    expect(accessForTable([arrayPlan], "t1")).toBeNull();
  });
});

describe("isDirectEntry", () => {
  it("separates a direct reach from a joined one", () => {
    expect(isDirectEntry({ joinPath: [] })).toBe(true);
    expect(isDirectEntry({})).toBe(true);
    expect(isDirectEntry({ joinPath: [{ table: "t", column: "c" }] })).toBe(false);
  });
});

describe("buildColorLut", () => {
  const plans = [meshPlan("t1", "label_id")];

  it("quantises a numeric column over its own range and leaves everything visible", async () => {
    const { engine } = fakeEngine({ area: { 10: 0, 20: 5, 30: 10 } });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: { table: "t1", column: "area", colormap: ColorMap.Viridis, joinPath: [] },
      filterBys: [],
      plans,
      engine,
    });
    expect(paint.skipped).toEqual([]);
    // Codes run the data's own range; the window rides with them.
    expect(codeAt(paint, 0)).toBe(0);
    expect(codeAt(paint, 2)).toBe(VALUE_CODE_MAX);
    expect(paint.window).toEqual({ valueMin: 0, valueMax: 10 });
    expect(paint.qualitative).toBe(false);
    // No rule active: no slot carries the HIDDEN sentinel.
    expect([0, 1, 2].map((ordinal) => codeAt(paint, ordinal) === CODE_HIDDEN)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("gives every object sharing a categorical value the same code", async () => {
    const { engine } = fakeEngine({ phenotype: { 10: "a", 20: "b", 30: "a" } });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: { table: "t1", column: "phenotype", joinPath: [] },
      filterBys: [],
      plans,
      engine,
    });
    expect(paint.qualitative).toBe(true);
    expect(codeAt(paint, 0)).toBe(codeAt(paint, 2));
    expect(codeAt(paint, 0)).not.toBe(codeAt(paint, 1));
  });

  it("drops objects outside a bound, and inverts them under exclude", async () => {
    const values = { area: { 10: 1, 20: 5, 30: 9 } };
    const keep = await paintColorLut({
      objects: OBJECTS,
      colorBy: null,
      filterBys: [{ table: "t1", column: "area", min: 4, max: 6, exclude: false, joinPath: [] }],
      plans,
      engine: fakeEngine(values).engine,
    });
    expect([0, 1, 2].map((o) => codeAt(keep, o))).toEqual([
      CODE_HIDDEN,
      CODE_NO_VALUE,
      CODE_HIDDEN,
    ]);

    const drop = await paintColorLut({
      objects: OBJECTS,
      colorBy: null,
      filterBys: [{ table: "t1", column: "area", min: 4, max: 6, exclude: true, joinPath: [] }],
      plans,
      engine: fakeEngine(values).engine,
    });
    expect([0, 1, 2].map((o) => codeAt(drop, o))).toEqual([
      CODE_NO_VALUE,
      CODE_HIDDEN,
      CODE_NO_VALUE,
    ]);
  });

  it("combines rules with AND", async () => {
    const { engine } = fakeEngine({
      area: { 10: 1, 20: 5, 30: 9 },
      phenotype: { 10: "a", 20: "a", 30: "b" },
    });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: null,
      filterBys: [
        { table: "t1", column: "area", min: 0, max: 6, exclude: false, joinPath: [] },
        { table: "t1", column: "phenotype", values: ["a"], exclude: false, joinPath: [] },
      ],
      plans,
      engine,
    });
    // Object 10 passes both, 20 passes both, 30 fails both — only 30 is dropped.
    expect([0, 1, 2].map((o) => codeAt(paint, o) === CODE_HIDDEN)).toEqual([false, false, true]);
  });

  it("keeps everything for a rule that states nothing", async () => {
    const { engine } = fakeEngine({ area: { 10: 1, 20: 5, 30: 9 } });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: null,
      filterBys: [{ table: "t1", column: "area", exclude: false, joinPath: [] }],
      plans,
      engine,
    });
    expect([0, 1, 2].map((o) => codeAt(paint, o))).toEqual([
      CODE_NO_VALUE,
      CODE_NO_VALUE,
      CODE_NO_VALUE,
    ]);
  });

  it("a colormap change repaints nothing and re-reads nothing — it is appearance", async () => {
    const { engine, reads } = fakeEngine({ area: { 10: 0, 20: 5, 30: 10 } });
    const request = (colormap: ColorMap): ColorLutRequest => ({
      objects: OBJECTS,
      colorBy: { table: "t1", column: "area", colormap, joinPath: [] },
      filterBys: [],
      plans,
      engine,
    });
    const first = await paintColorLut(request(ColorMap.Viridis));
    expect(reads).toHaveLength(1);
    // Same class of colormap: identical codes (the whole point of the value
    // encoding), no second full-table SELECT — the palette row alone differs.
    const second = await paintColorLut(request(ColorMap.Inferno));
    expect(reads).toHaveLength(1);
    expect([...second.arena.lut.view]).toEqual([...first.arena.lut.view]);
    const a = composeMeshLutAppearance({ table: "t1", column: "area", colormap: ColorMap.Viridis }, first);
    const b = composeMeshLutAppearance({ table: "t1", column: "area", colormap: ColorMap.Inferno }, second);
    expect(a.palette!.image.data).not.toEqual(b.palette!.image.data);
  });

  it("crossing to a qualitative colormap re-ranks the codes but still re-reads nothing", async () => {
    const { engine, reads } = fakeEngine({ area: { 10: 0, 20: 5, 30: 10 } });
    const measure = await paintColorLut({
      objects: OBJECTS,
      colorBy: { table: "t1", column: "area", colormap: ColorMap.Viridis, joinPath: [] },
      filterBys: [],
      plans,
      engine,
    });
    const ranked = await paintColorLut({
      objects: OBJECTS,
      colorBy: { table: "t1", column: "area", colormap: ColorMap.Hues, joinPath: [] },
      filterBys: [],
      plans,
      engine,
    });
    expect(reads).toHaveLength(1);
    expect(measure.qualitative).toBe(false);
    expect(ranked.qualitative).toBe(true);
    expect([...ranked.arena.lut.view]).not.toEqual([...measure.arena.lut.view]);
  });

  it("reuses the arena across paints of the same size — the texture object survives", async () => {
    const { engine } = fakeEngine({ area: { 10: 0, 20: 5, 30: 10 } });
    const request: ColorLutRequest = {
      objects: OBJECTS,
      colorBy: { table: "t1", column: "area", colormap: ColorMap.Viridis, joinPath: [] },
      filterBys: [],
      plans,
      engine,
    };
    const first = (await buildColorLut(request)).paint();
    const second = (await buildColorLut(request)).paint(first.arena);
    expect(second.arena).toBe(first.arena);
    expect(second.arena.texture).toBe(first.arena.texture);
  });

  it("skips a joined entry rather than guessing its join, and reads nothing for it", async () => {
    const { engine, reads } = fakeEngine({ area: { 10: 1 } });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: {
        table: "t2",
        column: "area",
        joinPath: [{ table: "t1", column: "track_id" }],
      },
      filterBys: [],
      plans,
      engine,
    });
    expect(reads).toEqual([]);
    expect(paint.skipped).toHaveLength(1);
    expect(paint.skipped[0]).toContain("join");
    // Untouched is "visible, no value" — exactly today's rendering.
    expect(codeAt(paint, 0)).toBe(CODE_NO_VALUE);
  });

  it("skips an entry whose table no plan reaches", async () => {
    const { engine } = fakeEngine({ area: { 10: 1 } });
    const paint = await paintColorLut({
      objects: OBJECTS,
      colorBy: null,
      filterBys: [{ table: "nope", column: "area", min: 0, exclude: false, joinPath: [] }],
      plans,
      engine,
    });
    // An unreadable rule applies to NOTHING: blanking the layer because a read
    // failed is the worst possible reading of "filter".
    expect([0, 1, 2].map((o) => codeAt(paint, o))).toEqual([
      CODE_NO_VALUE,
      CODE_NO_VALUE,
      CODE_NO_VALUE,
    ]);
    expect(paint.skipped[0]).toContain("no attribute plan");
  });

  it("sizes the texture by the ordinal ceiling, wrapping past the strip width", async () => {
    const { engine } = fakeEngine({});
    const paint = await paintColorLut({
      objects: [object(1, 0), object(2, 4095)],
      colorBy: null,
      filterBys: [],
      plans,
      engine,
    });
    expect(paint.arena.lut.width).toBe(2048);
    expect(paint.arena.lut.height).toBe(2);
  });
});

describe("composeMeshLutAppearance", () => {
  const window = { valueMin: 2, valueMax: 8 };

  it("a measure colouring runs the ramp between the entry's bounds, else the data's range", () => {
    const entry = { table: "t1", column: "area", colormap: ColorMap.Viridis };
    expect(composeMeshLutAppearance(entry, { window, qualitative: false })).toMatchObject({
      climMin: 2,
      climMax: 8,
    });
    expect(
      composeMeshLutAppearance({ ...entry, min: 3, max: 5 }, { window, qualitative: false }),
    ).toMatchObject({ climMin: 3, climMax: 5 });
  });

  it("a rank colouring pins the unit window regardless of the entry's bounds", () => {
    const entry = { table: "t1", column: "phenotype", colormap: ColorMap.Hues, min: 3, max: 5 };
    expect(composeMeshLutAppearance(entry, { window, qualitative: true })).toMatchObject({
      climMin: 0,
      climMax: 1,
    });
  });

  it("no colouring means no palette", () => {
    expect(composeMeshLutAppearance(null, { window, qualitative: false })).toEqual({
      palette: null,
      climMin: 0,
      climMax: 1,
    });
  });
});
