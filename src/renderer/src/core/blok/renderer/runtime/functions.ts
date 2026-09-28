import {z} from 'zod';
import type {BlokComponentDefinition} from './components';
import type {BlokInvokeOptions, BlokInvokeResult} from './types';

/**
 * `pure` functions are safe to evaluate while rendering: same args, same
 * result, no observable side effects. `effect` functions (a toast, a log, a
 * network call) are only legal in *action* position — a click handler — and are
 * refused in value position rather than being fired on every render.
 *
 * The default is `effect` on purpose: a function must opt in to being called
 * during render, so forgetting the annotation fails loudly instead of silently
 * re-firing a side effect on every store update.
 */
export type BlokFunctionPurity = 'pure' | 'effect';

/**
 * Declared result type. The backend does not enumerate catalog functions — a
 * `utilCall.operation` is a free-form string — so this metadata is what makes
 * the catalog self-describing for authoring tools and docs.
 */
export type BlokFunctionReturnType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'list'
  | 'object'
  | 'unknown'
  | 'void';

export type BlokFunctionDefinition = {
  name: string;
  /** Additional names this function answers to, for payload compatibility. */
  aliases: string[];
  description: string;
  schema: z.ZodTypeAny;
  returnType: BlokFunctionReturnType;
  purity: BlokFunctionPurity;
  /** True when the function takes an arbitrary number of positional values. */
  variadic: boolean;
  /** Reshapes raw call arguments before schema parsing. */
  normalizeArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
  /** Set when the function is kept only so older payloads keep working. */
  deprecated?: string;
};

type BlokFunctionApi<TSchema extends z.ZodTypeAny> = {
  name: string;
  schema: TSchema;
  description: string;
  returnType?: BlokFunctionReturnType;
  purity?: BlokFunctionPurity;
  aliases?: string[];
  deprecated?: string;
};

export const createBlokFunction = <TSchema extends z.ZodTypeAny>(
  api: BlokFunctionApi<TSchema>,
  execute: (args: z.infer<TSchema>) => unknown,
): BlokFunctionDefinition => ({
  name: api.name,
  aliases: api.aliases ?? [],
  description: api.description,
  schema: api.schema,
  returnType: api.returnType ?? 'unknown',
  purity: api.purity ?? 'effect',
  variadic: false,
  deprecated: api.deprecated,
  execute: execute as unknown as (args: Record<string, unknown>) => unknown,
});

const isNumericKey = (value: string): boolean => /^\d+$/.test(value);

const compareArgKeys = (leftKey: string, rightKey: string): number =>
  leftKey.localeCompare(rightKey, undefined, {numeric: true});

/**
 * Collects the positional values of a variadic call.
 *
 * Three shapes reach us, in precedence order: an explicit `values` array, bare
 * positional keys (`resolveActionArguments` keys unnamed arguments by index),
 * and finally any named arguments in key order.
 */
const collectVariadicValues = (args: Record<string, unknown>): unknown[] => {
  if (Array.isArray(args.values)) {
    return args.values;
  }

  const positionalEntries = Object.entries(args).filter(([key]) => isNumericKey(key));
  const entries = positionalEntries.length > 0 ? positionalEntries : Object.entries(args);

  return entries
    .sort(([leftKey], [rightKey]) => compareArgKeys(leftKey, rightKey))
    .map(([, value]) => value);
};

/**
 * Declares a function over an arbitrary number of values (`math.sum`,
 * `str.concat`, `logic.and`).
 *
 * These used to be written as `z.record(z.string(), z.unknown())` with each
 * body re-implementing the "sort the keys, take the values" dance and doing its
 * own coercion, which meant no argument validation at all. Here the item schema
 * validates every value and the collection order is defined in one place.
 */
export const createVariadicBlokFunction = <TItem extends z.ZodTypeAny>(
  api: {
    name: string;
    description: string;
    item: TItem;
    returnType?: BlokFunctionReturnType;
    purity?: BlokFunctionPurity;
    aliases?: string[];
    /** Minimum number of values the function needs to be meaningful. */
    min?: number;
    deprecated?: string;
  },
  execute: (values: Array<z.infer<TItem>>) => unknown,
): BlokFunctionDefinition => {
  const valuesSchema = z.object({
    values: z.array(api.item).min(api.min ?? 0),
  });

  return {
    name: api.name,
    aliases: api.aliases ?? [],
    description: api.description,
    schema: valuesSchema,
    returnType: api.returnType ?? 'unknown',
    purity: api.purity ?? 'effect',
    variadic: true,
    deprecated: api.deprecated,
    normalizeArgs: args => ({values: collectVariadicValues(args)}),
    execute: args => execute((args as {values: Array<z.infer<TItem>>}).values),
  };
};

export type BlokCatalog = {
  id: string;
  components: Map<string, BlokComponentDefinition>;
  /** Keyed by every name a function answers to, aliases included. */
  functions: Map<string, BlokFunctionDefinition>;
  /** Each function once, in registration order. */
  functionDefinitions: BlokFunctionDefinition[];
  invokeFunction: (
    name: string,
    args: Record<string, unknown>,
    options?: BlokInvokeOptions,
  ) => BlokInvokeResult;
};

const normalizeFunctionArgs = (
  schema: z.ZodTypeAny,
  args: Record<string, unknown>,
): Record<string, unknown> => {
  if (!(schema instanceof z.ZodObject)) {
    return args;
  }

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const schemaKeys = Object.keys(shape);
  if (schemaKeys.length === 0) {
    return args;
  }

  const positionalEntries = Object.entries(args)
    .filter(([key]) => isNumericKey(key))
    .sort(([leftKey], [rightKey]) => Number(leftKey) - Number(rightKey));

  if (positionalEntries.length === 0) {
    return args;
  }

  const normalizedArgs = {...args};
  let didMapPositionalEntry = false;

  positionalEntries.forEach(([numericKey, value], index) => {
    const schemaKey = schemaKeys[index];
    if (!schemaKey || normalizedArgs[schemaKey] !== undefined) {
      return;
    }

    normalizedArgs[schemaKey] = value;
    delete normalizedArgs[numericKey];
    didMapPositionalEntry = true;
  });

  return didMapPositionalEntry ? normalizedArgs : args;
};

const prepareFunctionArgs = (
  fn: BlokFunctionDefinition,
  args: Record<string, unknown>,
): Record<string, unknown> =>
  fn.normalizeArgs ? fn.normalizeArgs(args) : normalizeFunctionArgs(fn.schema, args);

/**
 * Statically checks the argument *keys* of a call. Values are only known at
 * render time, but the keys are in the payload, so a typo like `{a, bb}` for
 * `compare.gt` can be reported by the preflight instead of failing later.
 */
export const validateUtilCallArgumentKeys = (
  fn: BlokFunctionDefinition,
  argumentKeys: ReadonlyArray<string>,
): string[] => {
  if (fn.variadic || !(fn.schema instanceof z.ZodObject)) {
    return [];
  }

  const shape = fn.schema.shape as Record<string, z.ZodTypeAny>;
  const schemaKeys = Object.keys(shape);
  const positionalCount = argumentKeys.filter(isNumericKey).length;
  const namedKeys = argumentKeys.filter(key => !isNumericKey(key));
  const problems: string[] = [];

  if (positionalCount > schemaKeys.length) {
    problems.push(
      `"${fn.name}" takes ${schemaKeys.length} argument(s) but ${positionalCount} were given.`,
    );
  }

  namedKeys.forEach(key => {
    if (!schemaKeys.includes(key)) {
      problems.push(
        `Unknown argument "${key}" for "${fn.name}". Expected one of: ${schemaKeys.join(', ')}.`,
      );
    }
  });

  // Positional arguments fill the schema keys in order, so only the keys they
  // do not reach can still be reported as missing.
  schemaKeys.slice(positionalCount).forEach(key => {
    if (shape[key].safeParse(undefined).success) {
      return;
    }

    if (!namedKeys.includes(key)) {
      problems.push(`Missing required argument "${key}" for "${fn.name}".`);
    }
  });

  return problems;
};

export const createBlokCatalog = (
  id: string,
  components: ReadonlyArray<BlokComponentDefinition>,
  functions: ReadonlyArray<BlokFunctionDefinition> = [],
): BlokCatalog => {
  const componentMap = new Map(components.map(component => [component.name, component]));
  const functionMap = new Map<string, BlokFunctionDefinition>();

  functions.forEach(fn => {
    functionMap.set(fn.name, fn);
    fn.aliases.forEach(alias => functionMap.set(alias, fn));
  });

  return {
    id,
    components: componentMap,
    functions: functionMap,
    functionDefinitions: [...functions],
    // Never throws: a bad payload is a node-level error, not a crashed surface.
    invokeFunction: (name, args, options) => {
      const fn = functionMap.get(name);
      if (!fn) {
        return {ok: false, error: `Function not found in catalog ${id}: ${name}`};
      }

      if (options?.requirePure && fn.purity !== 'pure') {
        return {
          ok: false,
          error: `Function "${name}" has side effects and cannot be used to compute a prop value. Bind it to an action instead.`,
        };
      }

      const parsed = fn.schema.safeParse(prepareFunctionArgs(fn, args));
      if (!parsed.success) {
        const detail = parsed.error.issues
          .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; ');
        return {ok: false, error: `Invalid arguments for "${name}": ${detail}`};
      }

      try {
        return {ok: true, value: fn.execute(parsed.data as Record<string, unknown>)};
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : `Function "${name}" failed.`,
        };
      }
    },
  };
};

export const mergeBlokCatalogs = (
  id: string,
  catalogs: ReadonlyArray<BlokCatalog>,
): BlokCatalog =>
  createBlokCatalog(
    id,
    catalogs.flatMap(catalog => [...catalog.components.values()]),
    catalogs.flatMap(catalog => catalog.functionDefinitions),
  );

export type BlokCatalogManifest = {
  id: string;
  components: Array<{name: string; props: string[]}>;
  functions: Array<{
    name: string;
    aliases: string[];
    description: string;
    returnType: BlokFunctionReturnType;
    purity: BlokFunctionPurity;
    variadic: boolean;
    args: string[] | null;
    deprecated?: string;
  }>;
};

/**
 * Serializable description of what a catalog offers — the shape the published
 * `catalogs/*.json` document carries, and what an authoring UI needs to offer
 * completion over component and function names.
 */
export const describeBlokCatalog = (catalog: BlokCatalog): BlokCatalogManifest => ({
  id: catalog.id,
  components: [...catalog.components.values()]
    .map(component => ({
      name: component.name,
      props: Object.keys(component.schema.shape).sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
  functions: catalog.functionDefinitions
    .map(fn => ({
      name: fn.name,
      aliases: fn.aliases,
      description: fn.description,
      returnType: fn.returnType,
      purity: fn.purity,
      variadic: fn.variadic,
      args:
        fn.variadic || !(fn.schema instanceof z.ZodObject)
          ? null
          : Object.keys(fn.schema.shape as Record<string, z.ZodTypeAny>),
      ...(fn.deprecated ? {deprecated: fn.deprecated} : {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
});

export {collectVariadicValues, normalizeFunctionArgs, prepareFunctionArgs};
