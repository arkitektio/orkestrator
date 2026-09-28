import {z} from 'zod';
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {truthySchema} from './argumentSchemas';

const ifFunction = createBlokFunction(
  {
    name: 'logic.if',
    aliases: ['if'],
    description: 'Picks one of two values based on a condition.',
    returnType: 'unknown',
    purity: 'pure',
    schema: z.object({
      condition: truthySchema,
      trueValue: z.unknown(),
      falseValue: z.unknown(),
    }),
  },
  // Truthiness rather than a strict boolean: a condition bound to a count or a
  // string is the common case in a payload.
  args => (args.condition ? args.trueValue : args.falseValue),
);

const andFunction = createVariadicBlokFunction(
  {
    name: 'logic.and',
    description: 'True when every value is truthy.',
    returnType: 'boolean',
    purity: 'pure',
    item: truthySchema,
    min: 1,
  },
  values => values.every(Boolean),
);

const orFunction = createVariadicBlokFunction(
  {
    name: 'logic.or',
    description: 'True when at least one value is truthy.',
    returnType: 'boolean',
    purity: 'pure',
    item: truthySchema,
    min: 1,
  },
  values => values.some(Boolean),
);

const notFunction = createBlokFunction(
  {
    name: 'logic.not',
    description: 'Negates a value.',
    returnType: 'boolean',
    purity: 'pure',
    schema: z.object({value: truthySchema}),
  },
  args => !args.value,
);

const coalesceFunction = createVariadicBlokFunction(
  {
    name: 'logic.coalesce',
    aliases: ['coalesce'],
    description: 'The first value that is neither null nor undefined.',
    returnType: 'unknown',
    purity: 'pure',
    item: z.unknown(),
    min: 1,
  },
  // Deliberately nullish rather than falsy: `0` and `""` are real values a
  // payload wants to display.
  values => values.find(value => value != null),
);

export const logicFunctions = [
  ifFunction,
  andFunction,
  orFunction,
  notFunction,
  coalesceFunction,
];
