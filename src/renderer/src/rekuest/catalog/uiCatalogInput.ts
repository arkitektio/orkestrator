import { z } from "zod";
import {
  isActionSchema,
  isRequiredField,
  unwrapSchema,
  type BlokCatalog,
  type BlokFunctionDefinition,
  type BlokFunctionReturnType,
} from "@/blok/renderer/runtime";
import {
  CatalogValueKind,
  type CatalogArgumentInput,
  type CatalogComponentInput,
  type CatalogOperationInput,
  type CatalogPropInput,
  type RegisterUiCatalogInput,
  type UiCatalogFragment,
} from "@/rekuest/api/graphql";

/**
 * Maps the renderer's blok catalog (`defaultBlokCatalog`) onto rekuest's
 * `RegisterUiCatalogInput`, so the server can validate bloks and definitions
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

const argumentInput = (key: string, schema: z.ZodTypeAny): CatalogArgumentInput => ({
  key,
  kind: zodToCatalogKind(schema),
  required: isRequiredField(schema),
  description: describe(schema),
});

const RETURN_KIND: Record<BlokFunctionReturnType, CatalogValueKind> = {
  string: CatalogValueKind.String,
  number: CatalogValueKind.Float,
  boolean: CatalogValueKind.Bool,
  list: CatalogValueKind.List,
  object: CatalogValueKind.Dict,
  unknown: CatalogValueKind.Any,
  void: CatalogValueKind.Any,
};

/**
 * `RegisterUiCatalogInput` marks the lists optional (server defaults to `[]`);
 * the builder always fills them, and consumers rely on that.
 */
export type BuiltUiCatalogInput = RegisterUiCatalogInput & {
  components: CatalogComponentInput[];
  operations: CatalogOperationInput[];
};

const sortByKey = <T extends { key: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => left.key.localeCompare(right.key));

const operationArguments = (fn: BlokFunctionDefinition): CatalogArgumentInput[] => {
  if (fn.variadic) {
    return [
      {
        key: "values",
        kind: CatalogValueKind.List,
        required: false,
        description:
          "Positional values; bare numeric argument keys (0, 1, …) are accepted as well.",
      },
    ];
  }
  const shape = shapeOf(fn.schema);
  if (!shape) {
    return [];
  }
  return sortByKey(
    Object.entries(shape).map(([key, schema]) => argumentInput(key, schema)),
  );
};

const operationDescription = (fn: BlokFunctionDefinition, alias?: string): string => {
  const parts = [alias ? `Alias of ${fn.name}. ${fn.description}` : fn.description];
  if (fn.deprecated) parts.push(`Deprecated: ${fn.deprecated}`);
  if (fn.purity === "effect") parts.push("Has side effects; only valid in action position.");
  return parts.join(" ");
};

export const componentInput = (component: {
  name: string;
  schema: z.ZodTypeAny;
}): CatalogComponentInput => {
  const shape = shapeOf(component.schema) ?? {};
  return {
    name: component.name,
    description: describe(component.schema),
    acceptsChildren: "children" in shape,
    props: sortByKey(Object.entries(shape).map(([key, schema]) => propInput(key, schema))),
  };
};

export const operationInputs = (fn: BlokFunctionDefinition): CatalogOperationInput[] => {
  const base = {
    arguments: operationArguments(fn),
    returns: RETURN_KIND[fn.returnType] ?? CatalogValueKind.Any,
  };
  return [
    { name: fn.name, description: operationDescription(fn), ...base },
    ...fn.aliases.map((alias) => ({
      name: alias,
      description: operationDescription(fn, alias),
      ...base,
    })),
  ];
};

export type BuildUiCatalogOptions = {
  /**
   * Operation names the server's built-in base catalog already defines. A UI
   * catalog may not redefine them (the server rejects the whole registration),
   * so they are left out; the client still evaluates them locally, the server
   * simply validates them against its own definition.
   */
  reservedOperations?: ReadonlySet<string>;
};

export const buildRegisterUiCatalogInput = (
  catalog: BlokCatalog,
  meta: { name: string; description?: string | null },
  options: BuildUiCatalogOptions = {},
): BuiltUiCatalogInput => ({
  name: meta.name,
  description: meta.description ?? null,
  components: [...catalog.components.values()]
    .map(componentInput)
    .sort((left, right) => left.name.localeCompare(right.name)),
  operations: catalog.functionDefinitions
    .flatMap(operationInputs)
    .filter((operation) => !options.reservedOperations?.has(operation.name))
    .sort((left, right) => left.name.localeCompare(right.name)),
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
  catalog: Pick<BuiltUiCatalogInput, "components" | "operations"> | UiCatalogFragment,
): CanonicalCatalog => ({
  components: [...catalog.components]
    .map((component) => ({
      name: component.name,
      description: component.description ?? null,
      acceptsChildren: component.acceptsChildren ?? true,
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
export const catalogMatches = (
  remote: UiCatalogFragment | null | undefined,
  input: BuiltUiCatalogInput,
): boolean => {
  if (!remote || !remote.isRegistered || remote.name !== input.name) {
    return false;
  }
  if ((remote.description ?? null) !== (input.description ?? null)) {
    return false;
  }
  return JSON.stringify(canonicalize(remote)) === JSON.stringify(canonicalize(input));
};
