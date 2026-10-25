import {z} from 'zod';
import {createBlokFunction} from '../runtime';
import {textSchema} from './argumentSchemas';

/** The names a host that keeps a blok's locals intercepts (`invokeFunction`, see `../persist.ts`). */
export const PERSIST_RESET_FUNCTION = 'persist.reset';
export const PERSIST_RESET_ALL_FUNCTION = 'persist.resetAll';

/**
 * Forgetting what a blok keeps on this device. A blok declares the locals it
 * keeps (`persist`); a renderer that keeps them takes these calls, drops what
 * it kept and shows the local's demo value again. One that keeps nothing (the
 * editor's preview) has nothing to forget, so here they do nothing.
 */
const resetFunction = createBlokFunction(
  {
    name: PERSIST_RESET_FUNCTION,
    description:
      "Forgets what this device kept for one of the blok's persisted locals and shows its demo value again: persist.reset(key='pose').",
    returnType: 'void',
    purity: 'effect',
    schema: z.object({
      key: textSchema.describe('The persisted local, a top-level key of the demo state.'),
    }),
  },
  () => undefined,
);

const resetAllFunction = createBlokFunction(
  {
    name: PERSIST_RESET_ALL_FUNCTION,
    description: "Forgets everything this device kept for the blok's persisted locals and shows their demo values again.",
    returnType: 'void',
    purity: 'effect',
    schema: z.object({}),
  },
  () => undefined,
);

export const persistFunctions = [resetFunction, resetAllFunction];
