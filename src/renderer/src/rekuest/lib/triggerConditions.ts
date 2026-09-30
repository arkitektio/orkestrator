import { DescriptorOperator, SignalKind } from "@/rekuest/api/graphql";

/**
 * A trigger's extra descriptor conditions, as the editor holds them: the
 * value stays the text the user typed until it is sent. On the wire a
 * trigger's `conditions` is a list of requires-style `{ key, operator,
 * value }` (see `RequiresInput`: IN/NOT_IN take a list, LTE/GTE a number,
 * EXISTS none).
 */
export type ConditionDraft = {
  key: string;
  operator: DescriptorOperator;
  value: string;
};

export type WireCondition = {
  key: string;
  operator: DescriptorOperator;
  value?: unknown;
};

export const OPERATOR_LABELS: Record<DescriptorOperator, string> = {
  [DescriptorOperator.Equals]: "is",
  [DescriptorOperator.NotEquals]: "is not",
  [DescriptorOperator.In]: "is one of",
  [DescriptorOperator.NotIn]: "is none of",
  [DescriptorOperator.Gte]: "≥",
  [DescriptorOperator.Lte]: "≤",
  [DescriptorOperator.Contains]: "contains",
  [DescriptorOperator.Matches]: "matches",
  [DescriptorOperator.Exists]: "exists",
};

export const KIND_LABELS: Record<SignalKind, string> = {
  [SignalKind.Created]: "created",
  [SignalKind.Updated]: "updated",
  [SignalKind.Deleted]: "deleted",
};

/** A typed scalar: JSON when it reads as JSON (numbers, booleans), else the text. */
const scalar = (raw: string): unknown => {
  const text = raw.trim();
  if (text === "") return "";
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? text : parsed;
  } catch {
    return text;
  }
};

export type ConditionResult =
  | { ok: true; condition: WireCondition }
  | { ok: false; error: string };

export const toWireCondition = (draft: ConditionDraft): ConditionResult => {
  const key = draft.key.trim();
  if (!key) return { ok: false, error: "A condition needs a key" };
  const { operator } = draft;

  switch (operator) {
    case DescriptorOperator.Exists:
      return { ok: true, condition: { key, operator } };
    case DescriptorOperator.In:
    case DescriptorOperator.NotIn: {
      const items = draft.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map(scalar);
      if (items.length === 0) {
        return { ok: false, error: `"${key}" needs at least one value` };
      }
      return { ok: true, condition: { key, operator, value: items } };
    }
    case DescriptorOperator.Gte:
    case DescriptorOperator.Lte: {
      const value = Number(draft.value.trim());
      if (draft.value.trim() === "" || Number.isNaN(value)) {
        return { ok: false, error: `"${key}" compares against a number` };
      }
      return { ok: true, condition: { key, operator, value } };
    }
    default:
      return { ok: true, condition: { key, operator, value: scalar(draft.value) } };
  }
};

export const toWireConditions = (
  drafts: ConditionDraft[],
): { ok: true; conditions: WireCondition[] } | { ok: false; error: string } => {
  const conditions: WireCondition[] = [];
  for (const draft of drafts) {
    const result = toWireCondition(draft);
    if (!result.ok) return result;
    conditions.push(result.condition);
  }
  return { ok: true, conditions };
};

const OPERATORS = new Set<string>(Object.values(DescriptorOperator));

/** A stored `conditions` value back into editor rows; anything unreadable is dropped. */
export const fromWireConditions = (conditions: unknown): ConditionDraft[] => {
  if (!Array.isArray(conditions)) return [];
  return conditions.flatMap((item): ConditionDraft[] => {
    if (!item || typeof item !== "object") return [];
    const { key, operator, value } = item as Record<string, unknown>;
    if (typeof key !== "string" || typeof operator !== "string" || !OPERATORS.has(operator)) {
      return [];
    }
    const text = Array.isArray(value)
      ? value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ")
      : value === undefined || value === null
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value);
    return [{ key, operator: operator as DescriptorOperator, value: text }];
  });
};

/** One condition in words: `channels ≥ 3`. */
export const describeCondition = (condition: WireCondition | ConditionDraft): string => {
  const label = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  if (condition.operator === DescriptorOperator.Exists) return `${condition.key} ${label}`;
  const value = condition.value;
  const text = Array.isArray(value)
    ? value.map(String).join(", ")
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  return `${condition.key} ${label} ${text}`;
};
