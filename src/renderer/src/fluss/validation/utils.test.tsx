import { describe, expect, it, vi } from "vitest";

// `../types` re-exports the generated fluss GraphQL module, whose transitive
// imports reach `constants.tsx` and touch `window.electron` at load time —
// which explodes in the node test env. These matchers only need the PortKind
// enum, so we stub the module. Correctness is preserved because both this file
// and `./utils` read PortKind from the same (mocked) module.
vi.mock("../types", () => ({
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

import type { GeneralPort } from "../types";
import { PortKind } from "../types";
import {
  isChunkTransformable,
  isFloatTransformable,
  isIntTransformable,
  islistTransformable,
  isNullTransformable,
  isSameStream,
  reduceStream,
  withNewStream,
} from "./utils";

// Minimal GeneralPort factory — these matchers only read kind/identifier/
// nullable/children, so we cast a partial shape to the (large union) type.
const port = (over: Partial<GeneralPort> = {}): GeneralPort =>
  ({ kind: PortKind.Int, identifier: null, nullable: false, ...over }) as unknown as GeneralPort;

const listOf = (child: GeneralPort, over: Partial<GeneralPort> = {}): GeneralPort =>
  ({ kind: PortKind.List, identifier: null, nullable: false, children: [child], ...over }) as unknown as GeneralPort;

describe("isSameStream", () => {
  it("returns false when either side is undefined", () => {
    expect(isSameStream(undefined, [])).toBe(false);
    expect(isSameStream([], undefined)).toBe(false);
  });

  it("returns false on length mismatch", () => {
    expect(isSameStream([port()], [])).toBe(false);
  });

  it("is true for matching kind + identifier in order", () => {
    const a = [port({ kind: PortKind.Int }), port({ kind: PortKind.String })];
    const b = [port({ kind: PortKind.Int }), port({ kind: PortKind.String })];
    expect(isSameStream(a, b)).toBe(true);
  });

  it("is false when a kind differs", () => {
    expect(isSameStream([port({ kind: PortKind.Int })], [port({ kind: PortKind.Float })])).toBe(false);
  });

  it("is false when an identifier differs", () => {
    const a = [port({ kind: PortKind.Structure, identifier: "@x/a" })];
    const b = [port({ kind: PortKind.Structure, identifier: "@x/b" })];
    expect(isSameStream(a, b)).toBe(false);
  });

  it("is true for two empty streams", () => {
    expect(isSameStream([], [])).toBe(true);
  });
});

describe("islistTransformable", () => {
  it("is true when each 'having' port is a List wrapping the matching scalar", () => {
    const challenging = [port({ kind: PortKind.Int, identifier: "@x/n" })];
    const having = [listOf(port({ kind: PortKind.Int, identifier: "@x/n" }))];
    expect(islistTransformable(challenging, having)).toBe(true);
  });

  it("is false when 'having' is not a List", () => {
    const challenging = [port({ kind: PortKind.Int })];
    const having = [port({ kind: PortKind.Int })];
    expect(islistTransformable(challenging, having)).toBe(false);
  });

  it("is false when the List has no child", () => {
    const challenging = [port({ kind: PortKind.Int })];
    const having = [{ kind: PortKind.List, children: [] } as unknown as GeneralPort];
    expect(islistTransformable(challenging, having)).toBe(false);
  });
});

describe("isChunkTransformable", () => {
  it("is true when each 'challenging' port is a List wrapping the matching 'having' scalar", () => {
    const challenging = [listOf(port({ kind: PortKind.Int, identifier: "@x/n" }))];
    const having = [port({ kind: PortKind.Int, identifier: "@x/n" })];
    expect(isChunkTransformable(challenging, having)).toBe(true);
  });

  it("is false when 'challenging' is not a List", () => {
    const challenging = [port({ kind: PortKind.Int })];
    const having = [port({ kind: PortKind.Int })];
    expect(isChunkTransformable(challenging, having)).toBe(false);
  });

  it("is false when the child kind does not match", () => {
    const challenging = [listOf(port({ kind: PortKind.Float, identifier: "@x/n" }))];
    const having = [port({ kind: PortKind.Int, identifier: "@x/n" })];
    expect(isChunkTransformable(challenging, having)).toBe(false);
  });
});

describe("isFloatTransformable", () => {
  it("is true when challenging is Float and having is Int", () => {
    expect(
      isFloatTransformable([port({ kind: PortKind.Float })], [port({ kind: PortKind.Int })]),
    ).toBe(true);
  });

  it("is false for the reverse direction", () => {
    expect(
      isFloatTransformable([port({ kind: PortKind.Int })], [port({ kind: PortKind.Float })]),
    ).toBe(false);
  });
});

describe("isIntTransformable", () => {
  it("is true when challenging is Int and having is Float", () => {
    expect(
      isIntTransformable([port({ kind: PortKind.Int })], [port({ kind: PortKind.Float })]),
    ).toBe(true);
  });
});

describe("isNullTransformable", () => {
  it("is true only when identifier+kind match but nullability differs", () => {
    const challenging = [port({ kind: PortKind.Int, identifier: "@x/n", nullable: false })];
    const having = [port({ kind: PortKind.Int, identifier: "@x/n", nullable: true })];
    expect(isNullTransformable(challenging, having)).toBe(true);
  });

  it("is false when nullability is identical (no mismatch)", () => {
    const challenging = [port({ kind: PortKind.Int, identifier: "@x/n", nullable: true })];
    const having = [port({ kind: PortKind.Int, identifier: "@x/n", nullable: true })];
    expect(isNullTransformable(challenging, having)).toBe(false);
  });

  it("is false when kind differs", () => {
    const challenging = [port({ kind: PortKind.Int, identifier: "@x/n", nullable: false })];
    const having = [port({ kind: PortKind.Float, identifier: "@x/n", nullable: true })];
    expect(isNullTransformable(challenging, having)).toBe(false);
  });
});

describe("withNewStream", () => {
  it("replaces the stream at the given index without mutating the input", () => {
    const original = [[port()], [port()]];
    const next = [port({ kind: PortKind.String })];
    const result = withNewStream(original, 1, next);
    expect(result[1]).toBe(next);
    expect(result[0]).toBe(original[0]);
    expect(result).not.toBe(original);
  });
});

describe("reduceStream", () => {
  it("flattens an array of streams into a single port list", () => {
    const a = port({ kind: PortKind.Int });
    const b = port({ kind: PortKind.String });
    expect(reduceStream([[a], [b]])).toEqual([a, b]);
  });

  it("returns an empty array for no streams", () => {
    expect(reduceStream([])).toEqual([]);
  });
});
