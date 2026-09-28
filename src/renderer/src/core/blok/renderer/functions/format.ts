import {z} from 'zod';
import {createBlokFunction} from '../runtime';
import {integerSchema, numericSchema, textSchema} from './argumentSchemas';

/**
 * Formatting runs through `Intl` with the viewer's own locale, so a dashboard
 * renders in the reader's conventions rather than whatever the payload author
 * hard-coded.
 */

const dateInputSchema = z.union([z.string(), z.number(), z.date()]).transform((value, ctx) => {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected a date, received ${JSON.stringify(value)}.`,
    });
    return z.NEVER;
  }

  return parsed;
});

const numberFunction = createBlokFunction(
  {
    name: 'fmt.number',
    description: 'Formats a number for the viewer locale.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({
      value: numericSchema,
      minimumFractionDigits: integerSchema.optional(),
      maximumFractionDigits: integerSchema.optional(),
    }),
  },
  args =>
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: args.minimumFractionDigits,
      maximumFractionDigits: args.maximumFractionDigits,
    }).format(args.value),
);

const percentFunction = createBlokFunction(
  {
    name: 'fmt.percent',
    description: 'Formats a 0–1 ratio as a percentage.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: numericSchema, precision: integerSchema.optional()}),
  },
  args =>
    new Intl.NumberFormat(undefined, {
      style: 'percent',
      maximumFractionDigits: args.precision ?? 0,
    }).format(args.value),
);

const currencyFunction = createBlokFunction(
  {
    name: 'fmt.currency',
    description: 'Formats a number as a currency amount.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: numericSchema, currency: textSchema}),
  },
  args =>
    new Intl.NumberFormat(undefined, {style: 'currency', currency: args.currency}).format(
      args.value,
    ),
);

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;

const bytesFunction = createBlokFunction(
  {
    name: 'fmt.bytes',
    description: 'Formats a byte count with a unit suffix.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: numericSchema, precision: integerSchema.optional()}),
  },
  args => {
    const sign = args.value < 0 ? '-' : '';
    let remaining = Math.abs(args.value);
    let unitIndex = 0;

    while (remaining >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
      remaining /= 1000;
      unitIndex += 1;
    }

    const precision = args.precision ?? (unitIndex === 0 ? 0 : 1);
    return `${sign}${remaining.toFixed(precision)} ${BYTE_UNITS[unitIndex]}`;
  },
);

const dateFunction = createBlokFunction(
  {
    name: 'fmt.date',
    description: 'Formats a date for the viewer locale.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({
      value: dateInputSchema,
      dateStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
    }),
  },
  args =>
    new Intl.DateTimeFormat(undefined, {dateStyle: args.dateStyle ?? 'medium'}).format(args.value),
);

const dateTimeFunction = createBlokFunction(
  {
    name: 'fmt.datetime',
    description: 'Formats a date and time for the viewer locale.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({
      value: dateInputSchema,
      dateStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
      timeStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
    }),
  },
  args =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: args.dateStyle ?? 'medium',
      timeStyle: args.timeStyle ?? 'short',
    }).format(args.value),
);

const RELATIVE_UNITS: Array<{unit: Intl.RelativeTimeFormatUnit; ms: number}> = [
  {unit: 'year', ms: 365 * 24 * 60 * 60 * 1000},
  {unit: 'month', ms: 30 * 24 * 60 * 60 * 1000},
  {unit: 'day', ms: 24 * 60 * 60 * 1000},
  {unit: 'hour', ms: 60 * 60 * 1000},
  {unit: 'minute', ms: 60 * 1000},
  {unit: 'second', ms: 1000},
];

const relativeTimeFunction = createBlokFunction(
  {
    name: 'fmt.relativeTime',
    description: 'Formats a date relative to now ("3 hours ago").',
    returnType: 'string',
    // Reads the clock, so it is not referentially transparent — but it has no
    // side effects, which is what `pure` gates. It refreshes when the node
    // re-renders for another reason, not on a timer of its own.
    purity: 'pure',
    schema: z.object({value: dateInputSchema}),
  },
  args => {
    const deltaMs = args.value.getTime() - Date.now();
    const formatter = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});
    const match =
      RELATIVE_UNITS.find(candidate => Math.abs(deltaMs) >= candidate.ms) ??
      RELATIVE_UNITS[RELATIVE_UNITS.length - 1];

    return formatter.format(Math.round(deltaMs / match.ms), match.unit);
  },
);

const jsonFunction = createBlokFunction(
  {
    name: 'fmt.json',
    description: 'Renders any value as JSON.',
    returnType: 'string',
    purity: 'pure',
    schema: z.object({value: z.unknown(), indent: integerSchema.optional()}),
  },
  args => JSON.stringify(args.value, null, args.indent ?? 0) ?? String(args.value),
);

export const formatFunctions = [
  numberFunction,
  percentFunction,
  currencyFunction,
  bytesFunction,
  dateFunction,
  dateTimeFunction,
  relativeTimeFunction,
  jsonFunction,
];
