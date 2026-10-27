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

  it("decodes a static literal of a v1 payload (a port's widget)", () => {
    const resolved = resolvePropValue(
      {key: "count", static_value: "42"},
      stringSchema,
      createContext({}, {decodeLiterals: true}),
    );

    expect(resolved).toEqual({ok: true, value: 42});
  });

  it("keeps a v2 literal as written: attr=\"42\" is the string", () => {
    expect(resolvePropValue({key: "count", static_value: "42"}, stringSchema, createContext({}))).toEqual({ok: true, value: "42"});
  });

  it("reads a missing path as null (v2)", () => {
    expect(resolvePropValue({key: "text", dynamic_value: {path: "user.missing"}}, stringSchema, createContext({user: {}}))).toEqual({
      ok: true,
      value: null,
    });
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
      createContext({user: {}}, {decodeLiterals: true}),
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

  it("binds a call that declares a name, and hands the host its observer", () => {
    const observe = vi.fn();
    const bindTask = vi.fn(() => ({observe, release: vi.fn()}));
    const dispatchAction = vi.fn(() => Promise.resolve());
    const actionCall = getPropActionCall({
      key: "onClick",
      agent_call: {dependency: "self", operation: "blur"},
      declares_value: "job",
    })!;

    runActionCall(actionCall, createContext({}, {dispatchAction, bindTask}), {id: "btn", component: "Button"});

    expect(bindTask).toHaveBeenCalledWith("job", {});
    expect(dispatchAction.mock.calls[0][2]).toBe(observe);
  });

  it("releases the name when the host follows no task", () => {
    const release = vi.fn();
    const bindTask = vi.fn(() => ({observe: vi.fn(), release}));
    const actionCall = getPropActionCall({
      key: "onClick",
      agent_call: {dependency: "self", operation: "blur"},
      declares_value: "job",
    })!;

    runActionCall(actionCall, createContext({}, {bindTask}), {id: "btn", component: "Button"});

    expect(release).toHaveBeenCalled();
  });

  it("binds nothing for a call that declares no name", () => {
    const bindTask = vi.fn();
    const dispatchAction = vi.fn();
    const actionCall = getPropActionCall({key: "onClick", agent_call: {dependency: "self", operation: "blur"}})!;

    runActionCall(actionCall, createContext({}, {dispatchAction, bindTask}), {id: "btn", component: "Button"});

    expect(bindTask).not.toHaveBeenCalled();
    expect(dispatchAction.mock.calls[0]).toHaveLength(2);
  });

  it("drops a refused agent call before it binds or dispatches", () => {
    const bindTask = vi.fn(() => ({observe: vi.fn(), release: vi.fn()}));
    const dispatchAction = vi.fn();
    const refuseAction = vi.fn(() => true);
    const component = {id: "btn", component: "Button"};
    const actionCall = getPropActionCall({
      key: "onClick",
      agent_call: {dependency: "self", operation: "blur"},
      declares_value: "job",
    })!;

    const result = runActionCall(actionCall, createContext({}, {dispatchAction, bindTask, refuseAction}), component);

    expect(result).toEqual({ok: true, value: undefined});
    expect(refuseAction).toHaveBeenCalledWith({dependency: "self", operation: "blur", arguments: {}}, component);
    expect(bindTask).not.toHaveBeenCalled();
    expect(dispatchAction).not.toHaveBeenCalled();
  });

  it("never asks the host about a util call", () => {
    const invokeFunction = vi.fn(() => ({ok: true as const, value: "logged"}));
    const refuseAction = vi.fn(() => true);

    runActionCall(
      {type: "util", call: {operation: "log"}},
      createContext({}, {invokeFunction, refuseAction, decodeLiterals: true}),
      {id: "btn", component: "Button"},
    );

    expect(refuseAction).not.toHaveBeenCalled();
    expect(invokeFunction).toHaveBeenCalled();
  });

  it("allows an effectful util call in action position of a v1 payload", () => {
    const invokeFunction = vi.fn(() => ({ok: true as const, value: "logged"}));

    const result = runActionCall(
      {type: "util", call: {operation: "logger.info", arguments: [{key: "m", value_literal: "hi"}]}},
      createContext({}, {invokeFunction, decodeLiterals: true}),
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

describe("statuses travel with values (v2)", () => {
  const pending = (prefix: string) => (path: string) =>
    path.startsWith(prefix) ? {status: "pending" as const} : {status: "ready" as const};

  it("a pending read is a pending null", () => {
    const resolved = resolvePropValue(
      {key: "text", dynamic_value: {path: "deps.robot.arm.mode"}},
      stringSchema,
      createContext({}, {statusOf: pending("deps.robot")}),
    );
    expect(resolved).toEqual({ok: true, value: null, status: {status: "pending"}});
  });

  it("a function never sees a pending argument", () => {
    const invokeFunction = vi.fn(() => ({ok: true as const, value: "X"}));
    const resolved = resolvePropValue(
      {key: "text", util_call: {operation: "str.upper", arguments: [{key: "value", value_path: "deps.robot.name"}]}},
      stringSchema,
      createContext({}, {invokeFunction, statusOf: pending("deps.robot")}),
    );
    expect(invokeFunction).not.toHaveBeenCalled();
    expect(resolved.ok && resolved.status?.status).toBe("pending");
  });

  it("logic.choose reads only the branch taken", () => {
    const choose = (cond: boolean) =>
      resolvePropValue(
        {
          key: "text",
          util_call: {
            operation: "logic.choose",
            arguments: [
              {key: "cond", value_literal: cond},
              {key: "then", value_literal: "on"},
              {key: "otherwise", value_path: "deps.robot.mode"},
            ],
          },
        },
        stringSchema,
        createContext({}, {statusOf: pending("deps.robot")}),
      );
    expect(choose(true)).toEqual({ok: true, value: "on"});
    expect(choose(false).ok && (choose(false) as {status?: {status: string}}).status?.status).toBe("pending");
  });

  it("logic.all and logic.any keep JavaScript's semantics and stop where it is decided", () => {
    const call = (operation: string, values: unknown[]) =>
      resolvePropValue(
        {key: "text", util_call: {operation, arguments: [{key: "values", value_list: values.map(value => (typeof value === "string" && value.startsWith("@") ? {value_path: value.slice(1)} : {value_literal: value}))}]}},
        stringSchema,
        createContext({}, {statusOf: pending("deps")}),
      );
    expect(call("logic.all", [true, "a", "b"])).toEqual({ok: true, value: "b"});
    expect(call("logic.all", [0, "@deps.x"])).toEqual({ok: true, value: 0});
    expect(call("logic.any", ["", "x", "@deps.x"])).toEqual({ok: true, value: "x"});
    expect(call("logic.any", [false, "@deps.x"]).ok && (call("logic.any", [false, "@deps.x"]) as {status?: {status: string}}).status?.status).toBe("pending");
  });

  it("val.status sees the status instead of suspending", () => {
    const invokeFunction = vi.fn((_name: string, _args: Record<string, unknown>, options?: {argumentStatus?: Record<string, string>}) => ({
      ok: true as const,
      value: options?.argumentStatus?.value,
    }));
    const resolved = resolvePropValue(
      {key: "text", util_call: {operation: "val.status", arguments: [{key: "value", value_path: "deps.robot.arm"}]}},
      stringSchema,
      createContext({}, {invokeFunction, statusOf: pending("deps.robot")}),
    );
    expect(resolved).toEqual({ok: true, value: "pending"});
  });
});

describe("a callback does exactly one thing (v2)", () => {
  const component = {id: "btn", component: "Button"};

  const refetch = (query: string) => ({type: "util" as const, call: {operation: "query.refetch", arguments: [{key: "query", value_literal: query}]}});

  it("refetches a declared query: query.refetch, named by a literal", () => {
    const refetchQuery = vi.fn();
    expect(runActionCall(refetch("positions"), createContext({}, {refetchQuery}), component)).toEqual({ok: true, value: undefined});
    expect(refetchQuery).toHaveBeenCalledWith("positions");
  });

  it("fetches more of a declared query, its variables resolved against live state", () => {
    const fetchMoreQuery = vi.fn();
    const call = {
      type: "util" as const,
      call: {
        operation: "query.fetch_more",
        arguments: [
          {key: "query", value_literal: "positions"},
          {key: "variables", value_dict: [{key: "after", value_path: "queries.positions.value.cursor"}, {key: "first", value_literal: 20}]},
        ],
      },
    };
    const context = createContext({queries: {positions: {value: {cursor: "c2"}}}}, {fetchMoreQuery});
    expect(runActionCall(call, context, component)).toEqual({ok: true, value: undefined});
    expect(fetchMoreQuery).toHaveBeenCalledWith("positions", {after: "c2", first: 20});
    // Without variables it fetches with the query's own.
    runActionCall({type: "util", call: {operation: "query.fetch_more", arguments: [{key: "query", value_literal: "positions"}]}}, context, component);
    expect(fetchMoreQuery).toHaveBeenLastCalledWith("positions", {});
  });

  it("refuses a query effect that names no query, or where no query runs", () => {
    expect(runActionCall({type: "util", call: {operation: "query.refetch", arguments: []}}, createContext({}, {refetchQuery: vi.fn()}), component).ok).toBe(false);
    expect(runActionCall(refetch("positions"), createContext({}), component).ok).toBe(false);
  });

  it("answers the task's ask with task.answer", () => {
    const answerTask = vi.fn(() => "answered");
    const result = runActionCall(
      {type: "util", call: {operation: "task.answer", arguments: [{key: "values", value_dict: [{key: "image", value_path: "args.image"}]}]}},
      createContext({args: {image: "7"}}, {answerTask}),
      component,
    );
    expect(result).toEqual({ok: true, value: "answered"});
    expect(answerTask).toHaveBeenCalledWith({image: "7"});
  });

  it("refuses a pure function as a callback", () => {
    const result = runActionCall({type: "util", call: {operation: "str.upper", arguments: []}}, createContext({}), component);
    expect(result.ok).toBe(false);
  });

  it("runs no command while the blok shows the past, but still re-reads", () => {
    const dispatchAction = vi.fn();
    const answerTask = vi.fn();
    const refetchQuery = vi.fn();
    const context = createContext({}, {dispatchAction, answerTask, refetchQuery, travelling: true});
    runActionCall({type: "agent", call: {dependency: "robot", operation: "move"}}, context, component);
    runActionCall({type: "util", call: {operation: "task.answer", arguments: [{key: "values", value_dict: []}]}}, context, component);
    const fetchMoreQuery = vi.fn();
    const travelling = {...context, fetchMoreQuery};
    runActionCall(refetch("q"), travelling, component);
    runActionCall({type: "util", call: {operation: "query.fetch_more", arguments: [{key: "query", value_literal: "q"}]}}, travelling, component);
    expect(dispatchAction).not.toHaveBeenCalled();
    expect(answerTask).not.toHaveBeenCalled();
    expect(refetchQuery).toHaveBeenCalledWith("q");
    expect(fetchMoreQuery).toHaveBeenCalledWith("q", {});
  });

  it("fills in what a task was called with on its record", () => {
    const bindTask = vi.fn(() => ({observe: vi.fn(), release: vi.fn()}));
    runActionCall(
      {type: "agent", call: {dependency: "robot", operation: "move_to", arguments: [{key: "position", value_literal: 3}]}, into: "move"},
      createContext({}, {bindTask, dispatchAction: () => Promise.resolve()}),
      component,
    );
    expect(bindTask).toHaveBeenCalledWith("move", {position: 3});
  });
});
