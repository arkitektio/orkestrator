import {z} from 'zod';
import {createBlokFunction} from '../runtime';
import {numericSchema} from './argumentSchemas';

/**
 * Equality across the loose values a payload carries.
 *
 * Numbers and numeric strings compare numerically (`"3"` equals `3`, because a
 * data-model value and a literal in the payload routinely disagree on type);
 * everything else falls back to strict equality, with structural comparison for
 * arrays and objects.
 */
const looseEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  const leftNumber = typeof left === 'string' ? Number(left) : left;
  const rightNumber = typeof right === 'string' ? Number(right) : right;

  if (
    typeof leftNumber === 'number' &&
    typeof rightNumber === 'number' &&
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber)
  ) {
    return leftNumber === rightNumber;
  }

  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return left === right;
};

const equalitySchema = z.object({a: z.unknown(), b: z.unknown()});
const orderingSchema = z.object({a: numericSchema, b: numericSchema});

const createOrderingFunction = (
  name: string,
  alias: string,
  description: string,
  compare: (a: number, b: number) => boolean,
) =>
  createBlokFunction(
    {
      name,
      aliases: [alias],
      description,
      returnType: 'boolean',
      purity: 'pure',
      schema: orderingSchema,
    },
    args => compare(args.a, args.b),
  );

const eqFunction = createBlokFunction(
  {
    name: 'compare.eq',
    aliases: ['eq'],
    description: 'True when both values are equal.',
    returnType: 'boolean',
    purity: 'pure',
    schema: equalitySchema,
  },
  args => looseEquals(args.a, args.b),
);

const neFunction = createBlokFunction(
  {
    name: 'compare.ne',
    aliases: ['ne'],
    description: 'True when the values differ.',
    returnType: 'boolean',
    purity: 'pure',
    schema: equalitySchema,
  },
  args => !looseEquals(args.a, args.b),
);

const betweenFunction = createBlokFunction(
  {
    name: 'compare.between',
    description: 'True when a value falls within an inclusive range.',
    returnType: 'boolean',
    purity: 'pure',
    schema: z.object({value: numericSchema, min: numericSchema, max: numericSchema}),
  },
  args => args.value >= args.min && args.value <= args.max,
);

export const compareFunctions = [
  eqFunction,
  neFunction,
  createOrderingFunction('compare.gt', 'gt', 'True when a is greater than b.', (a, b) => a > b),
  createOrderingFunction(
    'compare.gte',
    'gte',
    'True when a is greater than or equal to b.',
    (a, b) => a >= b,
  ),
  createOrderingFunction('compare.lt', 'lt', 'True when a is less than b.', (a, b) => a < b),
  createOrderingFunction(
    'compare.lte',
    'lte',
    'True when a is less than or equal to b.',
    (a, b) => a <= b,
  ),
  betweenFunction,
];

export {looseEquals};
