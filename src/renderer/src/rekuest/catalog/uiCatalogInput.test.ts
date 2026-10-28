// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createBlokCatalog,
  createBlokComponent,
  BlokPropSchemas,
} from "@arkitektio/bsx/renderer/runtime/index";
import { orkestratorUi, UI_CATALOG_NAME } from "@/core/blok/catalog";
import { CatalogValueKind, type ModuleFragment } from "@/rekuest/api/graphql";
import {
  buildRegisterModuleInput,
  moduleMatches,
  componentInput,
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
      context: "HTML",
      childrenContext: null,
      inheritsContext: false,
      downstreamOf: [],
      notDownstreamOf: [],
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

  it("publishes where a component may be placed and the props that name an asset", () => {
    const Model = createBlokComponent(
      {
        name: "Model",
        acceptsChildren: true,
        placement: { context: "scene", downstreamOf: ["Scene"] },
        propKinds: { src: "ASSET" },
        schema: z.object({ src: z.string(), id: z.string().optional() }),
      },
      Noop,
    );
    const Popout = createBlokComponent(
      {
        name: "Popout",
        placement: { context: "scene", childrenContext: "html", downstreamOf: ["Robot", "Model"] },
        schema: z.object({}),
      },
      Noop,
    );

    const model = componentInput(Model);
    expect(model).toMatchObject({ context: "SCENE", childrenContext: null, downstreamOf: ["Scene"] });
    expect(model.props?.map((prop) => [prop.key, prop.kind])).toEqual([
      ["id", CatalogValueKind.String],
      ["src", CatalogValueKind.Asset],
    ]);
    expect(componentInput(Popout)).toMatchObject({
      context: "SCENE",
      childrenContext: "HTML",
      downstreamOf: ["Model", "Robot"],
    });
  });

  it("publishes the logo context and the components that take their parent's", () => {
    const Svg = createBlokComponent(
      { name: "SVG", placement: { childrenContext: "logo", notDownstreamOf: ["SVG"] }, schema: z.object({}) },
      Noop,
    );
    const Path = createBlokComponent(
      { name: "Path", placement: { context: "logo", downstreamOf: ["SVG"] }, schema: z.object({}) },
      Noop,
    );
    const Loop = createBlokComponent(
      { name: "Loop", acceptsChildren: true, placement: { inheritsContext: true }, schema: z.object({}) },
      Noop,
    );

    expect(componentInput(Svg)).toMatchObject({ context: "HTML", childrenContext: "LOGO", inheritsContext: false });
    expect(componentInput(Path)).toMatchObject({ context: "LOGO", childrenContext: null, downstreamOf: ["SVG"] });
    expect(componentInput(Loop)).toMatchObject({ inheritsContext: true });
  });

  it("takes a declared acceptsChildren over the schema's lack of a children prop", () => {
    const Loop = createBlokComponent({ name: "Loop", acceptsChildren: true, schema: z.object({}) }, Noop);
    expect(componentInput(Loop)).toMatchObject({ acceptsChildren: true, props: [] });
  });
});

describe("buildRegisterModuleInput", () => {
  it("maps the real UI without throwing: its claims, and none of the claimed catalogs' components", () => {
    const input = buildRegisterModuleInput(orkestratorUi);

    expect(input.name).toBe(UI_CATALOG_NAME);
    expect(input.widgetDefaults).toEqual([]);
    expect(input.catalogs).toEqual([...orkestratorUi.claims].sort());
    expect(input.catalogs).toContain("ui@1");
    const names = new Set(input.components.map((component) => component.name));
    for (const name of ["Button", "foreach", "Sheet", "Scene", "StructurePicker"]) expect(names.has(name), name).toBe(false);
    // A module adds components only: what a blok calls is the language's.
    expect(input.operations).toEqual([]);
  });

  it("sends a UI's own components, sorted, each once", () => {
    const own = createBlokCatalog("own", [
      createBlokComponent({ name: "Zeta", schema: z.object({}) }, Noop),
      createBlokComponent({ name: "Alpha", schema: z.object({}) }, Noop),
    ]);
    const input = buildRegisterModuleInput({ name: "own", description: null, catalog: own, claims: [] });
    expect(input.components.map((component) => component.name)).toEqual(["Alpha", "Zeta"]);
    expect(input.catalogs).toEqual([]);
  });
});

describe("moduleMatches", () => {
  const catalog = createBlokCatalog(
    "test",
    [
      createBlokComponent(
        { name: "Text", schema: z.object({ text: z.string(), muted: z.boolean().optional() }) },
        Noop,
      ),
    ],
  );
  const input = buildRegisterModuleInput({ name: "orkestrator", description: "d", catalog, claims: ["ui@1", "html@1"] });

  const roundTrip = (): ModuleFragment => ({
    __typename: "Module",
    id: "1",
    name: input.name,
    description: input.description ?? null,
    isRegistered: true,
    catalogs: ["html@1", "ui@1"],
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
    expect(moduleMatches(roundTrip(), input)).toBe(true);
  });

  it("is false when missing, unregistered, or different", () => {
    expect(moduleMatches(undefined, input)).toBe(false);
    expect(moduleMatches({ ...roundTrip(), isRegistered: false }, input)).toBe(false);

    const changedKind = roundTrip();
    changedKind.components[0].props[0].kind = CatalogValueKind.Any;
    expect(moduleMatches(changedKind, input)).toBe(false);

    // A copy registered when modules still carried operations is out of date: it is sent again.
    const withOperation = roundTrip();
    withOperation.operations = [
      { __typename: "CatalogOperation", name: "upper", description: null, returns: CatalogValueKind.String, arguments: [] },
    ];
    expect(moduleMatches(withOperation, input)).toBe(false);

    expect(moduleMatches({ ...roundTrip(), catalogs: ["ui@1"] }, input)).toBe(false);
    expect(moduleMatches({ ...roundTrip(), catalogs: [] }, input)).toBe(false);
  });
});
