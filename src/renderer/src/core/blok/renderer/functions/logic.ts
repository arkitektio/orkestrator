import {z} from 'zod';
import {createVariadicBlokFunction} from '../runtime';
import {truthySchema} from './argumentSchemas';

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

const coalesceFunction = createVariadicBlokFunction(
  {
    name: 'logic.coalesce',
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

/** Variadic: not base operations, whose positional order is their parameter order. */
export const logicVariadicFunctions = [
  andFunction,
  orFunction,
  coalesceFunction,
];
