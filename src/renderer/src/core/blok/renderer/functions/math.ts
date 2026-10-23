import {z} from 'zod';
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {integerSchema, numericSchema} from './argumentSchemas';

const multiplyFunction = createVariadicBlokFunction(
  {
    name: 'math.multiply',
    description: 'Multiplies every value together.',
    returnType: 'number',
    purity: 'pure',
    item: numericSchema,
    min: 1,
  },
  values => values.reduce((product, factor) => product * factor, 1),
);

const roundFunction = createBlokFunction(
  {
    name: 'math.round',
    description: 'Rounds a number to the given number of decimal places.',
    returnType: 'number',
    purity: 'pure',
    schema: z.object({
      value: numericSchema,
      precision: integerSchema.optional(),
    }),
  },
  args => {
    const factor = 10 ** (args.precision ?? 0);
    return Math.round(args.value * factor) / factor;
  },
);

const createUnaryFunction = (
  name: string,
  description: string,
  apply: (value: number) => number,
) =>
  createBlokFunction(
    {
      name,
      description,
      returnType: 'number',
      purity: 'pure',
      schema: z.object({value: numericSchema}),
    },
    args => apply(args.value),
  );

const createReductionFunction = (
  name: string,
  description: string,
  reduce: (values: number[]) => number,
) =>
  createVariadicBlokFunction(
    {
      name,
      description,
      returnType: 'number',
      purity: 'pure',
      item: numericSchema,
      min: 1,
    },
    reduce,
  );

const clampFunction = createBlokFunction(
  {
    name: 'math.clamp',
    description: 'Constrains a number to an inclusive range.',
    returnType: 'number',
    purity: 'pure',
    schema: z.object({value: numericSchema, min: numericSchema, max: numericSchema}),
  },
  args => Math.min(Math.max(args.value, args.min), args.max),
);

export const mathFunctions = [
  roundFunction,
  createUnaryFunction('math.floor', 'Rounds a number down.', Math.floor),
  createUnaryFunction('math.ceil', 'Rounds a number up.', Math.ceil),
  createUnaryFunction('math.abs', 'Absolute value of a number.', Math.abs),
  clampFunction,
];

/** Variadic: not base operations, whose positional order is their parameter order. */
export const mathVariadicFunctions = [
  multiplyFunction,
  createReductionFunction('math.sum', 'Adds every value together.', values =>
    values.reduce((total, value) => total + value, 0),
  ),
  createReductionFunction('math.min', 'The smallest value.', values => Math.min(...values)),
  createReductionFunction('math.max', 'The largest value.', values => Math.max(...values)),
];
