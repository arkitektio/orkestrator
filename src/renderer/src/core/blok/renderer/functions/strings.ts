import {z} from 'zod';
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {integerSchema, textSchema} from './argumentSchemas';

const concatFunction = createVariadicBlokFunction(
  {
    name: 'str.concat',
    description: 'Joins every value into one string.',
    returnType: 'string',
    purity: 'pure',
    item: textSchema,
  },
  values => values.join(''),
);

const joinFunction = createVariadicBlokFunction(
  {
    name: 'str.joinWith',
    description: 'Joins values, taking the first value as the separator.',
    returnType: 'string',
    purity: 'pure',
    item: textSchema,
    min: 1,
  },
  ([separator, ...values]) => values.join(separator),
);

/**
 * `str.template` fills `{placeholders}` from its remaining named arguments, so
 * a payload writes one readable string instead of nesting five `str.concat`
 * calls. An unknown placeholder is left verbatim rather than blanked, which
 * makes the mistake visible in the UI.
 */
const templateFunction = createBlokFunction(
  {
    name: 'str.template',
    description: 'Fills {placeholders} in a template from the named arguments.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({template: z.string()}).catchall(z.unknown()),
  },
  args => {
    const {template, ...values} = args;

    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      const value = (values as Record<string, unknown>)[key];
      return value == null ? match : String(value);
    });
  },
);

const createUnaryStringFunction = (
  name: string,
  description: string,
  apply: (value: string) => string,
  aliases: string[] = [],
) =>
  createBlokFunction(
    {
      name,
      aliases,
      description,
      returnType: 'string',
      purity: 'pure',
      schema: z.object({value: textSchema}),
    },
    args => apply(args.value),
  );

const sliceFunction = createBlokFunction(
  {
    name: 'str.slice',
    description: 'Extracts part of a string by character index.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({
      value: textSchema,
      start: integerSchema.optional(),
      end: integerSchema.optional(),
    }),
  },
  args => args.value.slice(args.start ?? 0, args.end),
);

const truncateFunction = createBlokFunction(
  {
    name: 'str.truncate',
    description: 'Shortens a string to a maximum length, adding an ellipsis.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({
      value: textSchema,
      length: integerSchema,
      suffix: textSchema.optional(),
    }),
  },
  args => {
    if (args.value.length <= args.length) {
      return args.value;
    }

    const suffix = args.suffix ?? '…';
    return `${args.value.slice(0, Math.max(0, args.length - suffix.length))}${suffix}`;
  },
);

const replaceFunction = createBlokFunction(
  {
    name: 'str.replace',
    description: 'Replaces every occurrence of a substring.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: textSchema, search: textSchema, replacement: textSchema}),
  },
  args => args.value.split(args.search).join(args.replacement),
);

const splitFunction = createBlokFunction(
  {
    name: 'str.split',
    description: 'Splits a string into a list on a separator.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({value: textSchema, separator: textSchema.optional()}),
  },
  args => args.value.split(args.separator ?? ','),
);

const defaultFunction = createBlokFunction(
  {
    name: 'str.default',
    description: 'Falls back to another string when the value is empty.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: z.unknown(), fallback: textSchema}),
  },
  args => {
    const value = args.value;
    if (value == null) {
      return args.fallback;
    }

    const text = String(value);
    return text.trim() === '' ? args.fallback : text;
  },
);

/** Variadic or open-keyword: not base operations, whose positional order is their parameter order. */
export const stringVariadicFunctions = [concatFunction, joinFunction, templateFunction];

export const stringFunctions = [
  createUnaryStringFunction('str.upper', 'Uppercases a string.', value => value.toUpperCase()),
  createUnaryStringFunction('str.lower', 'Lowercases a string.', value => value.toLowerCase()),
  createUnaryStringFunction('str.trim', 'Removes surrounding whitespace.', value => value.trim()),
  createUnaryStringFunction('str.capitalize', 'Uppercases the first character.', value =>
    value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`,
  ),
  sliceFunction,
  truncateFunction,
  replaceFunction,
  splitFunction,
  defaultFunction,
];
