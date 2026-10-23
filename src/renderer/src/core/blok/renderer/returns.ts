import { BLOK_ANSWER_FUNCTION } from "./functions/effects";
import type { BlokCatalog, BlokInvokeFunctionHandler } from "./runtime";

/**
 * The function handler of a blok that answers a task: `blok.answer(...)` goes
 * to `onReturn` (only from an action, never while a prop resolves), every
 * other function to `catalog`. A host without an ask passes none, and the
 * catalog's own `blok.answer` refuses: nothing waits.
 */
export const returningInvokeFunction =
  (catalog: BlokCatalog, onReturn: (values: Record<string, unknown>) => unknown): BlokInvokeFunctionHandler =>
  (name, args, options) => {
    if (name !== BLOK_ANSWER_FUNCTION) return catalog.invokeFunction(name, args, options);
    if (options?.requirePure) return { ok: false, error: `${name} answers the task: only from an action.` };
    // `values`, by name or as the one positional argument (`blok.answer({...})`).
    const values = args.values ?? args["0"];
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return { ok: false, error: `${name} takes the answer as one object: ${name}(values={'key': value}).` };
    }
    // The host reports a failed answer itself (CLAUDE.md §8); the tree only fires it.
    void Promise.resolve(onReturn(values as Record<string, unknown>)).catch(() => undefined);
    return { ok: true, value: undefined };
  };
