import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// `../api/graphql` is the 1.3MB generated Apollo module (and pulls in the
// rekuest hooks/client). We only need the PortKind enum, so stub it. The smart
// registry drags in UI components, so it is stubbed too; this stays a fast,
// isolated unit test.
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

// The port-call catalog pulls in the standard blok functions, one of which
// toasts; keep the toaster out of the unit test.
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import type { LabellablePort, PortablePort } from "./types";
import { PortKind } from "../api/graphql";
import {
  argDictToArgs,
  buildZodSchema,
  isObjectPort,
  isScalarPort,
  pathToName,
  portToDefaults,
  portToLabel,
  portToMinItemWidth,
  portToName,
  portToZod,
  recursiveExtract,
  recursiveSet,
  setData,
  submittedDataToRekuestFormat,
} from "./utils";

const p = (over: Partial<PortablePort> & { kind: PortKind; key: string }): PortablePort =>
  over as PortablePort;

describe("pathToName", () => {
  it("joins path segments with dots", () => {
    expect(pathToName(["a", "b", "c"])).toBe("a.b.c");
  });
});

describe("isScalarPort", () => {
  it("treats scalars, structures and lists as scalar", () => {
    for (const kind of [
      PortKind.Bool,
      PortKind.Float,
      PortKind.Int,
      PortKind.String,
      PortKind.Date,
      PortKind.Structure,
      PortKind.List,
    ]) {
      expect(isScalarPort({ kind })).toBe(true);
    }
  });

  it("is false for dict and model", () => {
    expect(isScalarPort({ kind: PortKind.Dict })).toBe(false);
    expect(isScalarPort({ kind: PortKind.Model })).toBe(false);
  });
});

describe("isObjectPort", () => {
  it("is true for dict and model only", () => {
    expect(isObjectPort({ kind: PortKind.Dict } as LabellablePort)).toBe(true);
    expect(isObjectPort({ kind: PortKind.Model } as LabellablePort)).toBe(true);
    expect(isObjectPort({ kind: PortKind.Int } as LabellablePort)).toBe(false);
  });
});

describe("portToMinItemWidth", () => {
  it("gives complex kinds a wider track", () => {
    expect(portToMinItemWidth({ kind: PortKind.Model })).toBe(320);
    expect(portToMinItemWidth({ kind: PortKind.Union })).toBe(320);
  });

  it("packs scalars densely", () => {
    expect(portToMinItemWidth({ kind: PortKind.Int })).toBe(200);
    expect(portToMinItemWidth({ kind: PortKind.String })).toBe(200);
  });
});

describe("portToName", () => {
  it("prefers the explicit label, falling back to the key", () => {
    expect(portToName({ kind: PortKind.Int, key: "age", label: "Age" } as LabellablePort)).toBe("Age");
    expect(portToName({ kind: PortKind.Int, key: "age" } as LabellablePort)).toBe("age");
  });
});

describe("portToLabel", () => {
  it("labels scalar kinds", () => {
    expect(portToLabel({ kind: PortKind.Bool, key: "b" } as LabellablePort)).toBe("Bool");
    expect(portToLabel({ kind: PortKind.Int, key: "i" } as LabellablePort)).toBe("Int");
    expect(portToLabel({ kind: PortKind.String, key: "s" } as LabellablePort)).toBe("String");
  });

  it("resolves a structure identifier via the smart registry", () => {
    expect(
      portToLabel({ kind: PortKind.Structure, key: "s", identifier: "@mikro/folder" } as LabellablePort),
    ).toBe("@mikro/folder");
  });

  it("describes a list by its child", () => {
    const list = {
      kind: PortKind.List,
      key: "l",
      children: [{ kind: PortKind.Int, key: "c" }],
    } as LabellablePort;
    expect(portToLabel(list)).toBe("List of Int");
  });

  it("falls back to 'Unknown List' for a childless list", () => {
    expect(portToLabel({ kind: PortKind.List, key: "l", children: [] } as LabellablePort)).toBe(
      "Unknown List",
    );
  });
});

describe("portToZod", () => {
  it("validates strings", () => {
    const schema = portToZod(p({ kind: PortKind.String, key: "s" }));
    expect(schema.safeParse("hi").success).toBe(true);
    expect(schema.safeParse(5).success).toBe(false);
  });

  it("coerces ints", () => {
    const schema = portToZod(p({ kind: PortKind.Int, key: "i" }));
    expect(schema.parse("42")).toBe(42);
  });

  it("rejects non-numeric floats", () => {
    const schema = portToZod(p({ kind: PortKind.Float, key: "f" }));
    expect(schema.safeParse("not-a-number").success).toBe(false);
    expect(schema.parse("3.5")).toBe(3.5);
  });

  it("validates booleans", () => {
    const schema = portToZod(p({ kind: PortKind.Bool, key: "b" }));
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse("nope").success).toBe(false);
  });

  it("builds an enum from choices", () => {
    const schema = portToZod(
      p({ kind: PortKind.Enum, key: "e", choices: [{ value: "a" }, { value: "b" }] as any }),
    );
    expect(schema.safeParse("a").success).toBe(true);
    expect(schema.safeParse("z").success).toBe(false);
  });

  it("validates a structure as { __identifier, object }", () => {
    const schema = portToZod(p({ kind: PortKind.Structure, key: "s", identifier: "@x/s" }));
    expect(schema.safeParse({ __identifier: "@x/s", object: "id1" }).success).toBe(true);
    expect(schema.safeParse({ __identifier: "@other/s", object: "id1" }).success).toBe(false);
  });

  it("wraps nullable ports so null is accepted", () => {
    const schema = portToZod(p({ kind: PortKind.String, key: "s", nullable: true }));
    expect(schema.safeParse(null).success).toBe(true);
  });

  it("validates a list of wrapped values", () => {
    const schema = portToZod(
      p({ kind: PortKind.List, key: "l", children: [{ kind: PortKind.Int, key: "c" }] }),
    );
    expect(schema.safeParse([{ __value: 1 }, { __value: 2 }]).success).toBe(true);
  });

  it("validates a single-variant union as the { __use, __value } wrapper", () => {
    // The UnionWidget stores a union value as { __use: "<variantIndex>", __value }
    // so the chosen variant tab is unambiguous; portToZod validates that wrapper.
    const schema = portToZod(
      p({ kind: PortKind.Union, key: "u", children: [{ kind: PortKind.String, key: "c" }] }),
    );
    expect(schema.safeParse({ __use: "0", __value: "hi" }).success).toBe(true);
    expect(schema.safeParse("hi").success).toBe(false);
  });

  it("degrades an empty union to accept-anything with a warning instead of throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = portToZod(p({ kind: PortKind.Union, key: "u", children: [] }));
    expect(schema.safeParse("anything").success).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("degrades an unsupported kind (INTERFACE) instead of throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = portToZod(p({ kind: PortKind.Interface, key: "x" }));
    expect(schema.safeParse({ any: "thing" }).success).toBe(true);
    warn.mockRestore();
  });

  it("accepts undefined AND null for nullable ports (optional args left untouched)", () => {
    const schema = buildZodSchema([p({ kind: PortKind.String, key: "s", nullable: true })]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ s: null }).success).toBe(true);
    expect(schema.safeParse({ s: 5 }).success).toBe(false);
  });

  it("treats an emptied number input as missing, not 0", () => {
    const required = portToZod(p({ kind: PortKind.Int, key: "n" }));
    expect(required.safeParse("").success).toBe(false);
    expect(required.safeParse("7").data).toBe(7);
    expect(required.safeParse("1.5").success).toBe(false);
    const optional = portToZod(p({ kind: PortKind.Float, key: "f", nullable: true }));
    expect(optional.safeParse("").success).toBe(true);
    expect(optional.safeParse("").data).toBeUndefined();
    expect(optional.safeParse("2.5").data).toBe(2.5);
  });

  it("accepts ISO strings and Date objects for dates", () => {
    const schema = portToZod(p({ kind: PortKind.Date, key: "d" }));
    expect(schema.safeParse("2020-01-01T00:00:00.000Z").data).toBeInstanceOf(Date);
    expect(schema.safeParse(new Date()).success).toBe(true);
    expect(schema.safeParse("not a date").success).toBe(false);
  });

  it("stringifies a numeric quantity default", () => {
    const schema = portToZod(p({ kind: PortKind.Quantity, key: "q" }));
    expect(schema.safeParse(100).data).toBe("100");
    expect(schema.safeParse("").success).toBe(false);
  });

  it("accepts any string for an enum without choices", () => {
    const schema = portToZod(p({ kind: PortKind.Enum, key: "e" }));
    expect(schema.safeParse("real").success).toBe(true);
  });

  it("reports multi-variant union errors inside the chosen variant", () => {
    const schema = portToZod(
      p({
        kind: PortKind.Union,
        key: "u",
        children: [
          { kind: PortKind.Int, key: "i" },
          { kind: PortKind.Model, key: "m", children: [{ kind: PortKind.String, key: "name" }] },
        ],
      }),
    );
    expect(schema.safeParse({ __use: "0", __value: "3" }).success).toBe(true);
    const failed = schema.safeParse({ __use: "1", __value: { name: 5 } });
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.error.issues[0].path).toEqual(["__value", "name"]);
    }
  });

  it("memoizes the schema per port object", () => {
    const port = p({ kind: PortKind.String, key: "s" });
    expect(portToZod(port)).toBe(portToZod(port));
  });
});

describe("buildZodSchema", () => {
  it("composes a model object schema from its ports", () => {
    const schema = buildZodSchema([
      p({ kind: PortKind.String, key: "name" }),
      p({ kind: PortKind.Int, key: "age" }),
    ]);
    expect(schema.safeParse({ name: "Ada", age: "36" }).success).toBe(true);
    expect(schema.safeParse({ name: 5, age: "x" }).success).toBe(false);
  });

  it("adds an __identifier literal when given", () => {
    const schema = buildZodSchema([p({ kind: PortKind.String, key: "name" })], "@x/model");
    expect(schema.safeParse({ name: "Ada", __identifier: "@x/model" }).success).toBe(true);
    expect(schema.safeParse({ name: "Ada", __identifier: "@x/other" }).success).toBe(false);
  });

  it("carries no refinements, so extending with extra fields works", () => {
    const schema = buildZodSchema([
      p({ kind: PortKind.Int, key: "max", validators: [{ call: { operation: "x" } }] } as never),
    ]);
    expect(() => schema.extend({ name: z.string() })).not.toThrow();
  });
});

describe("recursiveSet / recursiveExtract round-trip", () => {
  const intList = p({ kind: PortKind.List, key: "l", children: [{ kind: PortKind.Int, key: "c" }] });

  it("wraps list items under __value on set", () => {
    expect(recursiveSet([1, 2], intList)).toEqual([{ __value: 1 }, { __value: 2 }]);
  });

  it("unwraps list items on extract", () => {
    expect(recursiveExtract([{ __value: 1 }, { __value: 2 }], intList)).toEqual([1, 2]);
  });

  it("returns scalars unchanged", () => {
    const intPort = p({ kind: PortKind.Int, key: "i" });
    expect(recursiveSet(7, intPort)).toBe(7);
    expect(recursiveExtract(7, intPort)).toBe(7);
  });

  it("returns null for nullish input on set/extract", () => {
    const intPort = p({ kind: PortKind.Int, key: "i" });
    expect(recursiveSet(null, intPort)).toBeNull();
    expect(recursiveExtract(undefined, intPort)).toBeNull();
  });

  it("maps a dict to keyed __value/__key pairs on set", () => {
    const dict = p({ kind: PortKind.Dict, key: "d", children: [{ kind: PortKind.Int, key: "c" }] });
    expect(recursiveSet({ a: 1, b: 2 }, dict)).toEqual([
      { __key: "a", __value: 1 },
      { __key: "b", __value: 2 },
    ]);
  });

  it("extracts a dict back to a keyed object", () => {
    const dict = p({ kind: PortKind.Dict, key: "d", children: [{ kind: PortKind.Int, key: "c" }] });
    expect(
      recursiveExtract([{ __key: "a", __value: 1 }, { __key: "b", __value: 2 }], dict),
    ).toEqual({ a: 1, b: 2 });
  });

  it("round-trips a model with a nested list", () => {
    const model = p({
      kind: PortKind.Model,
      key: "m",
      children: [
        { kind: PortKind.String, key: "name" },
        { kind: PortKind.List, key: "tags", children: [{ kind: PortKind.String, key: "t" }] },
      ],
    });
    const set = recursiveSet({ name: "a", tags: ["x", "y"] }, model);
    expect(set).toEqual({ name: "a", tags: [{ __value: "x" }, { __value: "y" }] });
    expect(recursiveExtract(set, model)).toEqual({ name: "a", tags: ["x", "y"] });
  });

  it("seeds a model without a value from its children's defaults", () => {
    const model = p({
      kind: PortKind.Model,
      key: "m",
      children: [
        { kind: PortKind.String, key: "name", default: "anon" },
        { kind: PortKind.Int, key: "age" },
      ],
    });
    expect(recursiveSet(undefined, model)).toEqual({ name: "anon", age: null });
    const bare = p({ kind: PortKind.Model, key: "m", children: [{ kind: PortKind.Int, key: "age" }] });
    expect(recursiveSet(undefined, bare)).toBeNull();
  });

  it("extracts dates as ISO strings and numeric strings as numbers", () => {
    const when = new Date("2020-01-01T00:00:00.000Z");
    expect(recursiveExtract(when, p({ kind: PortKind.Date, key: "d" }))).toBe(when.toISOString());
    expect(recursiveExtract("3", p({ kind: PortKind.Int, key: "i" }))).toBe(3);
    expect(recursiveExtract("", p({ kind: PortKind.Float, key: "f" }))).toBeNull();
  });

  it("wraps a union value as { __use, __value } on set and unwraps on extract", () => {
    const union = p({
      kind: PortKind.Union,
      key: "u",
      children: [{ kind: PortKind.String, key: "s" }],
    });
    const wrapped = recursiveSet("hello", union);
    expect(wrapped).toEqual({ __use: "0", __value: "hello" });
    expect(recursiveExtract(wrapped, union)).toBe("hello");
  });
});

describe("submittedDataToRekuestFormat / setData / portToDefaults", () => {
  const ports = [
    p({ kind: PortKind.String, key: "name" }),
    p({ kind: PortKind.List, key: "tags", children: [{ kind: PortKind.String, key: "c" }] }),
  ];

  it("extracts each port by key", () => {
    expect(
      submittedDataToRekuestFormat({ name: "Ada", tags: [{ __value: "x" }] }, ports),
    ).toEqual({ name: "Ada", tags: ["x"] });
  });

  it("sets each port by key", () => {
    expect(setData({ name: "Ada", tags: ["x", "y"] }, ports)).toEqual({
      name: "Ada",
      tags: [{ __value: "x" }, { __value: "y" }],
    });
  });

  it("portToDefaults delegates to setData over the overwrites", () => {
    expect(portToDefaults(ports, { name: "Ada", tags: ["x"] })).toEqual({
      name: "Ada",
      tags: [{ __value: "x" }],
    });
  });

  it("portToDefaults prefills scalar ports from their default when no overwrite", () => {
    const defaultedPorts = [
      p({ kind: PortKind.String, key: "name", default: "Ada" }),
      p({ kind: PortKind.Int, key: "age", default: 42 }),
    ];
    expect(portToDefaults(defaultedPorts, {})).toEqual({
      name: "Ada",
      age: 42,
    });
  });

  it("portToDefaults lets an overwrite win over the port default", () => {
    const defaultedPorts = [p({ kind: PortKind.String, key: "name", default: "Ada" })];
    expect(portToDefaults(defaultedPorts, { name: "Grace" })).toEqual({
      name: "Grace",
    });
  });

  it("portToDefaults preserves falsy defaults (0, false)", () => {
    const defaultedPorts = [
      p({ kind: PortKind.Int, key: "count", default: 0 }),
      p({ kind: PortKind.Bool, key: "flag", default: false }),
    ];
    expect(portToDefaults(defaultedPorts, {})).toEqual({
      count: 0,
      flag: false,
    });
  });

  it("portToDefaults hydrates a list default into rows", () => {
    const defaultedPorts = [
      p({
        kind: PortKind.List,
        key: "tags",
        children: [{ kind: PortKind.String, key: "c" }],
        default: ["x", "y"],
      }),
    ];
    expect(portToDefaults(defaultedPorts, {})).toEqual({
      tags: [{ __value: "x" }, { __value: "y" }],
    });
  });
});

describe("argDictToArgs", () => {
  it("maps ports to dict values, falling back to default then null", () => {
    const ports = [
      p({ kind: PortKind.String, key: "a" }),
      p({ kind: PortKind.Int, key: "b", default: 5 }),
      p({ kind: PortKind.Int, key: "c" }),
    ];
    expect(argDictToArgs({ a: "x" }, ports)).toEqual(["x", 5, null]);
  });

  it("keeps explicit falsy values instead of falling back", () => {
    const ports = [
      p({ kind: PortKind.Int, key: "b", default: 5 }),
      p({ kind: PortKind.Bool, key: "c", default: true }),
    ];
    expect(argDictToArgs({ b: 0, c: false }, ports)).toEqual([0, false]);
  });
});
