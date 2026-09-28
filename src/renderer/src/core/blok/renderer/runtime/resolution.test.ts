import {describe, expect, it, vi} from "vitest";
import {z} from "zod";

import {
  getComponentPropRuntimeDependencies,
  getPropActionCall,
  resolveActionArguments,
  resolvePropValue,
  runActionCall,
} from "./resolution";
import {BlokPropSchemas} from "./schemas";
import {EMPTY_SCOPE, readScopedPath, resolveScopedPath} from "./scope";
import type {BlokResolutionContext, BlokScope} from "./types";

const stringSchema = z.string().optional();

const createContext = (
  dataModel: unknown,
  overrides: Partial<BlokResolutionContext> = {},
  scope: BlokScope = EMPTY_SCOPE,
): BlokResolutionContext => ({
  readPath: path => readScopedPath(dataModel, path, scope),
  resolvePath: path => resolveScopedPath(path, scope),
  invokeFunction: name => ({ok: false, error: `no function ${name}`}),
  dispatchAction: () => undefined,
  ...overrides,
});

describe("resolvePropValue", () => {
  it("returns undefined when the prop is absent", () => {
    expect(resolvePropValue(undefined, stringSchema, createContext({}))).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("decodes a static literal", () => {
    const resolved = resolvePropValue(
      {key: "count", static_value: "42"},
      stringSchema,
      createContext({}),
    );

    expect(resolved).toEqual({ok: true, value: 42});
  });

  it("reads a dynamic path", () => {
    const resolved = resolvePropValue(
      {key: "text", dynamic_value: {path: "user/name"}},
      stringSchema,
      createContext({user: {name: "Ada"}}),
    );

    expect(resolved).toEqual({ok: true, value: "Ada"});
  });

  it("falls back to the dynamic literal when the path is unset", () => {
    const resolved = resolvePropValue(
      {key: "text", dynamic_value: {path: "user/missing", literal: "fallback"}},
      stringSchema,
      createContext({user: {}}),
    );

    expect(resolved).toEqual({ok: true, value: "fallback"});
  });

  it("resolves an action prop to no value — the callback is built by useAction", () => {
    const resolved = resolvePropValue(
      {key: "onClick", agent_call: {dependency: "d", operation: "op"}},
      BlokPropSchemas.Action.optional(),
      createContext({}),
    );

    expect(resolved).toEqual({ok: true, value: undefined});
  });

  it("invokes a pure util call in value position", () => {
    const invokeFunction = vi.fn(() => ({ok: true as const, value: 6}));
    const resolved = resolvePropValue(
      {
        key: "text",
        util_call: {
          operation: "math.multiply",
          arguments: [
            {key: "a", value_literal: 2},
            {key: "b", value_path: "factor"},
          ],
        },
      },
      stringSchema,
      createContext({factor: 3}, {invokeFunction}),
    );

    expect(resolved).toEqual({ok: true, value: 6});
    expect(invokeFunction).toHaveBeenCalledWith(
      "math.multiply",
      {a: 2, b: 3},
      {requirePure: true},
    );
  });

  it("surfaces a util-call failure as an error rather than throwing", () => {
    const resolved = resolvePropValue(
      {key: "text", util_call: {operation: "logger.info"}},
      stringSchema,
      createContext({}),
    );

    expect(resolved).toEqual({ok: false, error: "no function logger.info"});
  });
});

describe("resolveActionArguments", () => {
  it("keys positionally when no key is given", () => {
    const resolved = resolveActionArguments(
      [{value_literal: "a"}, {value_literal: "b"}],
      createContext({}),
    );

    expect(resolved).toEqual({ok: true, value: {0: "a", 1: "b"}});
  });

  it("resolves nested lists and dicts", () => {
    const resolved = resolveActionArguments(
      [
        {key: "list", value_list: [{value_literal: 1}, {value_path: "x"}]},
        {key: "dict", value_dict: [{key: "inner", value_path: "x"}]},
      ],
      createContext({x: "from-model"}),
    );

    expect(resolved).toEqual({
      ok: true,
      value: {
        list: [1, "from-model"],
        dict: {inner: "from-model"},
      },
    });
  });

  it("propagates a nested failure", () => {
    const resolved = resolveActionArguments(
      [{key: "list", value_list: [{util_call: {operation: "missing"}}]}],
      createContext({}),
    );

    expect(resolved.ok).toBe(false);
  });
});

describe("runActionCall", () => {
  it("dispatches an agent call with live arguments", () => {
    const dispatchAction = vi.fn();
    const component = {id: "btn", component: "Button"};

    const result = runActionCall(
      {
        type: "agent",
        call: {dependency: "dep", operation: "op", arguments: [{key: "v", value_path: "x"}]},
      },
      createContext({x: 5}, {dispatchAction}),
      component,
    );

    expect(result.ok).toBe(true);
    expect(dispatchAction).toHaveBeenCalledWith(
      {dependency: "dep", operation: "op", arguments: {v: 5}},
      component,
    );
  });

  it("allows an effectful util call in action position", () => {
    const invokeFunction = vi.fn(() => ({ok: true as const, value: "logged"}));

    const result = runActionCall(
      {type: "util", call: {operation: "logger.info", arguments: [{key: "m", value_literal: "hi"}]}},
      createContext({}, {invokeFunction}),
      {id: "btn", component: "Button"},
    );

    expect(result).toEqual({ok: true, value: "logged"});
    // No `requirePure`: effects are exactly what an action is for.
    expect(invokeFunction).toHaveBeenCalledWith("logger.info", {m: "hi"}, {requirePure: false});
  });
});

describe("getPropActionCall", () => {
  it("extracts the agent and util descriptors", () => {
    expect(getPropActionCall({key: "a", agent_call: {dependency: "d", operation: "o"}})).toEqual({
      type: "agent",
      call: {dependency: "d", operation: "o"},
    });
    expect(getPropActionCall({key: "a", util_call: {operation: "o"}})).toEqual({
      type: "util",
      call: {operation: "o"},
    });
    expect(getPropActionCall({key: "a", static_value: 1})).toBeUndefined();
  });
});

describe("getComponentPropRuntimeDependencies", () => {
  it("collects the path a dynamic value reads", () => {
    expect(
      getComponentPropRuntimeDependencies({key: "t", dynamic_value: {path: "a/b"}}, stringSchema),
    ).toEqual({paths: ["a/b"], needsInvokeFunction: false, needsDispatchAction: false});
  });

  it("collects paths nested inside util-call arguments", () => {
    const dependencies = getComponentPropRuntimeDependencies(
      {
        key: "t",
        util_call: {
          operation: "gt",
          arguments: [
            {key: "a", value_path: "left"},
            {key: "b", value_list: [{value_path: "right"}]},
          ],
        },
      },
      stringSchema,
    );

    expect(dependencies.paths.sort()).toEqual(["left", "right"]);
    expect(dependencies.needsInvokeFunction).toBe(true);
  });

  it("only collects agent-call arguments when the target is an action prop", () => {
    const prop = {
      key: "onClick",
      agent_call: {dependency: "d", operation: "o", arguments: [{key: "a", value_path: "p"}]},
    };

    expect(
      getComponentPropRuntimeDependencies(prop, BlokPropSchemas.Action.optional()).paths,
    ).toEqual(["p"]);
    expect(getComponentPropRuntimeDependencies(prop, stringSchema).paths).toEqual([]);
  });
});

describe("scope resolution", () => {
  const scope: BlokScope = {aliases: {item: "rows/2"}, values: {loose: {name: "literal"}}};

  it("rewrites an aliased head segment to an absolute path", () => {
    expect(resolveScopedPath("item/name", scope)).toBe("rows/2/name");
    expect(resolveScopedPath("item", scope)).toBe("rows/2");
  });

  it("leaves unaliased paths alone", () => {
    expect(resolveScopedPath("other/name", scope)).toBe("other/name");
  });

  it("prefixes with basePath when there is no alias", () => {
    expect(resolveScopedPath("name", {aliases: {}, values: {}, basePath: "rows/2"})).toBe(
      "rows/2/name",
    );
  });

  it("reads an aliased path from the live data model", () => {
    const dataModel = {rows: [{}, {}, {name: "third"}]};
    expect(readScopedPath(dataModel, "item/name", scope)).toBe("third");
  });

  it("reads a by-value scope entry that has no address", () => {
    expect(readScopedPath({}, "loose/name", scope)).toBe("literal");
  });
});
