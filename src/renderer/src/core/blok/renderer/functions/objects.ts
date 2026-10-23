import {z} from 'zod';
import {createBlokFunction, getValueAtPath} from '../runtime';
import {recordSchema} from './argumentSchemas';

/**
 * Reading a path inside a value is the base catalog's `get` (a JSON pointer);
 * these are the rest of what a blok asks of an object.
 */
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
  hasFunction,
  keysFunction,
  valuesFunction,
  entriesFunction,
];
