import {
  CategoryDefinitionInput,
  ClaimConditionInput,
  ClaimField,
  ClaimOperator,
  ClaimRuleInput,
} from "../../api/graphql";

/**
 * Claim rules (RFC 0010) as the editor holds them.
 *
 * A rule is a conjunction (`when`) with exceptions (`unless`); a rule list is a
 * disjunction. The wire value of a condition depends on its operator — one
 * string for IS, a list for IN/NOT_IN — so the draft keeps string-valued
 * conditions as a list throughout and only collapses IS at the edge. Switching
 * IS ↔ IN then never loses what was picked.
 */

export type ValueType = "strings" | "kind" | "datetime" | "confidence";

export type FieldSpec = {
  label: string;
  operators: readonly ClaimOperator[];
  valueType: ValueType;
};

const SET_OPERATORS = [ClaimOperator.In, ClaimOperator.Is, ClaimOperator.NotIn] as const;

export const FIELD_SPECS: Record<ClaimField, FieldSpec> = {
  [ClaimField.Word]: { label: "Word", operators: SET_OPERATORS, valueType: "strings" },
  [ClaimField.Subject]: { label: "Claimed by", operators: SET_OPERATORS, valueType: "strings" },
  [ClaimField.App]: { label: "App", operators: SET_OPERATORS, valueType: "strings" },
  [ClaimField.Action]: { label: "Action", operators: SET_OPERATORS, valueType: "strings" },
  [ClaimField.Kind]: { label: "Claim kind", operators: SET_OPERATORS, valueType: "kind" },
  [ClaimField.Key]: { label: "Metric key", operators: SET_OPERATORS, valueType: "strings" },
  [ClaimField.Confidence]: {
    label: "Confidence",
    operators: [ClaimOperator.AtLeast, ClaimOperator.Below],
    valueType: "confidence",
  },
  [ClaimField.AssertedAt]: {
    label: "Asserted",
    operators: [ClaimOperator.Since, ClaimOperator.Before],
    valueType: "datetime",
  },
  [ClaimField.ObservedAt]: {
    label: "Observed",
    operators: [ClaimOperator.Since, ClaimOperator.Before],
    valueType: "datetime",
  },
};

/** The order fields are offered in: the existence questions first. */
export const FIELD_ORDER: ClaimField[] = [
  ClaimField.Word,
  ClaimField.Subject,
  ClaimField.App,
  ClaimField.Action,
  ClaimField.Confidence,
  ClaimField.AssertedAt,
  ClaimField.ObservedAt,
  ClaimField.Kind,
  ClaimField.Key,
];

export const CLAIM_KINDS = [
  "CLASSIFICATION",
  "EXISTENCE",
  "SAMENESS",
  "EVIDENCE",
  "MEASUREMENT",
] as const;

export const OPERATOR_LABELS: Record<ClaimOperator, string> = {
  [ClaimOperator.Is]: "is",
  [ClaimOperator.In]: "is any of",
  [ClaimOperator.NotIn]: "is none of",
  [ClaimOperator.AtLeast]: "at least",
  [ClaimOperator.Below]: "below",
  [ClaimOperator.Since]: "since",
  [ClaimOperator.Before]: "before",
};

export type ClaimConditionDraft = {
  field: ClaimField;
  operator: ClaimOperator;
  /** string[] for set fields, ISO-ish string for datetimes, number|string for confidence */
  value: string[] | string | number | null;
  /** Display labels for picked values (e.g. user id → username). Never sent. */
  labels?: Record<string, string>;
};

export type ClaimRuleDraft = {
  when: ClaimConditionDraft[];
  unless: { when: ClaimConditionDraft[] }[];
};

export const emptyCondition = (field: ClaimField): ClaimConditionDraft => {
  const spec = FIELD_SPECS[field];
  return {
    field,
    operator: spec.operators[0],
    value: spec.valueType === "strings" || spec.valueType === "kind" ? [] : null,
  };
};

export const wordRule = (word: string | null | undefined): ClaimRuleDraft => ({
  when: [
    { field: ClaimField.Word, operator: ClaimOperator.In, value: word ? [word] : [] },
  ],
  unless: [],
});

const asList = (value: ClaimConditionDraft["value"]): string[] =>
  Array.isArray(value) ? value.filter((v) => v !== "") : [];

const asConfidence = (value: ClaimConditionDraft["value"]): number | null => {
  if (value === null || value === "" || Array.isArray(value)) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
};

const asDatetime = (value: ClaimConditionDraft["value"]): string | null => {
  if (typeof value !== "string" || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** The wire condition, or null when the draft is not complete. */
export const toConditionInput = (
  c: ClaimConditionDraft,
): ClaimConditionInput | null => {
  const spec = FIELD_SPECS[c.field];
  if (!spec.operators.includes(c.operator)) return null;
  switch (spec.valueType) {
    case "strings":
    case "kind": {
      const list = asList(c.value);
      if (list.length === 0) return null;
      if (c.operator === ClaimOperator.Is) {
        return { field: c.field, operator: c.operator, value: list[0] };
      }
      return { field: c.field, operator: c.operator, value: list };
    }
    case "confidence": {
      const n = asConfidence(c.value);
      return n === null ? null : { field: c.field, operator: c.operator, value: n };
    }
    case "datetime": {
      const d = asDatetime(c.value);
      return d === null ? null : { field: c.field, operator: c.operator, value: d };
    }
  }
};

/** The first problem with the rule list, or null when it can be sent. */
export const validateRules = (rules: ClaimRuleDraft[]): string | null => {
  if (rules.length === 0) return "Add at least one rule, or let anyone's word count.";
  for (const [i, rule] of rules.entries()) {
    const n = rules.length > 1 ? ` ${i + 1}` : "";
    if (rule.when.length === 0) return `Rule${n} needs at least one condition.`;
    if (rule.when.some((c) => toConditionInput(c) === null)) {
      return `Rule${n} has an incomplete condition.`;
    }
    for (const group of rule.unless) {
      if (group.when.some((c) => toConditionInput(c) === null)) {
        return `An exception in rule${n} has an incomplete condition.`;
      }
    }
  }
  return null;
};

/**
 * The `definition` to send, or null when the drafts don't form a valid one —
 * callers validate first, so null here means "primitive".
 */
export const toCategoryDefinition = (
  rules: ClaimRuleDraft[],
): CategoryDefinitionInput | null => {
  if (validateRules(rules) !== null) return null;
  return {
    rules: rules.map((rule): ClaimRuleInput => {
      const unless = rule.unless
        .map((g) => ({ when: g.when.map(toConditionInput).filter(isPresent) }))
        .filter((g) => g.when.length > 0);
      return {
        when: rule.when.map(toConditionInput).filter(isPresent),
        unless: unless.length > 0 ? unless : null,
      };
    }),
  };
};

const isPresent = <T>(v: T | null): v is T => v !== null;

// ── Plain-language summary ─────────────────────────────────────────────────

const joinOr = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;

const PHRASE: Record<ClaimField, string> = {
  [ClaimField.Word]: "the word",
  [ClaimField.Subject]: "claimed by",
  [ClaimField.App]: "via app",
  [ClaimField.Action]: "via action",
  [ClaimField.Kind]: "claim kind",
  [ClaimField.Key]: "metric key",
  [ClaimField.Confidence]: "confidence",
  [ClaimField.AssertedAt]: "asserted",
  [ClaimField.ObservedAt]: "observed",
};

export const summarizeCondition = (c: ClaimConditionDraft): string => {
  const phrase = PHRASE[c.field];
  const spec = FIELD_SPECS[c.field];
  if (spec.valueType === "strings" || spec.valueType === "kind") {
    const list = asList(c.value).map((v) => c.labels?.[v] ?? v);
    const shown = list.length ? joinOr(c.operator === ClaimOperator.Is ? list.slice(0, 1) : list) : "…";
    const negated = c.operator === ClaimOperator.NotIn;
    // Nouns read "the word is (not) X"; the rest read "(not) claimed by X".
    const isNoun =
      c.field === ClaimField.Word || c.field === ClaimField.Kind || c.field === ClaimField.Key;
    return isNoun
      ? `${phrase} is ${negated ? "not " : ""}${shown}`
      : `${negated ? "not " : ""}${phrase} ${shown}`;
  }
  if (spec.valueType === "confidence") {
    const n = asConfidence(c.value);
    return `${phrase} ${c.operator === ClaimOperator.AtLeast ? "≥" : "<"} ${n ?? "…"}`;
  }
  const d = asDatetime(c.value);
  return `${phrase} ${OPERATOR_LABELS[c.operator]} ${d ? new Date(d).toLocaleString() : "…"}`;
};

export const summarizeRule = (rule: ClaimRuleDraft): string => {
  const base = rule.when.map(summarizeCondition).join(" and ") || "…";
  const exceptions = rule.unless
    .filter((g) => g.when.length > 0)
    .map((g) => g.when.map(summarizeCondition).join(" and "));
  return exceptions.length ? `${base}, unless ${exceptions.join(" or unless ")}` : base;
};

export const summarizeRules = (rules: ClaimRuleDraft[]): string => {
  if (rules.length === 0) return "Nothing can make it exist yet.";
  return `Exists when ${rules.map(summarizeRule).map((s) => `(${s})`).join(" or ")}.`;
};
