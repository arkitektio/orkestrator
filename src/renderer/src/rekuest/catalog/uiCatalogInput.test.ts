// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createBlokCatalog,
  createBlokComponent,
  createBlokFunction,
  createVariadicBlokFunction,
  BlokPropSchemas,
} from "@/blok/renderer/runtime";
import { defaultBlokCatalog, UI_CATALOG_NAME } from "@/blok/renderer/catalog";
import { CatalogValueKind, type UiCatalogFragment } from "@/rekuest/api/graphql";
import {
  buildRegisterUiCatalogInput,
  catalogMatches,
  componentInput,
  operationInputs,
  zodToCatalogKind,
} from "./uiCatalogInput";

const Noop = () => null;

describe("zodToCatalogKind", () => {
  it.each([
    ["string", z.string(), CatalogValueKind.String],
    ["optional string", z.string().optional(), CatalogValueKind.String],
    ["nullable enum", z.enum(["a", "b"]).nullable(), CatalogValueKind.String],
    ["string literal", z.literal("x"), CatalogValueKind.String],
    ["number", z.number(), CatalogValueKind.Float],
    ["int", z.int(), CatalogValueKind.Int],
    ["boolean with default", z.boolean().default(false), CatalogValueKind.Bool],
    ["array", z.array(z.string()), CatalogValueKind.List],
    ["object", z.object({ a: z.string() }), CatalogValueKind.Dict],
    ["record", z.record(z.string(), z.unknown()), CatalogValueKind.Dict],
    ["union of one kind", z.union([z.string(), z.enum(["a"])]), CatalogValueKind.String],
    ["mixed union", z.union([z.string(), z.number()]), CatalogValueKind.Any],
    ["transform keeps input kind", z.string().transform((v) => v.length), CatalogValueKind.String],
    ["unknown", z.unknown(), CatalogValueKind.Any],
    ["plain custom", z.custom<() => void>((v) => typeof v === "function"), CatalogValueKind.Any],
    ["action", BlokPropSchemas.Action, CatalogValueKind.Callback],
    ["optional action", BlokPropSchemas.Action.optional(), CatalogValueKind.Callback],
    ["dynamic string", BlokPropSchemas.DynamicString, CatalogValueKind.Any],
  ])("%s", (_label, schema, expected) => {
    expect(zodToCatalogKind(schema)).toBe(expected);
  });
});

describe("componentInput", () => {
  it("derives props, required flags, descriptions and acceptsChildren", () => {
    const Box = createBlokComponent(
      {
        name: "Box",
        schema: z.object({
          title: z.string().describe("Heading text"),
          padding: z.number().optional(),
          onClick: BlokPropSchemas.Action.optional(),
          children: BlokPropSchemas.ChildList,
        }),
      },
      Noop,
    );

    expect(componentInput(Box)).toEqual({
      name: "Box",
      description: null,
      acceptsChildren: true,
      props: [
        { key: "children", kind: CatalogValueKind.List, required: false, description: null },
        { key: "onClick", kind: CatalogValueKind.Callback, required: false, description: null },
        { key: "padding", kind: CatalogValueKind.Float, required: false, description: null },
        { key: "title", kind: CatalogValueKind.String, required: true, description: "Heading text" },
      ],
    });
  });

  it("reports acceptsChildren false without a children prop", () => {
    const Leaf = createBlokComponent({ name: "Leaf", schema: z.object({}) }, Noop);
    expect(componentInput(Leaf)).toMatchObject({ acceptsChildren: false, props: [] });
  });
});

describe("operationInputs", () => {
  it("emits one operation per name and alias with typed arguments", () => {
    const fn = createBlokFunction(
      {
        name: "str.pad",
        aliases: ["pad"],
        description: "Pads a string.",
        purity: "pure",
        returnType: "string",
        schema: z.object({ value: z.string(), width: z.int(), fill: z.string().optional() }),
      },
      () => "",
    );

    const [main, alias] = operationInputs(fn);
    expect(main).toEqual({
      name: "str.pad",
      description: "Pads a string.",
      returns: CatalogValueKind.String,
      arguments: [
        { key: "fill", kind: CatalogValueKind.String, required: false, description: null },
        { key: "value", kind: CatalogValueKind.String, required: true, description: null },
        { key: "width", kind: CatalogValueKind.Int, required: true, description: null },
      ],
    });
    expect(alias).toMatchObject({
      name: "pad",
      description: "Alias of str.pad. Pads a string.",
      returns: CatalogValueKind.String,
      arguments: main.arguments,
    });
  });

  it("collapses variadic functions to a single optional list argument", () => {
    const fn = createVariadicBlokFunction(
      { name: "math.sum", description: "Sums.", item: z.number(), purity: "pure", returnType: "number" },
      () => 0,
    );
    const [op] = operationInputs(fn);
    expect(op.returns).toBe(CatalogValueKind.Float);
    expect(op.arguments).toEqual([
      expect.objectContaining({ key: "values", kind: CatalogValueKind.List, required: false }),
    ]);
  });

  it("notes side effects and deprecation in the description", () => {
    const fn = createBlokFunction(
      { name: "ui.toast", description: "Shows a toast.", schema: z.object({}), deprecated: "use ui.notify" },
      () => undefined,
    );
    expect(operationInputs(fn)[0].description).toBe(
      "Shows a toast. Deprecated: use ui.notify Has side effects; only valid in action position.",
    );
  });
});

describe("buildRegisterUiCatalogInput", () => {
  it("maps the real default catalog without throwing, each component once", () => {
    const input = buildRegisterUiCatalogInput(defaultBlokCatalog, { name: UI_CATALOG_NAME });

    expect(input.name).toBe(UI_CATALOG_NAME);
    expect(input.widgetDefaults).toEqual([]);
    const names = input.components.map((component) => component.name);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual([...defaultBlokCatalog.components.keys()].sort());
    // Every function and alias is addressable by name.
    const operationNames = new Set(input.operations.map((operation) => operation.name));
    for (const name of defaultBlokCatalog.functions.keys()) {
      expect(operationNames.has(name)).toBe(true);
    }
  });

  it("leaves out operations the server's base catalog reserves", () => {
    const reserved = new Set(["eq", "if", "get"]);
    const input = buildRegisterUiCatalogInput(
      defaultBlokCatalog,
      { name: UI_CATALOG_NAME },
      { reservedOperations: reserved },
    );
    const names = new Set(input.operations.map((operation) => operation.name));
    for (const name of reserved) {
      expect(defaultBlokCatalog.functions.has(name)).toBe(true);
      expect(names.has(name)).toBe(false);
    }
    // The canonical (non-alias) names stay registered.
    expect(names.has("compare.eq")).toBe(true);
  });
});

describe("catalogMatches", () => {
  const catalog = createBlokCatalog(
    "test",
    [
      createBlokComponent(
        { name: "Text", schema: z.object({ text: z.string(), muted: z.boolean().optional() }) },
        Noop,
      ),
    ],
    [
      createBlokFunction(
        { name: "upper", description: "Uppercases.", purity: "pure", returnType: "string", schema: z.object({ value: z.string() }) },
        () => "",
      ),
    ],
  );
  const input = buildRegisterUiCatalogInput(catalog, { name: "orkestrator", description: "d" });

  const roundTrip = (): UiCatalogFragment => ({
    __typename: "UICatalog",
    id: "1",
    name: input.name,
    description: input.description ?? null,
    isRegistered: true,
    // Server echoes in its own order with __typename markers.
    components: [...input.components].reverse().map((component) => ({
      __typename: "CatalogComponent",
      name: component.name,
      description: component.description ?? null,
      acceptsChildren: component.acceptsChildren ?? true,
      props: [...(component.props ?? [])].reverse().map((prop) => ({
        __typename: "CatalogProp",
        key: prop.key,
        kind: prop.kind,
        required: prop.required ?? false,
        description: prop.description ?? null,
      })),
    })),
    operations: input.operations.map((operation) => ({
      __typename: "CatalogOperation",
      name: operation.name,
      description: operation.description ?? null,
      returns: operation.returns,
      arguments: (operation.arguments ?? []).map((argument) => ({
        __typename: "CatalogArgument",
        key: argument.key,
        kind: argument.kind,
        required: argument.required ?? true,
        description: argument.description ?? null,
      })),
    })),
  });

  it("is true for an identical server copy regardless of ordering", () => {
    expect(catalogMatches(roundTrip(), input)).toBe(true);
  });

  it("is false when missing, unregistered, or different", () => {
    expect(catalogMatches(undefined, input)).toBe(false);
    expect(catalogMatches({ ...roundTrip(), isRegistered: false }, input)).toBe(false);

    const changedKind = roundTrip();
    changedKind.components[0].props[0].kind = CatalogValueKind.Any;
    expect(catalogMatches(changedKind, input)).toBe(false);

    const missingOperation = roundTrip();
    missingOperation.operations = [];
    expect(catalogMatches(missingOperation, input)).toBe(false);
  });
});
