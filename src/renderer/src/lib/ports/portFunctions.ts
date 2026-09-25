import { z } from "zod";

import { createBlokFunction, type BlokFunctionDefinition } from "@/blok/renderer/runtime";

/**
 * Port-specific additions to the standard blok function library, for hide
 * effects and validators. Everything here is pure: a rule is evaluated on
 * every form change.
 *
 * Add a function only when a real rule cannot be expressed with the standard
 * library (`compare.*`, `logic.*`, `type.isNil`, `type.isEmpty`,
 * `list.includes`, `str.*`, `math.*`).
 */

const isSetFunction = createBlokFunction(
  {
    name: "port.isSet",
    description: "True when the value is neither null nor undefined.",
    returnType: "boolean",
    purity: "pure",
    schema: z.object({ value: z.unknown() }),
  },
  (args) => args.value != null,
);

const isOneOfFunction = createBlokFunction(
  {
    name: "port.isOneOf",
    description: "True when the value equals one of the given options.",
    returnType: "boolean",
    purity: "pure",
    schema: z.object({ value: z.unknown(), options: z.array(z.unknown()) }),
  },
  (args) => args.options.some((option) => option === args.value),
);

// Patterns arrive as strings in the payload; compile each distinct one once.
const patternCache = new Map<string, RegExp>();
const compilePattern = (pattern: string, flags: string | undefined) => {
  const key = `${flags ?? ""}/${pattern}`;
  let compiled = patternCache.get(key);
  if (!compiled) {
    compiled = new RegExp(pattern, flags);
    patternCache.set(key, compiled);
  }
  return compiled;
};

const matchesFunction = createBlokFunction(
  {
    name: "str.matches",
    description: "True when the value, as a string, matches the regular expression.",
    returnType: "boolean",
    purity: "pure",
    schema: z.object({
      value: z.unknown(),
      pattern: z.string(),
      flags: z.string().optional(),
    }),
  },
  (args) => {
    if (args.value == null) return false;
    return compilePattern(args.pattern, args.flags).test(String(args.value));
  },
);

export const portFunctions: BlokFunctionDefinition[] = [
  isSetFunction,
  isOneOfFunction,
  matchesFunction,
];
