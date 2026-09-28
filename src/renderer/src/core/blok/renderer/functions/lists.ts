import {z} from 'zod';
import {createBlokFunction, getValueAtPath} from '../runtime';
import {integerSchema, listSchema, numericSchema, textSchema} from './argumentSchemas';

const listOnly = z.object({value: listSchema});

const lengthFunction = createBlokFunction(
  {
    name: 'list.length',
    aliases: ['list.count'],
    description: 'Number of items in a list.',
    returnType: 'number',
    purity: 'pure',
    schema: listOnly,
  },
  args => args.value.length,
);

const isEmptyFunction = createBlokFunction(
  {
    name: 'list.isEmpty',
    description: 'True when a list has no items.',
    returnType: 'boolean',
    purity: 'pure',
    schema: listOnly,
  },
  args => args.value.length === 0,
);

const firstFunction = createBlokFunction(
  {
    name: 'list.first',
    description: 'The first item of a list.',
    returnType: 'unknown',
    purity: 'pure',
    schema: listOnly,
  },
  args => args.value[0],
);

const lastFunction = createBlokFunction(
  {
    name: 'list.last',
    description: 'The last item of a list.',
    returnType: 'unknown',
    purity: 'pure',
    schema: listOnly,
  },
  args => args.value[args.value.length - 1],
);

const atFunction = createBlokFunction(
  {
    name: 'list.at',
    description: 'The item at an index. Negative indexes count from the end.',
    returnType: 'unknown',
    purity: 'pure',
    schema: z.object({value: listSchema, index: integerSchema}),
  },
  args => args.value.at(args.index),
);

const includesFunction = createBlokFunction(
  {
    name: 'list.includes',
    description: 'True when a list contains a value.',
    returnType: 'boolean',
    purity: 'pure',
    schema: z.object({value: listSchema, search: z.unknown()}),
  },
  args => args.value.includes(args.search),
);

const joinFunction = createBlokFunction(
  {
    name: 'list.join',
    description: 'Joins a list into a string.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: listSchema, separator: textSchema.optional()}),
  },
  args => args.value.map(item => (item == null ? '' : String(item))).join(args.separator ?? ', '),
);

const sliceFunction = createBlokFunction(
  {
    name: 'list.slice',
    description: 'Takes a section of a list.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({
      value: listSchema,
      start: integerSchema.optional(),
      end: integerSchema.optional(),
    }),
  },
  args => args.value.slice(args.start ?? 0, args.end),
);

const reverseFunction = createBlokFunction(
  {
    name: 'list.reverse',
    description: 'Reverses a list.',
    returnType: 'list',
    purity: 'pure',
    schema: listOnly,
  },
  // Copied, never reversed in place: the input is the live data model.
  args => [...args.value].reverse(),
);

const uniqueFunction = createBlokFunction(
  {
    name: 'list.unique',
    description: 'Removes duplicate items from a list.',
    returnType: 'list',
    purity: 'pure',
    schema: listOnly,
  },
  args => [...new Set(args.value)],
);

const compactFunction = createBlokFunction(
  {
    name: 'list.compact',
    description: 'Removes null and undefined items from a list.',
    returnType: 'list',
    purity: 'pure',
    schema: listOnly,
  },
  args => args.value.filter(item => item != null),
);

/**
 * `list.pluck` is how a payload turns a list of records into a list of one
 * field — the closest thing to a `map` that a lambda-free DSL can offer.
 */
const pluckFunction = createBlokFunction(
  {
    name: 'list.pluck',
    description: 'Reads the same path out of every item in a list.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({value: listSchema, path: z.string()}),
  },
  args => args.value.map(item => getValueAtPath(item, args.path)),
);

const sumFunction = createBlokFunction(
  {
    name: 'list.sum',
    description: 'Adds up the numbers in a list.',
    returnType: 'number',
    purity: 'pure',
    schema: z.object({value: z.array(numericSchema)}),
  },
  args => args.value.reduce((total, value) => total + value, 0),
);

const sortFunction = createBlokFunction(
  {
    name: 'list.sort',
    description: 'Sorts a list, optionally by a path on each item.',
    returnType: 'list',
    purity: 'pure',
    schema: z.object({
      value: listSchema,
      path: z.string().optional(),
      descending: z.boolean().optional(),
    }),
  },
  args => {
    const readKey = (item: unknown) => (args.path ? getValueAtPath(item, args.path) : item);
    const direction = args.descending ? -1 : 1;

    return [...args.value].sort((left, right) => {
      const leftKey = readKey(left);
      const rightKey = readKey(right);

      if (typeof leftKey === 'number' && typeof rightKey === 'number') {
        return (leftKey - rightKey) * direction;
      }

      return String(leftKey).localeCompare(String(rightKey), undefined, {numeric: true}) * direction;
    });
  },
);

export const listFunctions = [
  lengthFunction,
  isEmptyFunction,
  firstFunction,
  lastFunction,
  atFunction,
  includesFunction,
  joinFunction,
  sliceFunction,
  reverseFunction,
  uniqueFunction,
  compactFunction,
  pluckFunction,
  sumFunction,
  sortFunction,
];
