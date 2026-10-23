import {z} from 'zod';
import { toast } from "@/core/notify";
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {recordSchema, textSchema} from './argumentSchemas';

/**
 * Effectful functions. These are refused in value position by the preflight and
 * only run from an action prop, so they cannot fire on every render.
 */

const describe = (values: unknown[]): unknown => (values.length === 1 ? values[0] : values);

const createLoggerFunction = (level: 'info' | 'warn' | 'error') =>
  createVariadicBlokFunction(
    {
      name: `logger.${level}`,
      description: `Logs its arguments to the console at ${level} level. For a message the user should see, use ui.toast.`,
      returnType: 'unknown',
      purity: 'effect',
      item: z.unknown(),
      min: 1,
    },
    values => {
      const message = describe(values);
      // Resolved at call time, not captured at module load, so the sink stays
      // whatever `console` is when the action actually fires. No toast: a log
      // line is for the author, and a logger in a loop would fill the island.
      console[level](`blok logger.${level}`, message);
      return message;
    },
  );

const copyFunction = createBlokFunction(
  {
    name: 'clipboard.copy',
    description: 'Copies a value to the clipboard.',
    returnType: 'void',
    purity: 'effect',
    schema: z.object({value: textSchema, message: textSchema.optional()}),
  },
  args => {
    if (!navigator?.clipboard) {
      throw new Error('The clipboard is not available in this context.');
    }

    void navigator.clipboard
      .writeText(args.value)
      .then(() => toast.success(args.message ?? 'Copied to clipboard.'))
      .catch(() => toast.error('Could not copy to the clipboard.'));
  },
);

/**
 * A toast is the one piece of UI a blok raises without a component: it is
 * transient, app-owned chrome (the toast island, `core/notify`),
 * so it belongs in action position like any other effect.
 */
const toastFunction = createBlokFunction(
  {
    name: 'ui.toast',
    description: 'Shows a toast notification.',
    returnType: 'void',
    purity: 'effect',
    schema: z.object({
      message: textSchema.describe('The message to show.'),
      description: textSchema.optional().describe('Secondary line under the message.'),
      level: z
        .enum(['default', 'success', 'info', 'warning', 'error'])
        .optional()
        .describe('Toast severity. Defaults to "default".'),
    }),
  },
  args => {
    const options = args.description ? {description: args.description} : undefined;

    switch (args.level) {
      case 'success':
        toast.success(args.message, options);
        break;
      case 'info':
        toast.info(args.message, options);
        break;
      case 'warning':
        toast.warning(args.message, options);
        break;
      case 'error':
        toast.error(args.message, options);
        break;
      default:
        toast(args.message, options);
    }
  },
);

/** The name a host intercepts (`invokeFunction`) to take a blok's answer. */
export const BLOK_ANSWER_FUNCTION = 'blok.answer';

/**
 * A blok's answer to the task that asks with it: one object, keyed by the
 * blok's returns (`blok.answer(values={'image': img})`). One declared argument,
 * because a catalog operation names its arguments: the server refuses a call
 * with keys its declaration lacks, and the returns differ per blok. Only a host
 * showing an ask that still waits takes it; anywhere else nobody answers.
 */
const answerFunction = createBlokFunction(
  {
    name: BLOK_ANSWER_FUNCTION,
    description:
      "Answers the task that asks with this blok. `values` is the answer, keyed by the blok's returns: blok.answer(values={'image': img}). Only where a task waits for the answer.",
    returnType: 'void',
    purity: 'effect',
    schema: z.object({
      values: recordSchema.describe("The answer, keyed by the blok's returns."),
    }),
  },
  () => {
    throw new Error('Nothing is waiting for an answer here.');
  },
);

export const effectFunctions = [
  answerFunction,
  createLoggerFunction('info'),
  createLoggerFunction('warn'),
  createLoggerFunction('error'),
  copyFunction,
  toastFunction,
];
