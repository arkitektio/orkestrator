import {z} from 'zod';
import {createBlokFunction, getValueAtPath} from '../runtime';
import {recordSchema} from './argumentSchemas';

/**
 * `obj.get` reads a path *inside a value the payload already has* — a
 * `foreach` item, a util-call result — which a `dynamic_value` path cannot do,
 * since those are always resolved against the data-model root.
 */
const getFunction = createBlokFunction(
  {
    name: 'obj.get',
    aliases: ['get'],
    description: 'Reads a nested path out of a value.',
    returnType: 'unknown',
    purity: 'pure',
    schema: z.object({value: z.unknown(), path: z.string(), fallback: z.unknown().optional()}),
  },
  args => {
    const resolved = getValueAtPath(args.value, args.path);
    return resolved === undefined ? args.fallback : resolved;
  },
);

const hasFunction = createBlokFunction(
  {
    name: 'obj.has',
    description: 'True when a nested path resolves to a value.',
    returnType: 'boolean',
    purity: 'pure',
    schema: z.object({value: z.unknown(), path: z.string()}),
  },
  args => getValueAtPath(args.value, args.path) !== undefined,
);

const keysFunction = createBlokFunction(
  {
    name: 'obj.keys',
    description: 'The keys of an object.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({value: recordSchema}),
  },
  args => Object.keys(args.value),
);

const valuesFunction = createBlokFunction(
  {
    name: 'obj.values',
    description: 'The values of an object.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({value: recordSchema}),
  },
  args => Object.values(args.value),
);

const entriesFunction = createBlokFunction(
  {
    name: 'obj.entries',
    description: 'An object as a list of {key, value} records, ready for foreach.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({value: recordSchema}),
  },
  args => Object.entries(args.value).map(([key, value]) => ({key, value})),
);

export const objectFunctions = [
  getFunction,
  hasFunction,
  keysFunction,
  valuesFunction,
  entriesFunction,
];
