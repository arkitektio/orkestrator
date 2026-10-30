import type { BlokActionArgument, BlokUtilCall } from "@arkitektio/bsx/renderer/runtime/index";

/**
 * Apps write port validators and effects in the base catalog (`rekuest_core/catalogs/base_v1.json`):
 * `value > 0` reaches us as `gt`. bsx only knows its own vocabulary, where that is `cmp.gt`, so a call
 * is rewritten before it is evaluated. Stored calls keep their names, because an action's hash covers
 * them. A name in the vocabulary already passes through, so formulas and hand-written calls are untouched.
 *
 * `fmt.relativeTime` has no counterpart: no bsx function reads the clock.
 */

type Renamed = { operation: string; keys?: Record<string, string> };

const RENAMED: Record<string, Renamed> = {
  eq: { operation: "cmp.eq" },
  ne: { operation: "cmp.ne" },
  gt: { operation: "cmp.gt" },
  gte: { operation: "cmp.gte" },
  lt: { operation: "cmp.lt" },
  lte: { operation: "cmp.lte" },
  between: { operation: "cmp.between" },
  not: { operation: "logic.negate" },
  if: { operation: "logic.choose", keys: { condition: "cond" } },
  is_null: { operation: "val.is_null", keys: { a: "value" } },
  is_set: { operation: "val.is_set", keys: { a: "value" } },
  is_empty: { operation: "val.is_empty", keys: { a: "value" } },
  matches: { operation: "str.matches" },
  starts_with: { operation: "str.starts_with" },
  ends_with: { operation: "str.ends_with" },
  get: { operation: "obj.get", keys: { path: "key" } },
  add: { operation: "math.add" },
  sub: { operation: "math.sub" },
  mul: { operation: "math.mul" },
  div: { operation: "math.div" },
  mod: { operation: "math.mod" },
  neg: { operation: "math.neg" },
  "fmt.bytes": { operation: "fmt.bytes", keys: { precision: "digits" } },
  "fmt.date": { operation: "fmt.date", keys: { dateStyle: "format" } },
  "fmt.datetime": { operation: "fmt.datetime", keys: { dateStyle: "format" } },
  "fmt.number": { operation: "fmt.number", keys: { maximumFractionDigits: "digits" } },
  "fmt.percent": { operation: "fmt.percent", keys: { precision: "digits" } },
  "list.pluck": { operation: "list.pluck", keys: { path: "key" } },
  "list.sort": { operation: "list.sort", keys: { path: "key" } },
  "list.sum": { operation: "math.sum", keys: { value: "values" } },
  "math.round": { operation: "math.round", keys: { precision: "digits" } },
  "obj.has": { operation: "obj.has", keys: { path: "key" } },
  "type.of": { operation: "val.type" },
  "type.toBoolean": { operation: "val.to_bool" },
  "type.toString": { operation: "val.to_string" },
};

/** What the base catalog takes as separate arguments and the vocabulary as one list. */
const FOLDS: Record<string, string> = {
  and: "logic.all",
  or: "logic.any",
  coalesce: "logic.coalesce",
  "str.default": "logic.coalesce",
};

const util = (operation: string, ...args: BlokActionArgument[]): BlokUtilCall => ({
  operation,
  arguments: args,
});

const nested = (key: string, call: BlokUtilCall): BlokActionArgument => ({ key, util_call: call });

/** A list or a string, which the base catalog does not tell apart and the vocabulary does. */
const byType = (
  subject: BlokActionArgument,
  onString: BlokUtilCall,
  onList: BlokUtilCall,
): BlokUtilCall =>
  util(
    "logic.choose",
    nested(
      "cond",
      util(
        "cmp.eq",
        nested("a", util("val.type", { ...subject, key: "value" })),
        { key: "b", value_literal: "string" },
      ),
    ),
    nested("then", onString),
    nested("otherwise", onList),
  );

const length = (subject: BlokActionArgument): BlokUtilCall =>
  byType(
    subject,
    util("str.length", { ...subject, key: "value" }),
    util("list.len", { ...subject, key: "value" }),
  );

const contains = (haystack: BlokActionArgument, needle: BlokActionArgument): BlokUtilCall =>
  byType(
    haystack,
    util("str.contains", { ...haystack, key: "value" }, { ...needle, key: "search" }),
    util("list.contains", { ...haystack, key: "value" }, { ...needle, key: "item" }),
  );

const orDefault = (argument: BlokActionArgument, fallback: number): BlokActionArgument =>
  argument.value_literal === null && !argument.value_path && !argument.util_call
    ? { key: argument.key, value_literal: fallback }
    : argument;

/** What takes more than one function of the vocabulary. */
const COMPOSED: Record<string, (read: (key: string) => BlokActionArgument) => BlokUtilCall> = {
  len: (read) => length(read("a")),
  contains: (read) => contains(read("haystack"), read("needle")),
  in: (read) => contains(read("options"), read("value")),
  len_between: (read) =>
    util(
      "cmp.between",
      nested("value", length(read("value"))),
      { ...read("min"), key: "min" },
      { ...read("max"), key: "max" },
    ),
  // The base catalog counts where the vocabulary ends.
  "list.range": (read) => {
    const start = orDefault(read("start"), 0);
    const step = orDefault(read("step"), 1);
    return util(
      "list.range",
      { ...start, key: "start" },
      nested(
        "end",
        util(
          "math.add",
          { ...start, key: "a" },
          nested("b", util("math.mul", { ...read("count"), key: "a" }, { ...step, key: "b" })),
        ),
      ),
      { ...step, key: "step" },
    );
  },
  "type.toNumber": (read) =>
    util("logic.coalesce", {
      key: "values",
      value_list: [
        nested("", util("val.to_number", { ...read("value"), key: "value" })),
        read("fallback"),
      ].map((argument) => ({ ...argument, key: null })),
    }),
};

const inVocabularyArgument = (argument: BlokActionArgument): BlokActionArgument => ({
  ...argument,
  ...(argument.util_call ? { util_call: inVocabulary(argument.util_call) } : {}),
  ...(argument.value_list ? { value_list: argument.value_list.map(inVocabularyArgument) } : {}),
  ...(argument.value_dict ? { value_dict: argument.value_dict.map(inVocabularyArgument) } : {}),
});

/** `call` and every call inside it, named as the vocabulary names them. */
export const inVocabulary = (call: BlokUtilCall): BlokUtilCall => {
  const args = (call.arguments ?? []).map(inVocabularyArgument);

  const fold = FOLDS[call.operation];
  if (fold) {
    return util(fold, {
      key: "values",
      value_list: args.map((argument) => ({ ...argument, key: null })),
    });
  }

  // `list.range` is a name both share: only the base catalog's form counts.
  const inBaseForm = call.operation !== "list.range" || args.some((argument) => argument.key === "count");
  const composed = inBaseForm ? COMPOSED[call.operation] : undefined;
  if (composed) {
    return composed(
      (key) => args.find((argument) => argument.key === key) ?? { key, value_literal: null },
    );
  }

  const renamed = RENAMED[call.operation];
  return {
    ...call,
    operation: renamed?.operation ?? call.operation,
    arguments: args.map((argument) => ({
      ...argument,
      key: (argument.key && renamed?.keys?.[argument.key]) ?? argument.key,
    })),
  };
};
