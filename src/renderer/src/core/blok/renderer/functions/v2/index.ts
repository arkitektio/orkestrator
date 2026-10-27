import {loadVocabulary, type VocabFunction} from '../../../spec/vocabulary';
import type {BlokAsyncStatus} from '../../runtime/status';

/**
 * The blok language v2 function library: every pure function the vocabulary
 * (`core/blok/spec/vocabulary.json`, `functions`) declares, with its null
 * table. The effects (`ui.copy`, `task.answer`, `query.refetch`,
 * `query.fetch_more`) are the runtime's: only a callback runs them. No function
 * reads the wall clock; relative time is the `<Time>` component's.
 *
 * Separate from the v1 modules beside it on purpose: port validators and
 * effects stay on base@1, which feeds `definition_hash`.
 */

export type BlokV2FunctionContext = {
  /** The viewer's locale for fmt.*; undefined = default. */
  locale?: string;
  /** For sees_status functions: the status of each argument, by param key. */
  argumentStatus?: Readonly<Record<string, BlokAsyncStatus>>;
};

export type BlokV2Function = {
  name: string;
  spec: VocabFunction;
  call: (args: Readonly<Record<string, unknown>>, context: BlokV2FunctionContext) => unknown;
};

export type BlokV2InvokeResult = {ok: true; value: unknown} | {ok: false; error: string};

type Args = Readonly<Record<string, unknown>>;
type Impl = (args: Args, context: BlokV2FunctionContext) => unknown;

/** Raised inside an implementation for a wrong argument; turned into an error result. */
class ArgumentError extends Error {}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const isNull = (value: unknown): value is null | undefined => value === null || value === undefined;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** JavaScript truthiness, over JSON values. */
const truthy = (value: unknown): boolean => Boolean(value);

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (isNull(a) || isNull(b)) return isNull(a) && isNull(b);
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a).filter(key => a[key] !== undefined);
    const other = Object.keys(b).filter(key => b[key] !== undefined);
    return keys.length === other.length && keys.every(key => key in b && deepEqual(a[key], b[key]));
  }
  return false;
};

/** A number argument, or null (null, absent, not a finite number). */
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** An integer argument, or `fallback` when left out; a non-number is an argument error. */
const int = (value: unknown, fallback: number, key: string): number => {
  if (isNull(value)) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ArgumentError(`${key} is not a number`);
  return Math.trunc(value);
};

/** A string argument, or null; numbers and booleans read as their string form. */
const str = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

/** An optional string argument; `fallback` when left out. */
const optStr = (value: unknown, fallback: string, key: string): string => {
  if (isNull(value)) return fallback;
  const text = str(value);
  if (text === null) throw new ArgumentError(`${key} is not a string`);
  return text;
};

const list = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);
const dict = (value: unknown): Record<string, unknown> | null => (isObject(value) ? value : null);

/** A value's string form, as text and templates show it: null is empty, objects are JSON. */
const toText = (value: unknown): string => {
  if (isNull(value)) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
};

const compare = (a: unknown, b: unknown): number | null => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  return null;
};

const ordered = (a: unknown, b: unknown, test: (difference: number) => boolean): boolean => {
  const difference = compare(a, b);
  return difference !== null && test(difference);
};

const timeOf = (value: unknown): number | null => {
  const text = str(value);
  if (text === null || typeof value !== 'string') return null;
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
};

/** Half away from zero, to `digits` decimals. */
const roundHalfAway = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  const scaled = Math.abs(value) * factor;
  // Guard against binary drift (1.005 * 100 = 100.49999...).
  const rounded = Math.round(Number(scaled.toPrecision(15)));
  return (Math.sign(value) * rounded) / factor || 0;
};

const numberFormat = (locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat(undefined, options);
  }
};

const readDotted = (value: unknown, key: string): {found: boolean; value: unknown} => {
  let current: unknown = value;
  for (const segment of key.split('.')) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      const index = Number(segment);
      if (index >= current.length) return {found: false, value: null};
      current = current[index];
    } else if (isObject(current) && Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment];
    } else {
      return {found: false, value: null};
    }
  }
  return {found: true, value: current};
};

const classes = (value: unknown): string[] => {
  if (isNull(value) || value === false || value === '' || value === 0) return [];
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(classes);
  if (isObject(value)) return Object.entries(value).filter(([, on]) => truthy(on)).flatMap(([key]) => key.split(/\s+/).filter(Boolean));
  return [];
};

const fillTemplate = (template: string, values: readonly unknown[]): string =>
  template.replace(/\{\{|\}\}|\{(\d+)\}/g, (token, index: string | undefined) => {
    if (token === '{{') return '{';
    if (token === '}}') return '}';
    const at = Number(index);
    return at < values.length ? toText(values[at]) : '';
  });

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** '3 hours ago' / 'in 5 minutes', for `seconds` from the moment measured against (negative: before it). */
export const relativeTime = (seconds: number, locale: string | undefined): string => {
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.348],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ];
  let amount = seconds;
  let format: Intl.RelativeTimeFormat;
  try {
    format = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});
  } catch {
    format = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});
  }
  for (const [unit, size] of steps) {
    if (Math.abs(amount) < size) return format.format(Math.round(amount), unit);
    amount /= size;
  }
  return format.format(Math.round(amount), 'year');
};

const DURATION_UNITS: ReadonlyArray<[string, number]> = [
  ['d', 86400],
  ['h', 3600],
  ['m', 60],
];

/** `90` → `1m 30s`, `-3600` → `-1h`, `0` → `0s`; fractions of a second show under a minute only. */
export const durationText = (seconds: number): string => {
  const sign = seconds < 0 ? '-' : '';
  let rest = Math.abs(seconds);
  if (rest < 60) {
    const shown = Number.isInteger(rest) ? String(rest) : String(roundHalfAway(rest, 1));
    return `${sign}${shown}s`;
  }
  rest = Math.round(rest);
  const parts: string[] = [];
  for (const [unit, size] of DURATION_UNITS) {
    const amount = Math.floor(rest / size);
    if (amount > 0) parts.push(`${amount}${unit}`);
    rest -= amount * size;
  }
  if (rest > 0) parts.push(`${rest}s`);
  return `${sign}${parts.join(' ')}`;
};

/** A moment as `fmt.date` / `fmt.datetime` write it (`short medium long full iso`); empty for no moment. */
export const dateText = (value: unknown, format: unknown, locale: string | undefined, withTime: boolean): string => {
  const time = timeOf(value);
  if (time === null) return '';
  const style = isNull(format) ? 'medium' : str(format);
  const allowed = ['short', 'medium', 'long', 'full'] as const;
  const chosen = allowed.find(candidate => candidate === style) ?? 'medium';
  if (style === 'iso') return withTime ? new Date(time).toISOString() : new Date(time).toISOString().slice(0, 10);
  const options: Intl.DateTimeFormatOptions = withTime ? {dateStyle: chosen, timeStyle: chosen === 'full' ? 'long' : chosen} : {dateStyle: chosen};
  try {
    return new Intl.DateTimeFormat(locale, options).format(time);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(time);
  }
};

const typeName = (value: unknown): string => {
  if (isNull(value)) return 'null';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return 'list';
  return 'object';
};

/* -------------------------------------------------------------------------- */
/* Implementations                                                            */
/* -------------------------------------------------------------------------- */

const mathBinary =
  (operate: (a: number, b: number) => number | null): Impl =>
  args => {
    const a = num(args.a);
    const b = num(args.b);
    return a === null || b === null ? null : operate(a, b);
  };

const mathUnary =
  (key: string, operate: (value: number) => number): Impl =>
  args => {
    const value = num(args[key]);
    return value === null ? null : operate(value);
  };

const strUnary =
  (operate: (value: string) => unknown): Impl =>
  args => {
    const value = str(args.value);
    return value === null ? null : operate(value);
  };

const strTest =
  (key: string, test: (value: string, other: string) => boolean): Impl =>
  args => {
    const value = str(args.value);
    const other = str(args[key]);
    return value !== null && other !== null && test(value, other);
  };

const listOr =
  (fallback: () => unknown, operate: (value: unknown[], args: Args) => unknown): Impl =>
  args => {
    const value = list(args.value);
    return value === null ? fallback() : operate(value, args);
  };

const dictOr =
  (fallback: () => unknown, operate: (value: Record<string, unknown>, args: Args) => unknown): Impl =>
  args => {
    const value = dict(args.value);
    return value === null ? fallback() : operate(value, args);
  };

const numbers = (values: unknown): number[] => (list(values) ?? []).map(num).filter((value): value is number => value !== null);

const fmtNumber =
  (operate: (value: number, args: Args, context: BlokV2FunctionContext) => string): Impl =>
  (args, context) => {
    const value = num(args.value);
    return value === null ? '' : operate(value, args, context);
  };

const statusOf = (context: BlokV2FunctionContext): BlokAsyncStatus => context.argumentStatus?.value ?? 'ready';

const IMPLEMENTATIONS: Readonly<Partial<Record<string, Impl>>> = {
  // cmp
  'cmp.eq': args => deepEqual(args.a, args.b),
  'cmp.ne': args => !deepEqual(args.a, args.b),
  'cmp.gt': args => ordered(args.a, args.b, difference => difference > 0),
  'cmp.gte': args => ordered(args.a, args.b, difference => difference >= 0),
  'cmp.lt': args => ordered(args.a, args.b, difference => difference < 0),
  'cmp.lte': args => ordered(args.a, args.b, difference => difference <= 0),
  'cmp.between': args =>
    ordered(args.value, args.min, difference => difference >= 0) && ordered(args.value, args.max, difference => difference <= 0),

  // logic (eager forms; the runtime reads their arguments lazily itself)
  'logic.all': args => {
    const values = list(args.values) ?? [];
    if (values.length === 0) return true;
    for (const value of values) if (!truthy(value)) return value ?? null;
    return values[values.length - 1] ?? null;
  },
  'logic.any': args => {
    const values = list(args.values) ?? [];
    if (values.length === 0) return false;
    for (const value of values) if (truthy(value)) return value;
    return values[values.length - 1] ?? null;
  },
  'logic.negate': args => !truthy(args.a),
  'logic.choose': args => (truthy(args.cond) ? args.then ?? null : args.otherwise ?? null),
  'logic.coalesce': args => (list(args.values) ?? []).find(value => !isNull(value)) ?? null,

  // math
  'math.add': mathBinary((a, b) => a + b),
  'math.sub': mathBinary((a, b) => a - b),
  'math.mul': mathBinary((a, b) => a * b),
  'math.div': mathBinary((a, b) => (b === 0 ? null : a / b)),
  'math.mod': mathBinary((a, b) => (b === 0 ? null : a % b)),
  'math.neg': mathUnary('a', value => -value || 0),
  'math.abs': mathUnary('value', Math.abs),
  'math.round': args => {
    const value = num(args.value);
    return value === null ? null : roundHalfAway(value, int(args.digits, 0, 'digits'));
  },
  'math.floor': mathUnary('value', Math.floor),
  'math.ceil': mathUnary('value', Math.ceil),
  'math.clamp': args => {
    const value = num(args.value);
    const min = num(args.min);
    const max = num(args.max);
    return value === null || min === null || max === null ? null : Math.min(Math.max(value, min), max);
  },
  'math.min': args => {
    const values = numbers(args.values);
    return values.length ? Math.min(...values) : null;
  },
  'math.max': args => {
    const values = numbers(args.values);
    return values.length ? Math.max(...values) : null;
  },
  'math.sum': args => numbers(args.values).reduce((total, value) => total + value, 0),

  // str
  'str.upper': strUnary(value => value.toUpperCase()),
  'str.lower': strUnary(value => value.toLowerCase()),
  'str.trim': strUnary(value => value.trim()),
  'str.capitalize': strUnary(value => (value ? value[0].toUpperCase() + value.slice(1) : value)),
  'str.slice': args => {
    const value = str(args.value);
    if (value === null) return null;
    const characters = [...value];
    const end = isNull(args.end) ? undefined : int(args.end, characters.length, 'end');
    return characters.slice(int(args.start, 0, 'start'), end).join('');
  },
  'str.truncate': args => {
    const value = str(args.value);
    if (value === null) return null;
    const length = Math.max(0, int(args.length, 0, 'length'));
    const suffix = optStr(args.suffix, '…', 'suffix');
    const characters = [...value];
    if (characters.length <= length) return value;
    const kept = Math.max(0, length - [...suffix].length);
    return characters.slice(0, kept).join('') + suffix;
  },
  'str.replace': args => {
    const value = str(args.value);
    const search = str(args.search);
    const replacement = str(args.replacement);
    if (value === null) return null;
    if (search === null || replacement === null) return value;
    return search === '' ? value : value.split(search).join(replacement);
  },
  'str.split': args => {
    const value = str(args.value);
    if (value === null) return [];
    if (isNull(args.separator)) return [...value];
    return value.split(optStr(args.separator, '', 'separator'));
  },
  'str.concat': args => (list(args.values) ?? []).map(toText).join(''),
  'str.template': args => {
    const template = str(args.template);
    if (template === null) return '';
    return fillTemplate(template, list(args.values) ?? []);
  },
  'str.classes': args => classes(args.values).join(' '),
  'str.starts_with': strTest('prefix', (value, prefix) => value.startsWith(prefix)),
  'str.ends_with': strTest('suffix', (value, suffix) => value.endsWith(suffix)),
  'str.contains': strTest('search', (value, search) => value.includes(search)),
  'str.matches': args => {
    const value = str(args.value);
    const pattern = str(args.pattern);
    if (value === null || pattern === null) return false;
    try {
      return new RegExp(pattern).test(value);
    } catch {
      throw new ArgumentError(`pattern is not a regular expression: ${pattern}`);
    }
  },
  'str.length': args => {
    const value = str(args.value);
    return value === null ? 0 : [...value].length;
  },

  // list
  'list.len': listOr(() => 0, value => value.length),
  'list.contains': listOr(() => false, (value, args) => value.some(item => deepEqual(item, args.item))),
  'list.first': listOr(() => null, value => value[0] ?? null),
  'list.last': listOr(() => null, value => value[value.length - 1] ?? null),
  'list.at': listOr(
    () => null,
    (value, args) => {
      const index = int(args.index, 0, 'index');
      return value[index < 0 ? value.length + index : index] ?? null;
    },
  ),
  'list.join': listOr(
    () => '',
    (value, args) => value.map(toText).join(optStr(args.separator, ', ', 'separator')),
  ),
  'list.slice': listOr(
    () => [],
    (value, args) => value.slice(int(args.start, 0, 'start'), isNull(args.end) ? undefined : int(args.end, value.length, 'end')),
  ),
  'list.reverse': listOr(() => [], value => [...value].reverse()),
  'list.unique': listOr(
    () => [],
    value => value.filter((item, index) => value.findIndex(other => deepEqual(other, item)) === index),
  ),
  'list.compact': listOr(() => [], value => value.filter(item => !isNull(item))),
  'list.pluck': listOr(
    () => [],
    (value, args) => {
      const key = optStr(args.key, '', 'key');
      return value.map(item => readDotted(item, key).value ?? null);
    },
  ),
  'list.sort': listOr(
    () => [],
    (value, args) => {
      const key = isNull(args.key) ? null : optStr(args.key, '', 'key');
      const descending = truthy(args.descending);
      const read = (item: unknown) => (key === null ? item : readDotted(item, key).value);
      return value
        .map((item, index) => ({item, index, sortValue: read(item)}))
        .sort((left, right) => {
          const leftNull = isNull(left.sortValue);
          const rightNull = isNull(right.sortValue);
          if (leftNull || rightNull) return leftNull === rightNull ? left.index - right.index : leftNull ? 1 : -1;
          const difference = compare(left.sortValue, right.sortValue) ?? 0;
          return (descending ? -difference : difference) || left.index - right.index;
        })
        .map(entry => entry.item);
    },
  ),
  'list.range': args => {
    const start = num(args.start);
    const end = num(args.end);
    if (start === null || end === null) return [];
    const step = isNull(args.step) ? 1 : int(args.step, 1, 'step');
    if (step === 0) throw new ArgumentError('step is 0');
    const out: number[] = [];
    for (let value = Math.trunc(start); step > 0 ? value < end : value > end; value += step) {
      out.push(value);
      if (out.length > 100_000) throw new ArgumentError('the range is longer than 100000');
    }
    return out;
  },

  // obj
  'obj.get': args => {
    const fallback = args.default ?? null;
    if (!isObject(args.value) && !Array.isArray(args.value)) return fallback;
    const key = str(args.key);
    if (key === null) return fallback;
    const found = readDotted(args.value, key);
    return found.found && !isNull(found.value) ? found.value : fallback;
  },
  'obj.has': dictOr(
    () => false,
    (value, args) => {
      const key = str(args.key);
      return key !== null && Object.prototype.hasOwnProperty.call(value, key);
    },
  ),
  'obj.keys': dictOr(() => [], value => Object.keys(value)),
  'obj.values': dictOr(() => [], value => Object.values(value)),
  'obj.entries': dictOr(() => [], value => Object.entries(value).map(([key, item]) => ({key, value: item}))),

  // val
  'val.is_null': args => isNull(args.value),
  'val.is_set': args => !isNull(args.value),
  'val.is_empty': args => {
    const {value} = args;
    if (isNull(value)) return true;
    if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
    if (isObject(value)) return Object.keys(value).length === 0;
    return false;
  },
  'val.type': args => typeName(args.value),
  'val.to_string': args => toText(args.value),
  'val.to_number': args => {
    const {value} = args;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  },
  'val.to_bool': args => truthy(args.value),
  'val.status': (_args, context) => statusOf(context),
  'val.is_pending': (_args, context) => statusOf(context) === 'pending',
  'val.is_ready': (_args, context) => {
    const status = statusOf(context);
    return status === 'ready' || status === 'stale';
  },

  // fmt
  'fmt.number': fmtNumber((value, args, context) => {
    const digits = isNull(args.digits) ? undefined : Math.max(0, int(args.digits, 0, 'digits'));
    return numberFormat(context.locale, digits === undefined ? {} : {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
  }),
  'fmt.percent': fmtNumber((value, args, context) => {
    const digits = Math.max(0, int(args.digits, 0, 'digits'));
    return numberFormat(context.locale, {style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
  }),
  'fmt.currency': fmtNumber((value, args, context) => {
    const currency = str(args.currency);
    if (currency === null) return '';
    try {
      return new Intl.NumberFormat(context.locale, {style: 'currency', currency}).format(value);
    } catch {
      throw new ArgumentError(`currency is not a currency code: ${currency}`);
    }
  }),
  'fmt.bytes': fmtNumber((value, args, context) => {
    const digits = Math.max(0, int(args.digits, 1, 'digits'));
    let amount = Math.abs(value);
    let unit = 0;
    while (amount >= 1024 && unit < UNITS.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    const shown = unit === 0 ? amount : roundHalfAway(amount, digits);
    const text = numberFormat(context.locale, {maximumFractionDigits: unit === 0 ? 0 : digits}).format(shown);
    return `${value < 0 ? '-' : ''}${text} ${UNITS[unit]}`;
  }),
  'fmt.date': (args, context) => dateText(args.value, args.format, context.locale, false),
  'fmt.datetime': (args, context) => dateText(args.value, args.format, context.locale, true),
  'fmt.duration': args => {
    const seconds = num(args.seconds);
    return seconds === null ? '' : durationText(seconds);
  },
  'fmt.json': args => {
    const indent = isNull(args.indent) ? undefined : Math.max(0, int(args.indent, 0, 'indent'));
    try {
      return JSON.stringify(args.value ?? null, null, indent) ?? 'null';
    } catch {
      throw new ArgumentError('value is not JSON');
    }
  },
  'fmt.quantity': (args, context) => {
    const {value} = args;
    if (isNull(value)) return '';
    const unitArgument = isNull(args.unit) ? null : str(args.unit);
    let magnitude: number | null;
    let unit: string | null;
    if (isObject(value)) {
      magnitude = num(value.magnitude);
      unit = str(value.unit) ?? unitArgument;
    } else {
      magnitude = num(value);
      unit = unitArgument;
    }
    if (magnitude === null) return '';
    const text = numberFormat(context.locale, {maximumFractionDigits: 6}).format(magnitude);
    return unit ? `${text} ${unit}` : text;
  },

  // time: pure, never the wall clock
  'time.diff': args => {
    const start = timeOf(args.start);
    const end = timeOf(args.end);
    return start === null || end === null ? null : (end - start) / 1000;
  },
};

const build = (): ReadonlyMap<string, BlokV2Function> => {
  const functions = new Map<string, BlokV2Function>();
  for (const [name, spec] of loadVocabulary().functions) {
    if (spec.effect) continue;
    const call = IMPLEMENTATIONS[name];
    if (call) functions.set(name, {name, spec, call});
  }
  return functions;
};

/** Every pure function of the vocabulary, by name. */
export const v2Functions: ReadonlyMap<string, BlokV2Function> = build();

/** The names implemented here that the vocabulary does not declare (kept empty by a test). */
export const undeclaredImplementations = (): string[] =>
  Object.keys(IMPLEMENTATIONS).filter(name => !loadVocabulary().functions.has(name));

/** Calls a function by name. Never throws: an unknown name or a bad argument is an error result. */
export const invokeV2Function = (name: string, args: Readonly<Record<string, unknown>>, context: BlokV2FunctionContext): BlokV2InvokeResult => {
  const fn = v2Functions.get(name);
  if (!fn) {
    const spec = loadVocabulary().functions.get(name);
    return {ok: false, error: spec?.effect ? `${name} is an effect: only a callback runs it` : `${name} is not a function of the blok language`};
  }
  const unknown = Object.keys(args).filter(key => !fn.spec.keys.includes(key));
  if (unknown.length) return {ok: false, error: `${name} has no argument ${unknown.join(', ')} (${fn.spec.keys.join(', ')})`};
  try {
    const value = fn.call(args, context);
    return {ok: true, value: value === undefined ? null : value};
  } catch (error) {
    return {ok: false, error: `${name}: ${error instanceof Error ? error.message : String(error)}`};
  }
};
