import {z} from 'zod';
import {toast} from 'sonner';
import {createBlokFunction, createVariadicBlokFunction} from '../runtime';
import {textSchema} from './argumentSchemas';

/**
 * Effectful functions. These are refused in value position by the preflight and
 * only run from an action prop, so they cannot fire on every render.
 */

const describe = (values: unknown[]): unknown => (values.length === 1 ? values[0] : values);

const asMessage = (message: unknown): string =>
  typeof message === 'string' ? message : JSON.stringify(message) ?? String(message);

const TOAST_BY_LEVEL = {
  info: 'info',
  warn: 'warning',
  error: 'error',
} as const;

const createLoggerFunction = (level: 'info' | 'warn' | 'error') =>
  createVariadicBlokFunction(
    {
      name: `logger.${level}`,
      description: `Logs its arguments and shows a ${level} toast.`,
      returnType: 'unknown',
      purity: 'effect',
      item: z.unknown(),
      min: 1,
    },
    values => {
      const message = describe(values);
      // Resolved at call time, not captured at module load, so the sink stays
      // whatever `console`/`toast` is when the action actually fires.
      console[level](`blok logger.${level}`, message);
      toast[TOAST_BY_LEVEL[level]](asMessage(message));
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
 * transient, app-owned chrome (the `<Toaster/>` is mounted once by the shell),
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

export const effectFunctions = [
  createLoggerFunction('info'),
  createLoggerFunction('warn'),
  createLoggerFunction('error'),
  copyFunction,
  toastFunction,
];
