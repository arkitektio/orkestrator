import {z} from 'zod';
import {createBlokFunction} from '../runtime';

const anyValue = z.object({value: z.unknown()});

const isNilFunction = createBlokFunction(
  {
    name: 'type.isNil',
    description: 'True when a value is null or undefined.',
    returnType: 'boolean',
    purity: 'pure',
    schema: anyValue,
  },
  args => args.value == null,
);

const isEmptyFunction = createBlokFunction(
  {
    name: 'type.isEmpty',
    description: 'True for null, undefined, an empty string, list, or object.',
    returnType: 'boolean',
    purity: 'pure',
    schema: anyValue,
  },
  args => {
    const value = args.value;

    if (value == null) {
      return true;
    }

    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }

    return false;
  },
);

const typeOfFunction = createBlokFunction(
  {
    name: 'type.of',
    description: 'Names the type of a value: null, list, object, string, number, or boolean.',
    returnType: 'string',
    purity: 'pure',
    schema: anyValue,
  },
  args => {
    if (args.value === null || args.value === undefined) {
      return 'null';
    }

    if (Array.isArray(args.value)) {
      return 'list';
    }

    return typeof args.value;
  },
);

const toStringFunction = createBlokFunction(
  {
    name: 'type.toString',
    description: 'Converts any value to a string.',
    returnType: 'string',
    purity: 'pure',
    schema: anyValue,
  },
  args => {
    if (args.value == null) {
      return '';
    }

    return typeof args.value === 'object'
      ? JSON.stringify(args.value)
      : String(args.value);
  },
);

const toNumberFunction = createBlokFunction(
  {
    name: 'type.toNumber',
    description: 'Converts a value to a number, or falls back when it cannot.',
    returnType: 'number',
    purity: 'pure',
    schema: z.object({value: z.unknown(), fallback: z.number().optional()}),
  },
  args => {
    const parsed = Number(
      typeof args.value === 'string' ? args.value.trim() : (args.value as number),
    );

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    if (args.fallback !== undefined) {
      return args.fallback;
    }

    throw new Error(`Cannot convert ${JSON.stringify(args.value)} to a number.`);
  },
);

const toBooleanFunction = createBlokFunction(
  {
    name: 'type.toBoolean',
    description: 'Converts a value to a boolean, treating "false" and "0" as false.',
    returnType: 'boolean',
    purity: 'pure',
    schema: anyValue,
  },
  args => {
    // A checkbox state that round-tripped through JSON arrives as the *string*
    // "false", which is truthy in JavaScript and the wrong answer here.
    if (typeof args.value === 'string') {
      const normalized = args.value.trim().toLowerCase();
      if (normalized === 'false' || normalized === '0' || normalized === '') {
        return false;
      }
      return true;
    }

    return Boolean(args.value);
  },
);

export const coerceFunctions = [
  isNilFunction,
  isEmptyFunction,
  typeOfFunction,
  toStringFunction,
  toNumberFunction,
  toBooleanFunction,
];
