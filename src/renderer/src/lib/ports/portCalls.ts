import { standardBlokFunctions } from "@/blok/renderer/functions";
import {
  BlokSchemas,
  createBlokCatalog,
  describeBlokCatalog,
  invokeUtilCall,
  normalizeBlokCall,
  type BlokResolutionContext,
  type BlokUtilCall,
} from "@/blok/renderer/runtime";
import type { BlokResolved } from "@/blok/renderer/runtime/resolution";

import { portFunctions } from "./portFunctions";

/**
 * Port calls: how hide effects and validators are expressed.
 *
 * A port call is a blok `UtilCall` — `{ operation, arguments }` — naming a
 * function from the catalog below and resolving its arguments from the form:
 *
 * - `{ "value_path": "value" }` is the port's own value;
 * - `{ "value_path": "<name>" }` is the value of a port listed in the
 *   effect's/validator's `dependencies` (which is also the form subscription
 *   list, so an undeclared name resolves to `undefined`);
 * - `value_literal`, nested `util_call`, `value_list`, `value_dict` as in blok.
 *
 * Only pure functions may be called. Evaluation never throws: a malformed
 * payload, an unknown function or bad arguments come back as `{ ok: false }`.
 */

export const PORT_CALL_SELF_PATH = "value";

export const portCallCatalog = createBlokCatalog(
  "https://arkitekt.live/catalogs/port-calls/v1.json",
  [],
  [...standardBlokFunctions, ...portFunctions],
);

/** Serializable manifest for authoring UIs (function names, args, purity). */
export const describePortCallCatalog = () => describeBlokCatalog(portCallCatalog);

export type ParsedPortCall = BlokResolved<BlokUtilCall>;

// Payload objects from Apollo are stable per fragment, so parse each once.
const parsedByObject = new WeakMap<object, ParsedPortCall>();
// JSON strings are parsed once too, in a bounded cache.
const parsedByString = new Map<string, ParsedPortCall>();
const MAX_STRING_CACHE = 500;

const parseUncached = (raw: unknown): ParsedPortCall => {
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Port call is not valid JSON." };
    }
  }
  const parsed = BlokSchemas.UtilCall.safeParse(normalizeBlokCall(candidate));
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: `Port call is malformed: ${detail}` };
  }
  return { ok: true, value: parsed.data };
};

/** Parse a port call from a payload object or a JSON string. Memoized. */
export const parsePortCall = (raw: unknown): ParsedPortCall => {
  if (raw == null) {
    return { ok: false, error: "Port call is missing." };
  }
  if (typeof raw === "object") {
    let parsed = parsedByObject.get(raw);
    if (!parsed) {
      parsed = parseUncached(raw);
      parsedByObject.set(raw, parsed);
    }
    return parsed;
  }
  if (typeof raw === "string") {
    let parsed = parsedByString.get(raw);
    if (!parsed) {
      parsed = parseUncached(raw);
      if (parsedByString.size >= MAX_STRING_CACHE) {
        parsedByString.delete(parsedByString.keys().next().value as string);
      }
      parsedByString.set(raw, parsed);
    }
    return parsed;
  }
  return { ok: false, error: `Port call has unsupported type ${typeof raw}.` };
};

export type PortCallScope = {
  /** The port's own value (`value_path: "value"`). */
  value: unknown;
  /** Values of the declared dependencies, by dependency name. */
  dependencies: Record<string, unknown>;
};

const createContext = (scope: PortCallScope): BlokResolutionContext => ({
  readPath: (path) => {
    if (path === PORT_CALL_SELF_PATH) return scope.value;
    return Object.prototype.hasOwnProperty.call(scope.dependencies, path)
      ? scope.dependencies[path]
      : undefined;
  },
  resolvePath: (path) => path,
  invokeFunction: portCallCatalog.invokeFunction,
  dispatchAction: async () => ({
    ok: false as const,
    error: "Port calls cannot dispatch actions.",
  }),
});

/** Evaluate a parsed call against the form values. Never throws. */
export const evaluatePortCall = (
  call: BlokUtilCall,
  scope: PortCallScope,
): BlokResolved<unknown> => invokeUtilCall(call, createContext(scope), true);

/** Parse and evaluate in one step, for callers holding the raw payload. */
export const runPortCall = (raw: unknown, scope: PortCallScope): BlokResolved<unknown> => {
  const parsed = parsePortCall(raw);
  if (!parsed.ok) return parsed;
  return evaluatePortCall(parsed.value, scope);
};

/** Build the dependency scope from a name list and the matching values. */
export const dependencyScope = (
  names: readonly string[] | null | undefined,
  values: readonly unknown[],
): Record<string, unknown> => {
  const scope: Record<string, unknown> = {};
  (names ?? []).forEach((name, index) => {
    scope[name] = values[index];
  });
  return scope;
};
