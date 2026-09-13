import { notEmpty } from "@/lib/utils";
import { smartRegistry } from "@/providers/smart/registry";
import { ApolloClient, gql, NormalizedCache } from "@apollo/client";
import { z } from "zod";
import { PortKind } from "../api/graphql";
import { isRecord } from "./portPaths";
import { LabellablePort, PortablePort } from "./types";

export const pathToName = (path: string[]): string => {
  return path.join(".");
};

export const isScalarPort = (port: { kind: PortKind }): boolean => {
  return (
    port.kind == PortKind.Bool ||
    port.kind == PortKind.Float ||
    port.kind == PortKind.Int ||
    port.kind == PortKind.String ||
    port.kind == PortKind.Date ||
    port.kind == PortKind.Structure ||
    port.kind == PortKind.Quantity ||
    port.kind == PortKind.List
  );
};

export const isObjectPort = (port: LabellablePort): boolean => {
  return port.kind == PortKind.Dict || port.kind == PortKind.Model;
};

/**
 * Sensible minimum width (in px) for a single item of the given kind when it is
 * laid out in a responsive `auto-fit` grid (see `ContainerGrid`'s
 * `minItemWidth`). Complex/nested kinds render tall, self-contained sub-forms
 * and want a wider track (fewer columns); simple scalar inputs pack densely.
 */
export const portToMinItemWidth = (port: { kind: PortKind }): number => {
  switch (port.kind) {
    case PortKind.Dict:
    case PortKind.Model:
    case PortKind.List:
    case PortKind.Union:
    case PortKind.Interface:
    case PortKind.MemoryStructure:
      return 320;
    default:
      // scalars, enums, dates and structure search widgets
      return 200;
  }
};

/** Human-readable name for a port, preferring the explicit label. */
export const portToName = (port: LabellablePort): string => {
  return port.label || port.key;
};

/**
 * Human-readable name for a port's structure identifier, via the smart
 * registry's reverse lookup (descriptive names are given in linkers.tsx).
 */
export const identifierToName = (
  identifier: string | null | undefined,
  fallback: string,
): string => {
  return identifier ? smartRegistry.getDisplayName(identifier) : fallback;
};

export const portToLabel = (port: LabellablePort): string => {
  if (port.kind == PortKind.Structure)
    return identifierToName(port.identifier, "Unknown Structure");
  if (port.kind == PortKind.List) {
    const firstChild = port.children?.at(0);

    return firstChild
      ? "List of " + portToLabel(firstChild) || "Unknown List"
      : "Unknown List";
  }
  if (port.kind == PortKind.Union)
    return (
      "Union of " +
      port?.children
        ?.filter(notEmpty)
        .map((x) => (x ? portToLabel(x) : "Unkown"))
        .join(", ")
    );
  if (port.kind == PortKind.Bool) return "Bool";
  if (port.kind == PortKind.Float) return "Float";
  if (port.kind == PortKind.Int) return "Int";
  if (port.kind == PortKind.String) return "String";
  if (port.kind == PortKind.Quantity) return "Quantity";
  if (port.kind == PortKind.Date) return "Date";
  if (port.kind == PortKind.Model) {
    return identifierToName(port.identifier, "Unknown Model");
  }
  if (port.kind == PortKind.Enum) {
    return identifierToName(port.identifier, "Unknown Enum");
  }
  if (port.kind == PortKind.MemoryStructure) {
    return identifierToName(port.identifier, "Unknown Memory Structure");
  }
  if (port.kind == PortKind.Dict) {
    const firstChild = port.children?.at(0);
    return firstChild
      ? "Dict of " + portToLabel(firstChild) || "Unknown Dict"
      : "Unknown Dict";
  }
  return "Unknown";
};

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

/**
 * Kinds the client cannot build a schema for degrade to `z.unknown()` with a
 * warning: a form that renders (with an "unknown widget" box) beats a form
 * that throws out of a `useMemo` and blanks the page.
 */
const unsupportedSchema = (reason: string): z.ZodTypeAny => {
  console.warn(`[ports] ${reason}; accepting any value`);
  return z.unknown();
};

// Ports are Apollo-cache-stable objects, so a WeakMap keyed on the port memoizes
// the (not cheap) zod construction across renders, forms and `recursiveSet`'s
// union probing.
const zodCache = new WeakMap<object, z.ZodTypeAny>();

export const portToZod = (port: LabellablePort): any => {
  const cached = zodCache.get(port);
  if (cached) return cached;
  const built = buildPortZod(port);
  zodCache.set(port, built);
  return built;
};

const buildPortZod = (port: LabellablePort): z.ZodTypeAny => {
  const portName = portToName(port);
  const nullish = (schema: z.ZodTypeAny): z.ZodTypeAny =>
    port.nullable ? schema.nullish() : schema;

  switch (port?.kind) {
    case PortKind.String:
      return nullish(z.string({ message: `"${portName}" requires a text value` }));
    case PortKind.Quantity:
      // A quantity is stored as a magnitude+unit wire string, e.g. "100 ms". A
      // bare numeric default is accepted and stringified.
      return z.preprocess(
        (value) => (typeof value === "number" ? String(value) : value),
        nullish(
          z
            .string({ message: `"${portName}" requires a quantity value` })
            .min(1, { message: `"${portName}" requires a quantity value` }),
        ),
      );
    case PortKind.Enum: {
      const values = (port.choices ?? []).map((c) => c.value);
      // A choice-less enum cannot be validated against anything; accept any
      // string rather than a fake sentinel nobody can select.
      return nullish(
        values.length > 0
          ? z.enum(values as [string, ...string[]], {
              message: `Please select a choice for "${portName}"`,
            })
          : z.string({ message: `Please select a choice for "${portName}"` }),
      );
    }
    case PortKind.Int:
      // An emptied <input> yields "" — that is "no value", never 0.
      return z.preprocess(
        emptyToUndefined,
        nullish(
          z.coerce
            .number({ message: `"${portName}" requires a valid integer` })
            .int({ message: `"${portName}" requires a whole number` }),
        ),
      );
    case PortKind.Float:
      return z.preprocess(
        emptyToUndefined,
        nullish(
          z.coerce
            .number({ message: `"${portName}" requires a valid number` })
            .refine((val) => !isNaN(val), {
              message: `"${portName}" requires a valid number`,
            }),
        ),
      );
    case PortKind.MemoryStructure:
      return nullish(
        z.object(
          { __identifier: z.literal(port.identifier), object: z.string() },
          {
            message: `Please select a ${identifierToName(port.identifier, "memory structure")} for "${portName}"`,
          },
        ),
      );
    case PortKind.Structure:
      return nullish(
        z.object(
          { __identifier: z.literal(port.identifier), object: z.string() },
          {
            message: `Please select a ${identifierToName(port.identifier, "structure")} for "${portName}"`,
          },
        ),
      );
    case PortKind.Union: {
      const variants = port.children?.filter(notEmpty) ?? [];
      if (variants.length === 0) {
        return unsupportedSchema(`Union port "${port.key}" has no variants`);
      }
      // The UnionWidget stores the value as { __use: "<variantIndex>", __value }
      // so the selected variant tab stays unambiguous (see UnionWidget.tsx).
      // A discriminated union reports errors *inside* the chosen variant at
      // their real path (…__value.<field>) instead of one path-less
      // "Invalid input" at the union root. recursiveExtract unwraps the
      // wrapper on submit.
      const variantSchemas = variants.map((v, index) =>
        z.object({
          __use: z.literal(index.toString()),
          __value: portToZod(v),
        }),
      );
      return nullish(
        variantSchemas.length === 1
          ? variantSchemas[0]
          : z.discriminatedUnion(
              "__use",
              variantSchemas as [
                (typeof variantSchemas)[number],
                ...(typeof variantSchemas)[number][],
              ],
              { message: `Please choose a variant for "${portName}"` },
            ),
      );
    }
    case PortKind.Bool:
      return nullish(
        z.boolean({ message: `"${portName}" requires a true/false value` }),
      );
    case PortKind.Dict: {
      const dictChild = port.children?.at(0);
      if (!dictChild) {
        return unsupportedSchema(`Dict port "${port.key}" has no child port`);
      }
      return nullish(
        z.array(
          z.object({
            __value: portToZod(dictChild),
            __key: z.string().min(1, { message: "Each entry needs a key" }),
          }),
        ),
      );
    }
    case PortKind.List: {
      const child = port.children?.at(0);
      if (!child) {
        return unsupportedSchema(`List port "${port.key}" has no child port`);
      }
      return nullish(z.array(z.object({ __value: portToZod(child) })));
    }
    case PortKind.Date:
      // Server defaults and stored values are ISO strings; the picker yields
      // Date objects. Accept both, validate as a date.
      return z.preprocess(
        (value) => {
          if (typeof value === "string" && value.length > 0) {
            const parsed = new Date(value);
            return isNaN(parsed.getTime()) ? value : parsed;
          }
          return emptyToUndefined(value);
        },
        nullish(z.date({ message: `"${portName}" requires a date` })),
      );
    case PortKind.Model:
      return nullish(buildZodSchema(port.children?.filter(notEmpty) ?? []));
    default:
      return unsupportedSchema(
        `Port kind ${port.kind} (port "${port.key}") is not supported for validation`,
      );
  }
};

export const buildDescribeFunction = (client: ApolloClient<NormalizedCache>) => {
  const document = gql(`
      query Describe($identifier: String!, $id: ID!) {
        describe(identifier: $identifier, id: $id) {
          key
          value
        }
      }
  `);

  return async (options: { identifier: string; id: string }) => {
    const result = await client.query({
      query: document,
      variables: {
        identifier: options.identifier,
        id: options.id,
      },
    });

    return result.data.describe as { key: string; value: string }[];
  };
};

/**
 * The structural (type) schema for a set of ports. Server-defined validators
 * are deliberately NOT part of it: zod skips an object's refinements when any
 * field fails its base check, which silenced every validator on a half-filled
 * form. They run in `portResolver.ts` instead, on every validation pass.
 */
export const buildZodSchema = (ports: PortablePort[], __identifier?: string) => {
  let portSchemas = ports.reduce(
    (prev, curr) => {
      prev[curr.key] = portToZod(curr);
      return prev;
    },
    {} as { [key: string]: any },
  );

  if (__identifier) {
    portSchemas = {
      ...portSchemas,
      __identifier: z.literal(__identifier),
    };
  }
  return z.object(portSchemas);
};

export const portToDefaults = (
  ports: PortablePort[],
  overwrites: { [key: string]: any },
): { [key: string]: any } => {
  const merged = ports.reduce(
    (acc, port) => {
      // overwrite wins when provided; otherwise fall back to the port default.
      // ?? keeps explicit falsy overwrites/defaults (0, "", false) intact.
      acc[port.key] = overwrites[port.key] ?? port.default;
      return acc;
    },
    {} as { [key: string]: any },
  );
  return setData(merged, ports);
};

export const recursiveExtract = (data: any, port: PortablePort): any => {
  if (data == undefined || data == null) return null;
  if (!port) throw new Error("Port is not defined");

  if (port.kind == PortKind.List) {
    return data.map((item: any) =>
      recursiveExtract(item.__value, port.children?.at(0) || port),
    );
  }

  if (port.kind == PortKind.Dict) {
    const childPort = port.children?.at(0) || port;
    return (data as { __key: string; __value: unknown }[]).reduce(
      (prev, item) => {
        prev[item.__key] = recursiveExtract(item.__value, childPort);
        return prev;
      },
      {} as { [key: string]: any },
    );
  }

  if (port.kind == PortKind.Union) {
    const variants = port.children?.filter(notEmpty) || [];
    const variant = variants[Number(data.__use)];
    if (!variant) return null;
    return recursiveExtract(data.__value, variant);
  }

  if (port.kind == PortKind.Model) {
    return submittedDataToRekuestFormat(
      data,
      port.children?.filter(notEmpty) || [],
    );
  }

  if (port.kind == PortKind.Date) {
    return data instanceof Date ? data.toISOString() : data;
  }

  if (
    (port.kind == PortKind.Int || port.kind == PortKind.Float) &&
    typeof data === "string"
  ) {
    const parsed = Number(data);
    return data.trim() === "" || isNaN(parsed) ? null : parsed;
  }

  return data;
};

export const submittedDataToRekuestFormat = (
  data: any,
  ports: PortablePort[],
): any => {
  return ports.reduce(
    (prev, curr) => {
      prev[curr.key] = recursiveExtract(data[curr.key], curr);
      return prev;
    },
    {} as { [key: string]: any },
  );
};

/** Defaults declared on a model's child ports, or null when none has one. */
const childDefaults = (children: PortablePort[]): Record<string, unknown> | null => {
  const defaults: Record<string, unknown> = {};
  let any = false;
  for (const child of children) {
    if (child.default !== undefined && child.default !== null) {
      defaults[child.key] = child.default;
      any = true;
    }
  }
  return any ? defaults : null;
};

export const recursiveSet = (data: any, port: PortablePort): any => {
  if (!port) throw new Error("Port is not defined");

  if (data === undefined || data === null) {
    // A model without a value of its own is still seeded from its children's
    // defaults, so nested forms open prefilled like top-level ones.
    if (port.kind == PortKind.Model) {
      const seed = childDefaults(port.children?.filter(notEmpty) || []);
      return seed ? setData(seed, port.children?.filter(notEmpty) || []) : null;
    }
    return null;
  }

  if (port.kind == PortKind.List) {
    const childPort = port.children?.at(0);
    if (!childPort) return null;
    return data.map((item: any) => ({
      __value: recursiveSet(item, childPort),
    }));
  }

  if (port.kind == PortKind.Dict) {
    const childPort = port.children?.at(0);
    if (!childPort) return null;

    return Object.entries(data).map(([key, value]) => ({
      __key: key,
      __value: recursiveSet(value, childPort),
    }));
  }

  if (port.kind == PortKind.Union) {
    const variants = port.children?.filter(notEmpty) || [];
    // Pick the first variant whose schema accepts the raw value and wrap it in
    // the { __use, __value } shape the UnionWidget expects.
    const index = variants.findIndex(
      (v) => portToZod(v).safeParse(data).success,
    );
    const useIndex = index === -1 ? 0 : index;
    const variant = variants[useIndex];
    if (!variant) return null;
    return { __use: useIndex.toString(), __value: recursiveSet(data, variant) };
  }

  if (port.kind == PortKind.Model) {
    return setData(data, port.children?.filter(notEmpty) || []);
  }

  return data;
};

export const setData = (data: any, ports: PortablePort[]): any => {
  return ports.reduce(
    (prev, curr) => {
      prev[curr.key] = recursiveSet(data?.[curr.key], curr);
      return prev;
    },
    {} as { [key: string]: any },
  );
};

export const argDictToArgs = (
  dict: { [key: string]: any },
  ports: PortablePort[],
) => {
  return ports.map((port) => {
    // ?? keeps explicit falsy values (0, "", false); only nullish falls back.
    return dict[port.key] ?? port.default ?? null;
  });
};

/** Identity string for a port list, for memo keys and reset guards. */
export const portHash = (ports: readonly (LabellablePort | null | undefined)[]) =>
  ports
    .filter(notEmpty)
    .map((port) => `${port.key}-${port.kind}-${port.identifier}`)
    .join("-");

/**
 * Flatten react-hook-form's nested `errors` object into "path: message"
 * lines for a toast. Leaves carry `message`; `ref` (a DOM node) is skipped so
 * we never walk into React internals.
 */
export const extractErrorMessages = (
  obj: Record<string, any>,
  prefix = "",
): string[] => {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === "ref") continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v?.message === "string") out.push(`${path}: ${v.message}`);
    else if (isRecord(v)) out.push(...extractErrorMessages(v, path));
  }
  return out;
};

/**
 * True when a field path is "mounted": some registered field name equals it,
 * lives below it, or is an ancestor of it (a union's Controller sits on the
 * union root while its errors sit under `__value`).
 */
export const isFieldMounted = (
  fieldName: string,
  mountedNames: ReadonlySet<string>,
): boolean => {
  if (mountedNames.has(fieldName)) return true;
  const prefix = fieldName + ".";
  for (const name of mountedNames) {
    if (name.startsWith(prefix) || fieldName.startsWith(name + ".")) return true;
  }
  return false;
};

/**
 * Remove values of ports that are not mounted (hidden by an effect, never
 * rendered). Works on the already-extracted submit payload; recurses into
 * models. What the user cannot see is not sent.
 */
export const pruneUnmountedPorts = (
  extracted: Record<string, any>,
  ports: PortablePort[],
  mountedNames: ReadonlySet<string>,
  path: string[] = [],
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const port of ports) {
    const fieldPath = [...path, port.key];
    if (!isFieldMounted(pathToName(fieldPath), mountedNames)) continue;
    const value = extracted[port.key];
    if (port.kind == PortKind.Model && isRecord(value)) {
      out[port.key] = pruneUnmountedPorts(
        value,
        port.children?.filter(notEmpty) || [],
        mountedNames,
        fieldPath,
      );
    } else {
      out[port.key] = value;
    }
  }
  return out;
};
