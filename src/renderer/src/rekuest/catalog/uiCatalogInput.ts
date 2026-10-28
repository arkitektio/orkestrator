import { z } from "zod";
import {
  isActionSchema,
  isRequiredField,
  unwrapSchema,
  type BlokComponentContext,
  type BlokComponentPlacement,
  type BlokPropKind,
} from "@arkitektio/bsx/renderer/runtime/index";
import { moduleComponentsOf, type BlokUi } from "@arkitektio/bsx/runtime";
import {
  ComponentContext,
  CatalogValueKind,
  type CatalogComponentInput,
  type CatalogOperationInput,
  type CatalogPropInput,
  type RegisterModuleInput,
  type ModuleFragment,
} from "@/rekuest/api/graphql";

/**
 * Maps the renderer's declared UI (`orkestratorUi`) onto rekuest's
 * `RegisterModuleInput`, so the server can validate bloks and definitions
 * against what this client actually renders and evaluates.
 *
 * Lives under rekuest because it emits rekuest input types; the blok runtime
 * stays service-agnostic.
 */

const INT_FORMATS = new Set(["safeint", "int32", "uint32", "int64", "uint64"]);

type ZodDef = {
  type?: string;
  format?: string;
  innerType?: z.ZodTypeAny;
  in?: z.ZodTypeAny;
  options?: z.ZodTypeAny[];
  values?: unknown[];
  entries?: Record<string, unknown>;
};

const defOf = (schema: z.ZodTypeAny): ZodDef =>
  (schema as unknown as { def?: ZodDef }).def ?? {};

/** Reaches through optional/nullable/default wrappers and transforms (`pipe`). */
const unwrapForKind = (schema: z.ZodTypeAny): z.ZodTypeAny => {
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

/** The closed set of strings a `z.enum` prop takes, through its wrappers; null for any other schema. */
export const zodEnumValues = (schema: z.ZodTypeAny): string[] | null => {
  const def = defOf(unwrapForKind(schema));
  if (def.type !== "enum" || !def.entries) return null;
  const values = Object.values(def.entries);
  return values.every((value): value is string => typeof value === "string") ? values : null;
};

/** Best-effort `CatalogValueKind` for a zod schema; unknown shapes are `ANY`. */
export const zodToCatalogKind = (schema: z.ZodTypeAny): CatalogValueKind => {
  // Action props are `z.custom(...)` under a brand, so check before the type switch.
  if (isActionSchema(schema)) {
    return CatalogValueKind.Callback;
  }

  const inner = unwrapForKind(schema);
  const def = defOf(inner);

  switch (def.type) {
    case "string":
    case "enum":
    case "template_literal":
      return CatalogValueKind.String;
    case "literal": {
      const values = def.values ?? [];
      if (values.every((value) => typeof value === "string")) return CatalogValueKind.String;
      if (values.every((value) => typeof value === "boolean")) return CatalogValueKind.Bool;
      if (values.every((value) => typeof value === "number")) return CatalogValueKind.Float;
      return CatalogValueKind.Any;
    }
    case "number":
      return def.format && INT_FORMATS.has(def.format)
        ? CatalogValueKind.Int
        : CatalogValueKind.Float;
    case "boolean":
      return CatalogValueKind.Bool;
    case "array":
    case "tuple":
    case "set":
      return CatalogValueKind.List;
    case "object":
    case "record":
    case "map":
      return CatalogValueKind.Dict;
    case "union": {
      const kinds = new Set((def.options ?? []).map(zodToCatalogKind));
      return kinds.size === 1 ? [...kinds][0] : CatalogValueKind.Any;
    }
    default:
      return CatalogValueKind.Any;
  }
};

const describe = (schema: z.ZodTypeAny): string | null => schema.description ?? null;

const shapeOf = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> | null =>
  schema instanceof z.ZodObject
    ? (schema.shape as Record<string, z.ZodTypeAny>)
    : null;

const propInput = (key: string, schema: z.ZodTypeAny): CatalogPropInput => ({
  key,
  kind: zodToCatalogKind(schema),
  required: isRequiredField(schema),
  description: describe(schema),
});

/**
 * `RegisterModuleInput` marks the lists optional (server defaults to `[]`);
 * the builder always fills them, and consumers rely on that.
 */
export type BuiltModuleInput = RegisterModuleInput & {
  components: CatalogComponentInput[];
  operations: CatalogOperationInput[];
  catalogs: string[];
};

const sortByKey = <T extends { key: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => left.key.localeCompare(right.key));

const CONTEXT: Record<BlokComponentContext, ComponentContext> = {
  html: ComponentContext.Html,
  scene: ComponentContext.Scene,
  logo: ComponentContext.Logo,
};

export const componentInput = (component: {
  name: string;
  schema: z.ZodTypeAny;
  acceptsChildren?: boolean;
  placement?: BlokComponentPlacement;
  propKinds?: Readonly<Record<string, BlokPropKind>>;
}): CatalogComponentInput => {
  const shape = shapeOf(component.schema) ?? {};
  const placement = component.placement ?? {};
  return {
    name: component.name,
    description: describe(component.schema),
    acceptsChildren: component.acceptsChildren ?? "children" in shape,
    context: CONTEXT[placement.context ?? "html"],
    childrenContext: placement.childrenContext ? CONTEXT[placement.childrenContext] : null,
    inheritsContext: placement.inheritsContext ?? false,
    downstreamOf: [...(placement.downstreamOf ?? [])].sort(),
    notDownstreamOf: [...(placement.notDownstreamOf ?? [])].sort(),
    props: sortByKey(
      Object.entries(shape).map(([key, schema]) => {
        const kind = component.propKinds?.[key];
        return kind ? { ...propInput(key, schema), kind: kind as CatalogValueKind } : propInput(key, schema);
      }),
    ),
  };
};

/**
 * What this UI registers (`registerModule`): its module, the components it
 * draws beyond the global catalogs (`moduleComponentsOf`), and `catalogs`, the
 * global ones it implements whole (`ui.claims`), which the server resolves
 * from the spec. base@2's components are never sent: the server holds them.
 */
export const buildRegisterModuleInput = (ui: Pick<BlokUi, "name" | "description" | "catalog" | "claims">): BuiltModuleInput => ({
  name: ui.name,
  description: ui.description,
  components: moduleComponentsOf(ui.catalog)
    .map(componentInput)
    .sort((left, right) => left.name.localeCompare(right.name)),
  // A module adds components only: what a blok may call is the language's (the spec's vocabulary).
  operations: [],
  catalogs: [...ui.claims].sort(),
  // The client's per-PortKind fallbacks are built-in React widgets, not
  // catalog components, so there is nothing meaningful to publish yet.
  widgetDefaults: [],
});

// --- Comparison against the server copy ---------------------------------------

type CanonicalField = {
  key: string;
  kind: string;
  required: boolean;
  description: string | null;
};

type CanonicalCatalog = {
  components: Array<{
    name: string;
    description: string | null;
    acceptsChildren: boolean;
    context: string;
    childrenContext: string | null;
    downstreamOf: string[];
    notDownstreamOf: string[];
    props: CanonicalField[];
  }>;
  operations: Array<{
    name: string;
    description: string | null;
    returns: string;
    arguments: CanonicalField[];
  }>;
};

const canonicalFields = (
  fields:
    | ReadonlyArray<{
        key: string;
        kind: string;
        required?: boolean | null;
        description?: string | null;
      }>
    | null
    | undefined,
  requiredDefault: boolean,
): CanonicalField[] =>
  sortByKey(
    (fields ?? []).map((field) => ({
      key: field.key,
      kind: field.kind,
      required: field.required ?? requiredDefault,
      description: field.description ?? null,
    })),
  );

const canonicalize = (
  catalog: Pick<BuiltModuleInput, "components" | "operations"> | ModuleFragment,
): CanonicalCatalog => ({
  components: [...catalog.components]
    .map((component) => ({
      name: component.name,
      description: component.description ?? null,
      acceptsChildren: component.acceptsChildren ?? true,
      context: component.context ?? ComponentContext.Html,
      childrenContext: component.childrenContext ?? null,
      downstreamOf: [...(component.downstreamOf ?? [])].sort(),
      notDownstreamOf: [...(component.notDownstreamOf ?? [])].sort(),
      props: canonicalFields(component.props, false),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
  operations: [...catalog.operations]
    .map((operation) => ({
      name: operation.name,
      description: operation.description ?? null,
      returns: operation.returns,
      arguments: canonicalFields(operation.arguments, true),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
});

/**
 * True when the server's copy already carries exactly what we would register,
 * so the startup registrar can skip the mutation. Compared structurally after
 * normalizing ordering, `__typename` markers and server-side input defaults.
 */
export const moduleMatches = (
  remote: ModuleFragment | null | undefined,
  input: BuiltModuleInput,
): boolean => {
  if (!remote || !remote.isRegistered || remote.name !== input.name) {
    return false;
  }
  if ((remote.description ?? null) !== (input.description ?? null)) {
    return false;
  }
  if (JSON.stringify([...remote.catalogs].sort()) !== JSON.stringify([...input.catalogs].sort())) {
    return false;
  }
  return JSON.stringify(canonicalize(remote)) === JSON.stringify(canonicalize(input));
};
