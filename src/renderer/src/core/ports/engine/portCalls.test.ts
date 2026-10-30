import { describe, expect, it, vi } from "vitest";

import {
  dependencyScope,
  evaluatePortCall,
  parsePortCall,
  runPortCall,
} from "./portCalls";

const eqCall = {
  operation: "cmp.eq",
  arguments: [
    { key: "a", value_path: "value" },
    { key: "b", value_literal: "advanced" },
  ],
};

describe("parsePortCall", () => {
  it("accepts a UtilCall object", () => {
    const parsed = parsePortCall(eqCall);
    expect(parsed).toEqual({ ok: true, value: eqCall });
  });

  it("accepts a JSON-encoded UtilCall", () => {
    const parsed = parsePortCall(JSON.stringify(eqCall));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.operation).toBe("cmp.eq");
  });

  it("rejects malformed payloads without throwing", () => {
    expect(parsePortCall(null).ok).toBe(false);
    expect(parsePortCall(42).ok).toBe(false);
    expect(parsePortCall("not json").ok).toBe(false);
    const missingOperation = parsePortCall({ arguments: [] });
    expect(missingOperation.ok).toBe(false);
    if (!missingOperation.ok) expect(missingOperation.error).toMatch(/operation/);
  });

  it("memoizes by object identity", () => {
    expect(parsePortCall(eqCall)).toBe(parsePortCall(eqCall));
  });

  it("accepts the GraphQL camelCase shape and drops __typename markers", () => {
    const fromGraphql = {
      __typename: "UtilCall",
      operation: "logic.negate",
      arguments: [
        {
          __typename: "ActionArgument",
          key: "a",
          valueLiteral: null,
          valuePath: null,
          utilCall: {
            __typename: "UtilCall",
            operation: "list.contains",
            arguments: [
              {
                __typename: "ActionArgument",
                key: "value",
                valueList: [
                  { __typename: "ActionArgument", valueLiteral: "a" },
                  { __typename: "ActionArgument", valueLiteral: "b" },
                ],
              },
              { __typename: "ActionArgument", key: "item", valuePath: "value" },
            ],
          },
        },
      ],
    };
    const parsed = parsePortCall(fromGraphql);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const inner = parsed.value.arguments?.[0]?.util_call;
    expect(inner?.operation).toBe("list.contains");
    expect(inner?.arguments?.[0]?.value_list).toHaveLength(2);
    expect(runPortCall(fromGraphql, { value: "c", dependencies: {} })).toEqual({
      ok: true,
      value: true,
    });
    expect(runPortCall(fromGraphql, { value: "a", dependencies: {} })).toEqual({
      ok: true,
      value: false,
    });
  });
});

describe("evaluatePortCall", () => {
  const scope = (value: unknown, dependencies: Record<string, unknown> = {}) => ({
    value,
    dependencies,
  });

  it("reads the port's own value through value_path \"value\"", () => {
    expect(runPortCall(eqCall, scope("advanced"))).toEqual({ ok: true, value: true });
    expect(runPortCall(eqCall, scope("basic"))).toEqual({ ok: true, value: false });
  });

  it("reads declared dependencies by name", () => {
    const call = {
      operation: "cmp.gt",
      arguments: [
        { key: "a", value_path: "value" },
        { key: "b", value_path: "min" },
      ],
    };
    expect(runPortCall(call, scope(5, { min: 1 }))).toEqual({ ok: true, value: true });
    expect(runPortCall(call, scope(0, { min: 1 }))).toEqual({ ok: true, value: false });
  });

  it("resolves nested util calls", () => {
    const call = {
      operation: "logic.negate",
      arguments: [
        {
          key: "a",
          util_call: {
            operation: "val.is_empty",
            arguments: [{ key: "value", value_path: "value" }],
          },
        },
      ],
    };
    expect(runPortCall(call, scope("x"))).toEqual({ ok: true, value: true });
    expect(runPortCall(call, scope(""))).toEqual({ ok: true, value: false });
  });

  it("reads an undeclared path as null rather than failing", () => {
    const call = {
      operation: "val.is_set",
      arguments: [{ key: "value", value_path: "nope" }],
    };
    expect(runPortCall(call, scope("x", { other: 1 }))).toEqual({ ok: true, value: false });
  });

  it("reports unknown functions", () => {
    const result = runPortCall({ operation: "nope.missing", arguments: [] }, scope(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a function of the blok language/);
  });

  it("refuses an effect: only a blok's callback runs one", () => {
    const result = runPortCall(
      { operation: "ui.copy", arguments: [{ key: "text", value_literal: "x" }] },
      scope(1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/effect/);
  });

  it("reads an argument of the wrong kind as null, as the language does", () => {
    const parsed = parsePortCall({
      operation: "math.round",
      arguments: [{ key: "value", value_literal: "abc" }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(evaluatePortCall(parsed.value, scope(null))).toEqual({ ok: true, value: null });
  });
});

describe("the language's functions a port call names", () => {
  const value = (operation: string, args: Record<string, unknown>) => {
    const result = runPortCall(
      { operation, arguments: Object.entries(args).map(([key, literal]) => ({ key, value_literal: literal })) },
      { value: null, dependencies: {} },
    );
    if (!result.ok) throw new Error(`${operation} failed: ${result.error}`);
    return result.value;
  };

  it("val.is_set", () => {
    expect(value("val.is_set", { value: 0 })).toBe(true);
    expect(value("val.is_set", { value: "" })).toBe(true);
    expect(value("val.is_set", { value: null })).toBe(false);
  });

  it("list.contains", () => {
    expect(value("list.contains", { value: ["a", "b"], item: "b" })).toBe(true);
    expect(value("list.contains", { value: ["a", "b"], item: "c" })).toBe(false);
    expect(value("list.contains", { value: "ab", item: "c" })).toBe(false);
  });

  it("str.matches", () => {
    expect(value("str.matches", { value: "abc123", pattern: "^[a-z]+\\d+$" })).toBe(true);
    expect(value("str.matches", { value: "x", pattern: "^y$" })).toBe(false);
    expect(value("str.matches", { value: null, pattern: ".*" })).toBe(false);
  });
});

describe("dependencyScope", () => {
  it("zips names with watched values", () => {
    expect(dependencyScope(["a", "b"], [1, 2])).toEqual({ a: 1, b: 2 });
    expect(dependencyScope(null, [])).toEqual({});
  });
});

describe("the base catalog apps write in", () => {
  const scope = (value: unknown) => ({ value, dependencies: {} });
  const self = { key: "a", value_path: "value" };
  const literal = (key: string, value: unknown) => ({ key, value_literal: value });
  const run = (operation: string, ...args: object[]) =>
    runPortCall({ operation, arguments: args }, scope(5));

  // rekuest_core/catalogs/base_v1.json, less fmt.relativeTime: nothing in bsx reads the clock.
  it.each([
    "eq", "ne", "gt", "gte", "lt", "lte", "between", "and", "or", "not", "if", "is_null", "is_set",
    "len", "len_between", "is_empty", "contains", "in", "matches", "starts_with", "ends_with", "get",
    "coalesce", "add", "sub", "mul", "div", "mod", "neg", "fmt.bytes", "fmt.currency", "fmt.date",
    "fmt.datetime", "fmt.json", "fmt.number", "fmt.percent", "list.at", "list.compact", "list.first",
    "list.join", "list.last", "list.pluck", "list.range", "list.reverse", "list.slice", "list.sort",
    "list.sum", "list.unique", "math.abs", "math.ceil", "math.clamp", "math.floor", "math.round",
    "obj.entries", "obj.has", "obj.keys", "obj.values", "str.capitalize", "str.default", "str.lower",
    "str.replace", "str.slice", "str.split", "str.trim", "str.truncate", "str.upper", "type.of",
    "type.toBoolean", "type.toNumber", "type.toString",
  ])("%s is a function of the language", (operation) => {
    const result = run(operation);
    expect(result.ok ? "" : result.error).not.toContain("is not a function of the blok language");
  });

  it("answers what `value > 0 and value < 10` asks, however deep", () => {
    const call = (limit: number) => ({
      operation: "and",
      arguments: [
        { key: "a", util_call: { operation: "gt", arguments: [self, literal("b", 0)] } },
        { key: "b", util_call: { operation: "lt", arguments: [self, literal("b", limit)] } },
      ],
    });
    expect(runPortCall(call(10), scope(5))).toEqual({ ok: true, value: true });
    expect(runPortCall(call(3), scope(5))).toEqual({ ok: true, value: false });
  });

  it("tells lists and strings apart where the base catalog does not", () => {
    expect(run("len", literal("a", "abc"))).toEqual({ ok: true, value: 3 });
    expect(run("len", literal("a", [1, 2]))).toEqual({ ok: true, value: 2 });
    expect(run("contains", literal("haystack", "abc"), literal("needle", "b"))).toEqual({ ok: true, value: true });
    expect(run("contains", literal("haystack", [1, 2]), literal("needle", 2))).toEqual({ ok: true, value: true });
    expect(run("in", literal("value", 3), literal("options", [1, 2]))).toEqual({ ok: true, value: false });
    expect(run("len_between", literal("value", "abc"), literal("min", 1), literal("max", 2))).toEqual({ ok: true, value: false });
  });

  it("renames what the vocabulary calls differently", () => {
    expect(run("if", literal("condition", true), literal("then", 1), literal("otherwise", 2))).toEqual({ ok: true, value: 1 });
    expect(run("is_null", literal("a", null))).toEqual({ ok: true, value: true });
    expect(run("math.round", literal("value", 1.26), literal("precision", 1))).toEqual({ ok: true, value: 1.3 });
    expect(run("get", literal("value", { x: 1 }), literal("path", "x"))).toEqual({ ok: true, value: 1 });
    expect(run("list.range", literal("count", 3), literal("start", 2))).toEqual({ ok: true, value: [2, 3, 4] });
    expect(run("list.range", literal("start", 2), literal("end", 4))).toEqual({ ok: true, value: [2, 3] });
    expect(run("type.toNumber", literal("value", "nope"), literal("fallback", 7))).toEqual({ ok: true, value: 7 });
  });
});
