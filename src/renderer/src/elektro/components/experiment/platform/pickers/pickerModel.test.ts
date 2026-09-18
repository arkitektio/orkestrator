import { describe, expect, it } from "vitest";
import {
  categoricalRgb,
  chainOf,
  chainSql,
  colorByInput,
  colorResolver,
  entryProblem,
  pickerOptions,
  ruleKeeps,
  rulesKeep,
} from "./pickerModel";

const tables: Record<string, { id: string; store: { id: string }; idColumn: string }> = {
  units: { id: "units", store: { id: "su" }, idColumn: "unit" },
  channels: { id: "channels", store: { id: "sc" }, idColumn: "channel" },
  probes: { id: "probes", store: { id: "sp" }, idColumn: "probe" },
};
const tableOf = (id: string) => tables[id] ?? null;
const urlOf = (storeId: string) => `s3://b/${storeId}.parquet`;

describe("chains", () => {
  it("reads the root's own column directly", () => {
    const entry = { table: "units", column: "depth" };
    expect(chainOf(entry, "units")).toEqual(["units"]);
    expect(chainSql(entry, "units", tableOf, urlOf)).toBe(
      `SELECT a0."unit" AS __key, a0."depth" AS __v FROM read_parquet('s3://b/su.parquet') a0`,
    );
  });

  it("joins one hop per step, on the next table's identity column", () => {
    const entry = {
      table: "probes",
      column: "region",
      joinPath: [
        { table: "units", column: "channel_id" },
        { table: "channels", column: "probe_id" },
      ],
    };
    expect(chainOf(entry, "units")).toEqual(["units", "channels", "probes"]);
    const sql = chainSql(entry, "units", tableOf, urlOf)!;
    expect(sql).toContain(`JOIN read_parquet('s3://b/sc.parquet') a1 ON a0."channel_id" = a1."channel"`);
    expect(sql).toContain(`JOIN read_parquet('s3://b/sp.parquet') a2 ON a1."probe_id" = a2."probe"`);
    expect(sql.startsWith(`SELECT a0."unit" AS __key, a2."region" AS __v`)).toBe(true);
    // Starting past the root: keyed by the first joined table's identity.
    expect(chainSql(entry, "units", tableOf, urlOf, { from: 1 })!.startsWith(`SELECT a1."channel" AS __key`)).toBe(true);
  });

  it("badges what it will not draw", () => {
    const deep = {
      table: "x",
      column: "c",
      joinPath: [
        { table: "units", column: "a" },
        { table: "b", column: "b" },
        { table: "c", column: "c" },
      ],
    };
    expect(entryProblem(deep, "units")).toMatch(/at most 2/);
    expect(entryProblem({ table: "other", column: "c" }, "units")).not.toBeNull();
    expect(entryProblem({ table: "units", column: "c" }, "units")).toBeNull();
  });
});

describe("colour", () => {
  const sample = (_c: string | null, t: number): [number, number, number] => [t, t, t];

  it("maps numbers over the entry's bounds, else the data's", () => {
    const resolve = colorResolver({ table: "u", column: "d" }, [0, 5, 10], sample);
    expect(resolve(5)).toEqual([0.5, 0.5, 0.5]);
    const bounded = colorResolver({ table: "u", column: "d", min: 0, max: 20 }, [0, 5, 10], sample);
    expect(bounded(5)).toEqual([0.25, 0.25, 0.25]);
    expect(resolve(null)).toBeNull();
  });

  it("gives categories stable colours by sorted value", () => {
    const a = colorResolver({ table: "u", column: "c" }, ["b", "a"], sample);
    const b = colorResolver({ table: "u", column: "c" }, ["a", "b", "a"], sample);
    expect(a("a")).toEqual(b("a"));
    expect(a("a")).toEqual(categoricalRgb(0));
    expect(a("b")).not.toEqual(a("a"));
  });

  it("treats numbers as categories under a qualitative colormap", () => {
    const resolve = colorResolver({ table: "u", column: "c", colormap: "HUES" }, [3, 1], sample);
    expect(resolve(1)).toEqual(categoricalRgb(0));
  });
});

describe("filters", () => {
  it("keeps ranges and value sets, and inverts with exclude", () => {
    expect(ruleKeeps({ table: "t", column: "c", min: 0, max: 10 }, 5)).toBe(true);
    expect(ruleKeeps({ table: "t", column: "c", min: 0, max: 10 }, 11)).toBe(false);
    expect(ruleKeeps({ table: "t", column: "c", values: ["good"] }, "good")).toBe(true);
    expect(ruleKeeps({ table: "t", column: "c", values: ["good"], exclude: true }, "good")).toBe(false);
    expect(ruleKeeps({ table: "t", column: "c", values: ["good"] }, null)).toBe(false);
    expect(ruleKeeps({ table: "t", column: "c", values: ["good"], exclude: true }, null)).toBe(true);
  });

  it("ANDs the active rules", () => {
    const values = new Map<unknown, unknown>([[1, 5]]);
    const rules = [
      { filter: { table: "t", column: "c", min: 0 }, valueOf: (k: unknown) => values.get(k) },
      { filter: { table: "t", column: "c", max: 4 }, valueOf: (k: unknown) => values.get(k) },
    ];
    expect(rulesKeep(rules, 1)).toBe(false);
    expect(rulesKeep(rules.slice(0, 1), 1)).toBe(true);
  });
});

describe("pickerOptions", () => {
  it("offers the root's data columns, numeric first, and one hop through references", () => {
    const root = {
      id: "units",
      name: "units",
      columns: [
        { name: "unit", role: "COORDINATE", axisType: "INDEX", dtype: "int64" },
        { name: "quality", role: "LABEL", dtype: "string" },
        { name: "depth", role: "ATTRIBUTE", dtype: "float64" },
        { name: "channel_id", role: "ATTRIBUTE", dtype: "int64", references: { id: "channels", name: "channels" } },
      ],
    };
    const channels = { id: "channels", name: "channels", columns: [{ name: "x", role: "ATTRIBUTE", dtype: "float32" }] };
    const options = pickerOptions(root, (id) => (id === "channels" ? channels : null));
    expect(options.map((o) => o.caption)).toEqual(["depth", "channel_id", "quality", "channel_id › x"]);
    expect(options[3].joinPath).toEqual([{ table: "units", column: "channel_id" }]);
  });
});

describe("colorByInput", () => {
  it("carries every field so a whole-array write drops nothing", () => {
    expect(
      colorByInput({ table: "t", column: "c", joinPath: [{ table: "r", column: "fk" }], colormap: "VIRIDIS", min: 1 }),
    ).toEqual({
      table: "t",
      column: "c",
      joinPath: [{ table: "r", column: "fk" }],
      colormap: "VIRIDIS",
      min: 1,
      max: null,
      label: null,
    });
  });
});
