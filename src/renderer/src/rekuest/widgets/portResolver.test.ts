import { describe, expect, it, vi } from "vitest";

vi.mock("../api/graphql", () => ({
  PortKind: {
    Bool: "BOOL",
    Date: "DATE",
    Dict: "DICT",
    Enum: "ENUM",
    Float: "FLOAT",
    Int: "INT",
    Interface: "INTERFACE",
    List: "LIST",
    MemoryStructure: "MEMORY_STRUCTURE",
    Model: "MODEL",
    String: "STRING",
    Structure: "STRUCTURE",
    Union: "UNION",
  },
}));
vi.mock("@/providers/smart/registry", () => ({
  smartRegistry: { getDisplayName: (identifier: string) => identifier },
}));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import type { FieldValues, ResolverOptions } from "react-hook-form";
import { z } from "zod";
import { PortKind } from "../api/graphql";
import { collectPortIssues, createPortResolver } from "./portResolver";
import type { PortablePort } from "./types";
import { buildZodSchema } from "./utils";

const p = (over: Record<string, unknown> & { kind: PortKind; key: string }): PortablePort =>
  over as unknown as PortablePort;

const gtValidator = (dependency: string, message: string) => ({
  call: {
    operation: "compare.gt",
    arguments: [
      { key: "a", value_path: "value" },
      { key: "b", value_path: dependency },
    ],
  },
  dependencies: [dependency],
  errorMessage: message,
});

const run = async (
  ports: PortablePort[],
  values: FieldValues,
  mounted: string[],
  extra: { portsPath?: string[]; schema?: z.ZodTypeAny } = {},
) => {
  const schema =
    extra.schema ??
    (extra.portsPath?.length
      ? z.object({ [extra.portsPath[0]]: buildZodSchema(ports) })
      : buildZodSchema(ports));
  const resolver = createPortResolver(schema, ports, { portsPath: extra.portsPath });
  const result = await resolver(values, undefined, {
    names: mounted,
    fields: {},
    criteriaMode: "firstError",
    shouldUseNativeValidation: false,
  } as unknown as ResolverOptions<FieldValues>);
  return { ...result, mounted: resolver.mountedNames() };
};

describe("collectPortIssues", () => {
  it("runs validators on list items, dict rows, the selected union variant and model children", () => {
    const ports = [
      p({ kind: PortKind.Int, key: "min" }),
      p({
        kind: PortKind.List,
        key: "l",
        children: [{ kind: PortKind.Int, key: "i", validators: [gtValidator("/min", "item too small")] }],
      }),
      p({
        kind: PortKind.Dict,
        key: "d",
        children: [{ kind: PortKind.Int, key: "v", validators: [gtValidator("/min", "entry too small")] }],
      }),
      p({
        kind: PortKind.Union,
        key: "u",
        children: [
          { kind: PortKind.String, key: "s" },
          { kind: PortKind.Int, key: "n", validators: [gtValidator("/min", "variant too small")] },
        ],
      }),
      p({
        kind: PortKind.Model,
        key: "m",
        children: [
          { kind: PortKind.Int, key: "lo" },
          { kind: PortKind.Int, key: "hi", validators: [gtValidator("lo", "hi must exceed lo")] },
        ],
      }),
    ];
    const values = {
      min: 10,
      l: [{ __value: 20 }, { __value: 1 }],
      d: [{ __key: "a", __value: 2 }],
      u: { __use: "1", __value: 3 },
      m: { lo: 5, hi: 4 },
    };
    expect(collectPortIssues(ports, values, [])).toEqual([
      { path: "l.1.__value", message: "item too small" },
      { path: "d.0.__value", message: "entry too small" },
      { path: "u.__value", message: "variant too small" },
      { path: "m.hi", message: "hi must exceed lo" },
    ]);
  });

  it("resolves '..' paths into sibling values", () => {
    const ports = [
      p({ kind: PortKind.Model, key: "range", children: [{ kind: PortKind.Int, key: "min" }] }),
      p({ kind: PortKind.Int, key: "max", validators: [gtValidator("range..min", "max too small")] }),
    ];
    expect(collectPortIssues(ports, { range: { min: 5 }, max: 1 }, [])).toEqual([
      { path: "max", message: "max too small" },
    ]);
    expect(collectPortIssues(ports, { range: { min: 0 }, max: 1 }, [])).toEqual([]);
  });
});

describe("createPortResolver", () => {
  const minMax = [
    p({ kind: PortKind.Int, key: "min" }),
    p({ kind: PortKind.Int, key: "max", validators: [gtValidator("min", "max must exceed min")] }),
  ];

  it("passes valid values through parsed", async () => {
    const result = await run(minMax, { min: "1", max: "5" }, ["min", "max"]);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ min: 1, max: 5 });
  });

  it("reports validator failures at the port path", async () => {
    const result = await run(minMax, { min: 5, max: 1 }, ["min", "max"]);
    expect(result.errors).toMatchObject({ max: { message: "max must exceed min" } });
  });

  it("still runs validators when a sibling fails its type check", async () => {
    const ports = [...minMax, p({ kind: PortKind.String, key: "name" })];
    const result = await run(ports, { min: 5, max: 1, name: 42 }, ["min", "max", "name"]);
    expect(result.errors).toMatchObject({
      max: { message: "max must exceed min" },
      name: { message: expect.any(String) },
    });
  });

  it("drops errors on fields that are not mounted and reports the mounted set", async () => {
    const ports = [p({ kind: PortKind.String, key: "shown" }), p({ kind: PortKind.String, key: "hidden" })];
    const result = await run(ports, { shown: "ok" }, ["shown"]);
    expect(result.errors).toEqual({});
    expect([...result.mounted]).toEqual(["shown"]);
    const stillFails = await run(ports, {}, ["shown"]);
    expect(Object.keys(stillFails.errors)).toEqual(["shown"]);
  });

  it("keeps a union's inner error when only the union root is mounted", async () => {
    const ports = [
      p({
        kind: PortKind.Union,
        key: "u",
        children: [
          { kind: PortKind.Int, key: "i" },
          { kind: PortKind.String, key: "s" },
        ],
      }),
    ];
    const result = await run(ports, { u: { __use: "1", __value: 9 } }, ["u"]);
    expect(result.errors).toMatchObject({ u: { __value: { message: expect.any(String) } } });
  });

  it("honours portsPath for forms that nest args under a key", async () => {
    const result = await run(minMax, { args: { min: 5, max: 1 } }, ["args.min", "args.max"], {
      portsPath: ["args"],
    });
    expect(result.errors).toMatchObject({ args: { max: { message: "max must exceed min" } } });
  });

  it("composes with an additional schema via extend", async () => {
    const schema = buildZodSchema(minMax).extend({ name: z.string().min(1) });
    const result = await run(minMax, { min: 1, max: 2, name: "" }, ["min", "max", "name"], { schema });
    expect(Object.keys(result.errors)).toEqual(["name"]);
  });
});
