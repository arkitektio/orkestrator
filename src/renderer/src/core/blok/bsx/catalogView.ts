import { z } from "zod";
import type { BlokComponentContext } from "../renderer/runtime/components";
import type { BlokCatalog } from "../renderer/runtime/functions";
import { isRequiredField } from "../renderer/runtime/preflight";
import { isActionSchema, unwrapSchema } from "../renderer/runtime/schemas";

/**
 * What an author can write, read off a catalog: its components with their
 * props (kind, required, description, the values an enum takes) and where
 * each may sit, and its util functions with their parameters. The editor's
 * completion, hover and signature help all ask this, never the zod schemas.
 */

export type BsxValueKind = "action" | "string" | "int" | "float" | "bool" | "list" | "dict" | "asset" | "any";

export type BsxPropInfo = {
  key: string;
  kind: BsxValueKind;
  required: boolean;
  description: string | null;
  /** An enum's or a literal union's values, offered as completions. */
  values: string[];
};

export type BsxComponentInfo = {
  name: string;
  description: string | null;
  acceptsChildren: boolean;
  context: BlokComponentContext;
  childrenContext: BlokComponentContext | null;
  inheritsContext: boolean;
  downstreamOf: readonly string[];
  notDownstreamOf: readonly string[];
  /** Without `children` (BSX writes child elements) and `id` (BSX reads it as the node id). */
  props: BsxPropInfo[];
};

export type BsxFunctionInfo = {
  name: string;
  description: string | null;
  params: BsxPropInfo[];
  variadic: boolean;
  pure: boolean;
};

export type BsxCatalogView = {
  components: Map<string, BsxComponentInfo>;
  functions: Map<string, BsxFunctionInfo>;
};

/** The blok contexts (`ComponentContext`), as the renderer names them. */
export type BsxBlokContext = "HTML" | "SCENE" | "LOGO" | "ACTION_LOGO" | "OVERLAY";

export const RENDER_CONTEXT: Record<BsxBlokContext, BlokComponentContext> = {
  HTML: "html",
  SCENE: "scene",
  LOGO: "logo",
  ACTION_LOGO: "logo",
  // An overlay starts in html like any blok; its `Overlay` root opens the scene it is drawn into.
  OVERLAY: "html",
};

/** The root a blok of each context must have; HTML takes any html component. */
export const CONTEXT_ROOT: Partial<Record<BsxBlokContext, string>> = {
  SCENE: "Scene",
  LOGO: "SVG",
  ACTION_LOGO: "ActionLogo",
  OVERLAY: "Overlay",
};

type ZodDef = { type?: string; in?: z.ZodTypeAny; options?: z.ZodTypeAny[]; values?: unknown[]; entries?: Record<string, unknown>; format?: string };

const defOf = (schema: z.ZodTypeAny): ZodDef => (schema as unknown as { def?: ZodDef }).def ?? {};

const inner = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current = unwrapSchema(schema);
  for (let depth = 0; depth < 8; depth += 1) {
    const def = defOf(current);
    if (def.type === "pipe" && def.in) {
      current = unwrapSchema(def.in);
      continue;
    }
    return current;
  }
  return current;
};

const INT_FORMATS = new Set(["int32", "uint32", "safeint", "int64", "uint64"]);

const kindOf = (schema: z.ZodTypeAny): BsxValueKind => {
  if (isActionSchema(schema)) return "action";
  const def = defOf(inner(schema));
  switch (def.type) {
    case "string":
    case "enum":
    case "template_literal":
      return "string";
    case "literal": {
      const values = def.values ?? [];
      if (values.every((value) => typeof value === "string")) return "string";
      if (values.every((value) => typeof value === "boolean")) return "bool";
      if (values.every((value) => typeof value === "number")) return "float";
      return "any";
    }
    case "number":
      return def.format && INT_FORMATS.has(def.format) ? "int" : "float";
    case "boolean":
      return "bool";
    case "array":
    case "tuple":
    case "set":
      return "list";
    case "object":
    case "record":
    case "map":
      return "dict";
    case "union": {
      const kinds = new Set((def.options ?? []).map(kindOf));
      return kinds.size === 1 ? [...kinds][0] : "any";
    }
    default:
      return "any";
  }
};

const valuesOf = (schema: z.ZodTypeAny): string[] => {
  const def = defOf(inner(schema));
  if (def.type === "enum") return Object.values(def.entries ?? {}).map(String);
  if (def.type === "literal") return (def.values ?? []).filter((value) => typeof value === "string") as string[];
  if (def.type === "union") return [...new Set((def.options ?? []).flatMap(valuesOf))];
  return [];
};

const propInfo = (key: string, schema: z.ZodTypeAny, assets: boolean): BsxPropInfo => ({
  key,
  kind: assets ? "asset" : kindOf(schema),
  required: isRequiredField(schema),
  description: schema.description ?? null,
  values: valuesOf(schema),
});

const shapeOf = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> =>
  schema instanceof z.ZodObject ? (schema.shape as Record<string, z.ZodTypeAny>) : {};

const byRequiredThenKey = (left: BsxPropInfo, right: BsxPropInfo) =>
  Number(right.required) - Number(left.required) || left.key.localeCompare(right.key);

const views = new WeakMap<BlokCatalog, { size: number; view: BsxCatalogView }>();

/** Cached per catalog; rebuilt when a module adds components (`addBlokComponents`). */
export const viewCatalog = (catalog: BlokCatalog): BsxCatalogView => {
  const size = catalog.components.size + catalog.functionDefinitions.length;
  const cached = views.get(catalog);
  if (cached && cached.size === size) return cached.view;

  const components = new Map<string, BsxComponentInfo>();
  for (const definition of catalog.components.values()) {
    const shape = shapeOf(definition.schema);
    const placement = definition.placement ?? {};
    components.set(definition.name, {
      name: definition.name,
      description: definition.schema.description ?? null,
      acceptsChildren: definition.acceptsChildren ?? "children" in shape,
      context: placement.context ?? "html",
      childrenContext: placement.childrenContext ?? null,
      inheritsContext: placement.inheritsContext ?? false,
      downstreamOf: placement.downstreamOf ?? [],
      notDownstreamOf: placement.notDownstreamOf ?? [],
      props: Object.entries(shape)
        .filter(([key]) => key !== "children" && key !== "id")
        .map(([key, schema]) => propInfo(key, schema, definition.propKinds?.[key] === "ASSET"))
        .sort(byRequiredThenKey),
    });
  }

  const functions = new Map<string, BsxFunctionInfo>();
  for (const definition of catalog.functionDefinitions) {
    const info: BsxFunctionInfo = {
      name: definition.name,
      description: definition.description ?? null,
      params: Object.entries(shapeOf(definition.schema)).map(([key, schema]) => propInfo(key, schema, false)),
      variadic: definition.variadic ?? false,
      pure: definition.purity === "pure",
    };
    for (const name of [definition.name, ...definition.aliases]) functions.set(name, { ...info, name });
  }

  const view = { components, functions };
  views.set(catalog, { size, view });
  return view;
};

/** The context a component's children are placed in. */
export const childContextOf = (component: BsxComponentInfo | undefined, current: BlokComponentContext): BlokComponentContext => {
  if (!component || component.inheritsContext) return current;
  return component.childrenContext ?? component.context;
};

/** Whether `candidate` may sit under `ancestors` (outermost first) in `context`. */
export const fitsUnder = (
  candidate: BsxComponentInfo,
  ancestors: readonly string[],
  context: BlokComponentContext,
): boolean => {
  if (!candidate.inheritsContext && candidate.context !== context) return false;
  if (candidate.downstreamOf.length > 0 && !candidate.downstreamOf.some((name) => ancestors.includes(name))) return false;
  if (candidate.notDownstreamOf.some((name) => ancestors.includes(name))) return false;
  return true;
};
