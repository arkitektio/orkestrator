import {describe, expect, it} from "vitest";
import {z} from "zod";

import {createBlokComponent} from "./components";
import {
  createBlokCatalog,
  createBlokFunction,
  createVariadicBlokFunction,
  normalizeFunctionArgs,
} from "./functions";
import {preflightBlokDocument} from "./preflight";
import {BlokPropSchemas} from "./schemas";

const Box = createBlokComponent(
  {
    name: "Box",
    schema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      onClick: BlokPropSchemas.Action.optional(),
      children: BlokPropSchemas.ChildList,
    }),
  },
  () => null,
);

const pureFn = createBlokFunction(
  {name: "double", description: "Doubles a number.", purity: "pure", schema: z.object({a: z.number()})},
  args => args.a * 2,
);

const effectFn = createBlokFunction(
  {name: "logger.info", description: "Logs a message.", schema: z.record(z.string(), z.unknown())},
  args => args,
);

const catalog = createBlokCatalog("test-catalog", [Box], [pureFn, effectFn]);

const preflight = (roots: unknown[]) => preflightBlokDocument(roots, catalog);

const validNode = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  component: "Box",
  props: [{key: "title", static_value: "hello"}],
  ...extra,
});

describe("preflightBlokDocument", () => {
  it("accepts a valid tree and registers every node by id", () => {
    const result = preflight([validNode("root", {children: [validNode("child")]})]);

    expect(result.errors).toEqual([]);
    expect(result.rootIds).toEqual(["root"]);
    expect([...result.nodes.keys()].sort()).toEqual(["child", "root"]);
  });

  it("reports an unknown component", () => {
    const result = preflight([{id: "a", component: "Nope"}]);

    expect(result.errors[0].message).toContain('Unknown component "Nope"');
    expect(result.invalidNodes.has("a")).toBe(true);
  });

  it("reports an unknown prop", () => {
    const result = preflight([
      {id: "a", component: "Box", props: [{key: "title", static_value: "x"}, {key: "bogus"}]},
    ]);

    expect(result.errors[0].message).toContain('Unknown prop "bogus"');
  });

  it("reports a missing required prop", () => {
    const result = preflight([{id: "a", component: "Box"}]);

    expect(result.errors[0].message).toContain('Missing required prop "title"');
  });

  it("does not require `children` when the node declares children", () => {
    const result = preflight([validNode("root", {children: [validNode("child")]})]);
    expect(result.errors).toEqual([]);
  });

  it("reports a duplicate id and keeps the first node", () => {
    const result = preflight([
      validNode("root", {children: [validNode("dupe"), validNode("dupe")]}),
    ]);

    expect(result.errors.some(error => error.message.includes("Duplicate component id"))).toBe(
      true,
    );
    expect(result.nodes.get("dupe")?.id).toBe("dupe");
  });

  it("reports an unknown function referenced by a prop", () => {
    const result = preflight([
      {id: "a", component: "Box", props: [{key: "title", util_call: {operation: "missing"}}]},
    ]);

    expect(result.errors[0].message).toContain('Unknown function "missing"');
  });

  it("refuses an effectful function in value position", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [{key: "title", util_call: {operation: "logger.info"}}],
      },
    ]);

    expect(result.errors[0].message).toContain("has side effects");
  });

  it("allows an effectful function on an action prop", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [
          {key: "title", static_value: "x"},
          {key: "onClick", util_call: {operation: "logger.info"}},
        ],
      },
    ]);

    expect(result.errors).toEqual([]);
  });

  it("reports an unknown argument key", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [
          {key: "title", util_call: {operation: "double", arguments: [{key: "bogus"}]}},
        ],
      },
    ]);

    expect(result.errors.map(error => error.message).join(" ")).toContain(
      'Unknown argument "bogus"',
    );
  });

  it("reports a missing required argument", () => {
    const result = preflight([
      {id: "a", component: "Box", props: [{key: "title", util_call: {operation: "double"}}]},
    ]);

    expect(result.errors.map(error => error.message).join(" ")).toContain(
      'Missing required argument "a"',
    );
  });

  it("counts positional arguments as filling the schema keys in order", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [
          {key: "title", util_call: {operation: "double", arguments: [{value_literal: 2}]}},
        ],
      },
    ]);

    expect(result.errors).toEqual([]);
  });

  it("reports too many positional arguments", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [
          {
            key: "title",
            util_call: {
              operation: "double",
              arguments: [{value_literal: 1}, {value_literal: 2}],
            },
          },
        ],
      },
    ]);

    expect(result.errors.map(error => error.message).join(" ")).toContain(
      "takes 1 argument(s) but 2 were given",
    );
  });

  it("does not constrain the arity of a variadic function", () => {
    const variadicCatalog = createBlokCatalog(
      "variadic",
      [Box],
      [
        createVariadicBlokFunction(
          {name: "sum", description: "sums", purity: "pure", item: z.number()},
          values => values.reduce((total, value) => total + value, 0),
        ),
      ],
    );

    const result = preflightBlokDocument(
      [
        {
          id: "a",
          component: "Box",
          props: [
            {
              key: "title",
              util_call: {
                operation: "sum",
                arguments: [{value_literal: 1}, {value_literal: 2}, {value_literal: 3}],
              },
            },
          ],
        },
      ],
      variadicCatalog,
    );

    expect(result.errors).toEqual([]);
  });

  it("allows a pure function in value position", () => {
    const result = preflight([
      {
        id: "a",
        component: "Box",
        props: [{key: "title", util_call: {operation: "double", arguments: [{key: "a", value_literal: 2}]}}],
      },
    ]);

    expect(result.errors).toEqual([]);
  });

  it("keeps valid siblings renderable when one node is invalid", () => {
    const result = preflight([
      validNode("root", {children: [validNode("good"), {id: "bad", component: "Nope"}]}),
    ]);

    expect(result.nodes.has("root")).toBe(true);
    expect(result.nodes.has("good")).toBe(true);
    expect(result.nodes.has("bad")).toBe(false);
    expect(result.invalidNodes.has("bad")).toBe(true);
  });

  it("accepts the `{uiComponents: [...]}` envelope shape", () => {
    const result = preflightBlokDocument({uiComponents: [validNode("root")]}, catalog);
    expect(result.rootIds).toEqual(["root"]);
  });

  it("reports an unparseable root as a document-level error", () => {
    const result = preflight([{component: "Box"}]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].componentId).toBeUndefined();
  });
});

describe("catalog invokeFunction", () => {
  it("returns a failure for an unknown function instead of throwing", () => {
    expect(catalog.invokeFunction("nope", {})).toEqual({
      ok: false,
      error: "Function not found in catalog test-catalog: nope",
    });
  });

  it("returns a failure for invalid arguments", () => {
    const result = catalog.invokeFunction("double", {a: "not a number"});

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("Invalid arguments");
  });

  it("refuses an effectful function when purity is required", () => {
    const result = catalog.invokeFunction("logger.info", {}, {requirePure: true});

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("side effects");
  });

  it("catches a throw inside a function body", () => {
    const throwing = createBlokCatalog(
      "throwing",
      [],
      [
        createBlokFunction({name: "boom", description: "Always throws.", purity: "pure", schema: z.object({})}, () => {
          throw new Error("kaboom");
        }),
      ],
    );

    expect(throwing.invokeFunction("boom", {})).toEqual({ok: false, error: "kaboom"});
  });

  it("maps positional args onto the schema keys", () => {
    const schema = z.object({a: z.number(), b: z.number()});
    expect(normalizeFunctionArgs(schema, {0: 1, 1: 2})).toEqual({a: 1, b: 2});
  });

  it("leaves already-named args alone", () => {
    const schema = z.object({a: z.number(), b: z.number()});
    expect(normalizeFunctionArgs(schema, {a: 1, b: 2})).toEqual({a: 1, b: 2});
  });
});
