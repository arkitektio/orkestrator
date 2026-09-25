import {z} from 'zod';
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {integerSchema, numericSchema} from './argumentSchemas';

const binarySchema = z.object({a: numericSchema, b: numericSchema});

const addFunction = createBlokFunction(
  {
    name: 'math.add',
    description: 'Adds two numbers.',
    returnType: 'number',
    purity: 'pure',
    schema: binarySchema,
  },
  args => args.a + args.b,
);

const subtractFunction = createBlokFunction(
  {
    name: 'math.subtract',
    description: 'Subtracts b from a.',
    returnType: 'number',
    purity: 'pure',
    schema: binarySchema,
  },
  args => args.a - args.b,
);

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

const divideFunction = createBlokFunction(
  {
    name: 'math.divide',
    description: 'Divides a by b.',
    returnType: 'number',
    purity: 'pure',
    schema: binarySchema,
  },
  args => {
    // Reported as a call failure rather than rendering `Infinity` or `NaN`.
    if (args.b === 0) {
      throw new Error('Division by zero.');
    }

    return args.a / args.b;
  },
);

const moduloFunction = createBlokFunction(
  {
    name: 'math.modulo',
    description: 'Remainder of a divided by b.',
    returnType: 'number',
    purity: 'pure',
    schema: binarySchema,
  },
  args => {
    if (args.b === 0) {
      throw new Error('Modulo by zero.');
    }

    return args.a % args.b;
  },
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
  addFunction,
  subtractFunction,
  multiplyFunction,
  divideFunction,
  moduloFunction,
  roundFunction,
  createUnaryFunction('math.floor', 'Rounds a number down.', Math.floor),
  createUnaryFunction('math.ceil', 'Rounds a number up.', Math.ceil),
  createUnaryFunction('math.abs', 'Absolute value of a number.', Math.abs),
  createUnaryFunction('math.negate', 'Flips the sign of a number.', value => -value),
  createReductionFunction('math.sum', 'Adds every value together.', values =>
    values.reduce((total, value) => total + value, 0),
  ),
  createReductionFunction('math.min', 'The smallest value.', values => Math.min(...values)),
  createReductionFunction('math.max', 'The largest value.', values => Math.max(...values)),
  clampFunction,
];
