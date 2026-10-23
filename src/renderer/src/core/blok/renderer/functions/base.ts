import {z} from 'zod';
import {createBlokFunction, type BlokFunctionDefinition, type BlokFunctionReturnType} from '../runtime';

/**
 * The operations of the server's base catalog (`base@1`: rekuest
 * `rekuest_core/catalogs/base_v1.json`, copied byte for byte into arkitekt-spec),
 * under their own names and with their own argument keys, so a blok the server
 * accepts evaluates here exactly as written: `@utils.if(condition=x, then=a,
 * otherwise=b)`, `@utils.sub(a, b)`.
 *
 * The semantics are the catalog's, not this client's looser ones next door:
 * equality is deep JSON equality, a comparison of non-numbers is false, and
 * arithmetic on non-numbers (or a zero divisor) is null. `base.test.ts` checks
 * that every operation of the catalog is here.
 */

const BASE_RETURNS: Record<string, BlokFunctionReturnType> = {
  BOOL: 'boolean',
  FLOAT: 'number',
  INT: 'number',
  ANY: 'unknown',
};

const operation = (
  name: string,
  returns: keyof typeof BASE_RETURNS,
  description: string,
  keys: readonly string[],
  execute: (args: Record<string, unknown>) => unknown,
): BlokFunctionDefinition =>
  createBlokFunction(
    {
      name,
      description,
      returnType: BASE_RETURNS[returns],
      purity: 'pure',
      // Missing reads as null, as the catalog says; each operation decides what that means.
      schema: z.object(Object.fromEntries(keys.map(key => [key, z.unknown().optional()]))),
    },
    args => execute(args as Record<string, unknown>),
  );

/** A number, or null for anything that is not one (a numeric string counts). */
const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** JSON text with object keys sorted, so equal values compare equal. */
const canonical = (value: unknown): string =>
  JSON.stringify(value ?? null, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : inner,
  );

const deepEquals = (a: unknown, b: unknown) => canonical(a) === canonical(b);

const lengthOf = (value: unknown): number | null => {
  if (value == null) return 0;
  if (typeof value === 'string' || Array.isArray(value)) return value.length;
  if (typeof value === 'object') return Object.keys(value as object).length;
  return null;
};

const ordering = (compare: (a: number, b: number) => boolean) => (args: Record<string, unknown>) => {
  const a = toNumber(args.a);
  const b = toNumber(args.b);
  return a !== null && b !== null && compare(a, b);
};

const arithmetic = (compute: (a: number, b: number) => number | null) => (args: Record<string, unknown>) => {
  const a = toNumber(args.a);
  const b = toNumber(args.b);
  if (a === null || b === null) return null;
  const result = compute(a, b);
  return result === null || !Number.isFinite(result) ? null : result;
};

/** RFC 6901: `/a/0/b`, `~1` for `/` and `~0` for `~`. The empty pointer is the value itself. */
const readPointer = (value: unknown, pointer: string): unknown => {
  if (pointer === '') return value;
  const tokens = (pointer.startsWith('/') ? pointer.slice(1) : pointer)
    .split('/')
    .map(token => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = value;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) return null;
      current = current[Number(token)];
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[token];
    } else {
      return null;
    }
    if (current === undefined) return null;
  }
  return current ?? null;
};

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

export const baseFunctions: BlokFunctionDefinition[] = [
  operation('eq', 'BOOL', 'True if a equals b (deep JSON equality).', ['a', 'b'], args => deepEquals(args.a, args.b)),
  operation('ne', 'BOOL', 'True if a does not equal b (deep JSON equality).', ['a', 'b'], args => !deepEquals(args.a, args.b)),
  operation('gt', 'BOOL', 'True if a > b. Non-numbers compare false.', ['a', 'b'], ordering((a, b) => a > b)),
  operation('gte', 'BOOL', 'True if a >= b. Non-numbers compare false.', ['a', 'b'], ordering((a, b) => a >= b)),
  operation('lt', 'BOOL', 'True if a < b. Non-numbers compare false.', ['a', 'b'], ordering((a, b) => a < b)),
  operation('lte', 'BOOL', 'True if a <= b. Non-numbers compare false.', ['a', 'b'], ordering((a, b) => a <= b)),
  operation(
    'between',
    'BOOL',
    'True if min <= value <= max (inclusive). Non-numbers compare false.',
    ['value', 'min', 'max'],
    args => {
      const [value, min, max] = [toNumber(args.value), toNumber(args.min), toNumber(args.max)];
      return value !== null && min !== null && max !== null && min <= value && value <= max;
    },
  ),
  operation('and', 'BOOL', 'Logical conjunction of two booleans. Nest calls for more operands.', ['a', 'b'], args => args.a === true && args.b === true),
  operation('or', 'BOOL', 'Logical disjunction of two booleans. Nest calls for more operands.', ['a', 'b'], args => args.a === true || args.b === true),
  operation('not', 'BOOL', 'Logical negation.', ['a'], args => args.a !== true),
  operation(
    'if',
    'ANY',
    'Returns then if condition is true, otherwise otherwise.',
    ['condition', 'then', 'otherwise'],
    args => (args.condition === true ? args.then : args.otherwise) ?? null,
  ),
  operation('is_null', 'BOOL', 'True if a is null or missing.', ['a'], args => args.a == null),
  operation('is_set', 'BOOL', 'True if a is neither null nor missing.', ['a'], args => args.a != null),
  operation('len', 'INT', 'Length of a string, list or dict. Null counts as 0.', ['a'], args => lengthOf(args.a)),
  operation(
    'len_between',
    'BOOL',
    'True if min <= len(value) <= max (inclusive). Omit max for no upper bound.',
    ['value', 'min', 'max'],
    args => {
      const length = lengthOf(args.value);
      const min = toNumber(args.min);
      const max = args.max == null ? null : toNumber(args.max);
      return length !== null && min !== null && length >= min && (max === null || length <= max);
    },
  ),
  operation('is_empty', 'BOOL', 'True if a is null or has length 0.', ['a'], args => lengthOf(args.a) === 0),
  operation(
    'contains',
    'BOOL',
    'True if haystack contains needle: substring for strings, membership for lists, key presence for dicts.',
    ['haystack', 'needle'],
    args => {
      const {haystack, needle} = args;
      if (typeof haystack === 'string') return typeof needle === 'string' && haystack.includes(needle);
      if (Array.isArray(haystack)) return haystack.some(item => deepEquals(item, needle));
      if (haystack && typeof haystack === 'object') return typeof needle === 'string' && needle in haystack;
      return false;
    },
  ),
  operation(
    'in',
    'BOOL',
    'True if value is a member of options.',
    ['value', 'options'],
    args => Array.isArray(args.options) && args.options.some(option => deepEquals(option, args.value)),
  ),
  operation(
    'matches',
    'BOOL',
    'True if the whole of value matches the regular expression pattern.',
    ['value', 'pattern'],
    args => {
      const [value, pattern] = [text(args.value), text(args.pattern)];
      if (value === null || pattern === null) return false;
      try {
        return new RegExp(`^(?:${pattern})$`, 'u').test(value);
      } catch {
        return false;
      }
    },
  ),
  operation('starts_with', 'BOOL', 'True if value starts with prefix.', ['value', 'prefix'], args => {
    const [value, prefix] = [text(args.value), text(args.prefix)];
    return value !== null && prefix !== null && value.startsWith(prefix);
  }),
  operation('ends_with', 'BOOL', 'True if value ends with suffix.', ['value', 'suffix'], args => {
    const [value, suffix] = [text(args.value), text(args.suffix)];
    return value !== null && suffix !== null && value.endsWith(suffix);
  }),
  operation(
    'get',
    'ANY',
    'Reads path (a JSON pointer) out of value; null when the path does not resolve.',
    ['value', 'path'],
    args => (typeof args.path === 'string' ? readPointer(args.value, args.path) : null),
  ),
  operation('coalesce', 'ANY', 'The first of a, b that is not null.', ['a', 'b'], args => args.a ?? args.b ?? null),
  operation('add', 'FLOAT', 'a + b. Non-numbers yield null.', ['a', 'b'], arithmetic((a, b) => a + b)),
  operation('sub', 'FLOAT', 'a - b. Non-numbers yield null.', ['a', 'b'], arithmetic((a, b) => a - b)),
  operation('mul', 'FLOAT', 'a * b. Non-numbers yield null.', ['a', 'b'], arithmetic((a, b) => a * b)),
  operation(
    'div',
    'FLOAT',
    'a / b (float division). Non-numbers and division by zero yield null.',
    ['a', 'b'],
    arithmetic((a, b) => (b === 0 ? null : a / b)),
  ),
  operation(
    'mod',
    'FLOAT',
    'a modulo b, with the sign of the divisor (Python semantics). Non-numbers and a zero divisor yield null.',
    ['a', 'b'],
    arithmetic((a, b) => (b === 0 ? null : ((a % b) + b) % b)),
  ),
  operation('neg', 'FLOAT', '-a. Non-numbers yield null.', ['a'], args => {
    const a = toNumber(args.a);
    return a === null ? null : -a;
  }),
];
