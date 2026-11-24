// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createBlokCatalog, createBlokComponent } from "@arkitektio/bsx/renderer/runtime/index";
import { orkestratorUi, UI_CATALOG_NAME } from "@/core/blok/catalog";
import type { ModuleFragment } from "@/rekuest/api/graphql";
import { buildRegisterModuleInput, moduleMatches } from "./uiCatalogInput";

const Noop = () => null;

describe("buildRegisterModuleInput", () => {
  it("maps the real UI: the base catalog it speaks, none of its components, every prop a port", () => {
    const input = buildRegisterModuleInput(orkestratorUi);

    expect(input.name).toBe(UI_CATALOG_NAME);
    expect(input.catalogs).toEqual(["base@4"]);
    expect(input.operations).toEqual([]);
    const names = new Set(input.components.map((component) => component.name));
    for (const name of ["Button", "foreach", "Scene"]) expect(names.has(name), name).toBe(false);
    for (const component of input.components) {
      for (const prop of component.props ?? []) expect(prop.port?.kind, `${component.name}.${prop.key}`).toBeTruthy();
    }
  });
});

describe("moduleMatches", () => {
  const catalog = createBlokCatalog("test", [
    createBlokComponent(
      { name: "Text", schema: z.object({ text: z.string(), tone: z.enum(["a", "b"]).optional() }) },
      Noop,
    ),
  ]);
  const input = buildRegisterModuleInput({ name: "orkestrator", description: "d", catalog, claims: ["base@4"] });

  /** The server's echo: its own order, __typename markers, the port as a `tree`. */
  const roundTrip = (): ModuleFragment =>
    ({
      __typename: "Module",
      id: "1",
      name: input.name,
      description: input.description ?? null,
      isRegistered: true,
      catalogs: ["base@4"],
      components: [...input.components].reverse().map((component) => ({
        __typename: "CatalogComponent",
        ...component,
        props: [...(component.props ?? [])].reverse().map((prop) => ({
          __typename: "CatalogProp",
          key: prop.key,
          required: prop.required ?? false,
          description: prop.description ?? null,
          since: 0,
          port: { __typename: "CatalogPort", kind: prop.port?.kind ?? null, tree: JSON.parse(JSON.stringify(prop.port)) },
        })),
      })),
      operations: [],
    }) as unknown as ModuleFragment;

  it("is true for an identical server copy regardless of ordering", () => {
    expect(moduleMatches(roundTrip(), input)).toBe(true);
  });

  it("is false when missing, unregistered, emptied by the server, or typed otherwise", () => {
    expect(moduleMatches(undefined, input)).toBe(false);
    expect(moduleMatches({ ...roundTrip(), isRegistered: false }, input)).toBe(false);
    expect(moduleMatches({ ...roundTrip(), components: [] }, input)).toBe(false);

    const retyped = roundTrip();
    (retyped.components[0].props[0].port as { tree: unknown }).tree = { kind: "INT" };
    expect(moduleMatches(retyped, input)).toBe(false);
  });
});
