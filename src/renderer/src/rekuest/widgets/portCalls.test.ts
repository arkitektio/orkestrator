import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import {
  dependencyScope,
  describePortCallCatalog,
  evaluatePortCall,
  parsePortCall,
  portCallCatalog,
  runPortCall,
} from "./portCalls";

const eqCall = {
  operation: "compare.eq",
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
    if (parsed.ok) expect(parsed.value.operation).toBe("compare.eq");
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
      operation: "logic.not",
      arguments: [
        {
          __typename: "ActionArgument",
          key: "value",
          valueLiteral: null,
          valuePath: null,
          utilCall: {
            __typename: "UtilCall",
            operation: "port.isOneOf",
            arguments: [
              { __typename: "ActionArgument", key: "value", valuePath: "value" },
              {
                __typename: "ActionArgument",
                key: "options",
                valueList: [
                  { __typename: "ActionArgument", valueLiteral: "a" },
                  { __typename: "ActionArgument", valueLiteral: "b" },
                ],
              },
            ],
          },
        },
      ],
    };
    const parsed = parsePortCall(fromGraphql);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const inner = parsed.value.arguments?.[0]?.util_call;
    expect(inner?.operation).toBe("port.isOneOf");
    expect(inner?.arguments?.[1]?.value_list).toHaveLength(2);
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
      operation: "compare.gt",
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
      operation: "logic.not",
      arguments: [
        {
          key: "value",
          util_call: {
            operation: "type.isEmpty",
            arguments: [{ key: "value", value_path: "value" }],
          },
        },
      ],
    };
    expect(runPortCall(call, scope("x"))).toEqual({ ok: true, value: true });
    expect(runPortCall(call, scope(""))).toEqual({ ok: true, value: false });
  });

  it("resolves an undeclared path to undefined rather than failing", () => {
    const call = {
      operation: "port.isSet",
      arguments: [{ key: "value", value_path: "nope" }],
    };
    expect(runPortCall(call, scope("x", { other: 1 }))).toEqual({ ok: true, value: false });
  });

  it("reports unknown functions", () => {
    const result = runPortCall({ operation: "nope.missing", arguments: [] }, scope(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found/);
  });

  it("refuses functions with side effects", () => {
    const result = runPortCall(
      { operation: "clipboard.copy", arguments: [{ key: "value", value_literal: "x" }] },
      scope(1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/side effects/);
  });

  it("reports invalid arguments", () => {
    const parsed = parsePortCall({
      operation: "compare.gt",
      arguments: [
        { key: "a", value_literal: "abc" },
        { key: "b", value_literal: 1 },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = evaluatePortCall(parsed.value, scope(null));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid arguments/);
  });
});

describe("port functions", () => {
  const call = (name: string, args: Record<string, unknown>) =>
    portCallCatalog.invokeFunction(name, args, { requirePure: true });
  const value = (name: string, args: Record<string, unknown>) => {
    const result = call(name, args);
    if (!result.ok) throw new Error(`${name} failed: ${result.error}`);
    return result.value;
  };

  it("port.isSet", () => {
    expect(value("port.isSet", { value: 0 })).toBe(true);
    expect(value("port.isSet", { value: "" })).toBe(true);
    expect(value("port.isSet", { value: null })).toBe(false);
    expect(value("port.isSet", { value: undefined })).toBe(false);
  });

  it("port.isOneOf", () => {
    expect(value("port.isOneOf", { value: "b", options: ["a", "b"] })).toBe(true);
    expect(value("port.isOneOf", { value: "c", options: ["a", "b"] })).toBe(false);
    expect(call("port.isOneOf", { value: "c", options: "ab" }).ok).toBe(false);
  });

  it("str.matches", () => {
    expect(value("str.matches", { value: "abc123", pattern: "^[a-z]+\\d+$" })).toBe(true);
    expect(value("str.matches", { value: "ABC", pattern: "^abc$", flags: "i" })).toBe(true);
    expect(value("str.matches", { value: "x", pattern: "^y$" })).toBe(false);
    expect(value("str.matches", { value: null, pattern: ".*" })).toBe(false);
  });

  it("are all pure and described in the manifest", () => {
    const manifest = describePortCallCatalog();
    for (const name of ["port.isSet", "port.isOneOf", "str.matches", "compare.eq", "logic.not"]) {
      const entry = manifest.functions.find((fn) => fn.name === name);
      expect(entry, name).toBeDefined();
      expect(entry?.purity).toBe("pure");
    }
  });
});

describe("dependencyScope", () => {
  it("zips names with watched values", () => {
    expect(dependencyScope(["a", "b"], [1, 2])).toEqual({ a: 1, b: 2 });
    expect(dependencyScope(null, [])).toEqual({});
  });
});
