import { describe, expect, it } from "vitest";

import {
  decodeJsonLiteralString,
  getValueAtPath,
  isRecord,
  isString,
  normalizeLiteralValue,
  splitPathSegments,
} from "./utils";

describe("isRecord", () => {
  it("is true for plain objects and arrays, false for null/primitives", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

describe("isString", () => {
  it("distinguishes strings", () => {
    expect(isString("x")).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe("splitPathSegments", () => {
  it("strips a leading slash and splits on both '/' and '.'", () => {
    expect(splitPathSegments("/a/b.c")).toEqual(["a", "b", "c"]);
  });

  it("filters out empty segments from doubled separators", () => {
    expect(splitPathSegments("a//b..c")).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty path", () => {
    expect(splitPathSegments("")).toEqual([]);
  });
});

describe("decodeJsonLiteralString", () => {
  it("parses JSON literals", () => {
    expect(decodeJsonLiteralString("123")).toBe(123);
    expect(decodeJsonLiteralString("-4.5")).toBe(-4.5);
    expect(decodeJsonLiteralString("true")).toBe(true);
    expect(decodeJsonLiteralString("false")).toBe(false);
    expect(decodeJsonLiteralString("null")).toBe(null);
    expect(decodeJsonLiteralString('"quoted"')).toBe("quoted");
    expect(decodeJsonLiteralString("[1,2]")).toEqual([1, 2]);
    expect(decodeJsonLiteralString('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns the raw string when it does not look like a JSON literal", () => {
    expect(decodeJsonLiteralString("hello")).toBe("hello");
    expect(decodeJsonLiteralString("")).toBe("");
  });

  it("returns the raw string when it looks like JSON but fails to parse", () => {
    expect(decodeJsonLiteralString("[1,2")).toBe("[1,2");
    expect(decodeJsonLiteralString("123abc")).toBe("123abc");
  });
});

describe("normalizeLiteralValue", () => {
  it("decodes strings but passes non-strings through unchanged", () => {
    expect(normalizeLiteralValue("42")).toBe(42);
    const obj = { a: 1 };
    expect(normalizeLiteralValue(obj)).toBe(obj);
    expect(normalizeLiteralValue(7)).toBe(7);
  });
});

describe("getValueAtPath", () => {
  const model = {
    user: { name: "Ada", tags: ["x", "y"] },
    items: [{ id: 1 }, { id: 2 }],
  };

  it("returns the whole model for an empty path", () => {
    expect(getValueAtPath(model, "")).toBe(model);
  });

  it("traverses nested object properties", () => {
    expect(getValueAtPath(model, "user.name")).toBe("Ada");
  });

  it("indexes into arrays with numeric segments", () => {
    expect(getValueAtPath(model, "items.1.id")).toBe(2);
    expect(getValueAtPath(model, "user/tags/0")).toBe("x");
  });

  it("returns undefined for a non-integer array index", () => {
    expect(getValueAtPath(model, "items.foo")).toBeUndefined();
  });

  it("returns undefined when descending into a primitive", () => {
    expect(getValueAtPath(model, "user.name.nope")).toBeUndefined();
  });
});
