import { runPortCall } from "./portCalls";
import { resolveDependencyValue } from "./portPaths";

/** The validator shape both the rekuest and fluss fragments provide. */
export type PortValidatorLike = {
  /** The catalog call (a blok UtilCall, object or JSON string). */
  call: unknown;
  dependencies?: readonly string[] | null;
  errorMessage?: string | null;
  label?: string | null;
};

/**
 * Run a port's validators against its value and the values around it.
 *
 * `local` is the object holding the port's siblings; `root` the object holding
 * the top-level ports (defaults to `local`). Dependency names are resolved by
 * `resolveDependencyValue` (`a..b` walks into a sibling, `/a` reads from root).
 *
 * Returns one message per failing validator. A validator's call returns a
 * boolean meaning "valid"; the message comes from `errorMessage` (or
 * `label`). A validator whose dependencies are not all set yet is skipped,
 * as before. A validator whose call cannot be evaluated (malformed payload,
 * unknown function, bad arguments) FAILS with that error: a broken rule must
 * be visible, not silently pass.
 */
export const runPortValidators = (
  validators: readonly PortValidatorLike[] | null | undefined,
  value: unknown,
  local: Record<string, unknown>,
  root: unknown = local,
): string[] => {
  if (!validators || validators.length === 0) return [];

  const messages: string[] = [];
  for (const validator of validators) {
    const names = validator.dependencies ?? [];
    const dependencies: Record<string, unknown> = {};
    let allSet = true;
    for (const name of names) {
      const resolved = resolveDependencyValue(name, local, root);
      if (!resolved.found || resolved.value === undefined) {
        allSet = false;
        break;
      }
      dependencies[name] = resolved.value;
    }
    if (!allSet) continue;

    const result = runPortCall(validator.call, { value, dependencies });
    if (!result.ok) {
      messages.push(result.error);
      continue;
    }
    if (!result.value) {
      messages.push(validator.errorMessage || validator.label || "Validation failed");
    }
  }
  return messages;
};
