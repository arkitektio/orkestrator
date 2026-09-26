import { CategoryKind, RuleDirection, RuleField, RuleMatch } from "../api/graphql";

export const KIND_OPTIONS = [
  { label: "Expense", value: CategoryKind.Expense, description: "Money going out" },
  { label: "Income", value: CategoryKind.Income, description: "Money coming in" },
  { label: "Transfer", value: CategoryKind.Transfer, description: "Between own accounts; left out of stats" },
];

export const FIELD_OPTIONS = [
  { label: "Counterparty", value: RuleField.Counterparty, description: "Who was paid, or who paid" },
  { label: "Remittance", value: RuleField.Remittance, description: "The purpose line" },
  { label: "IBAN", value: RuleField.Iban, description: "The counterparty's IBAN" },
];

export const MATCH_OPTIONS = [
  { label: "Contains", value: RuleMatch.Contains },
  { label: "Equals", value: RuleMatch.Equals },
  { label: "Regex", value: RuleMatch.Regex },
];

export const DIRECTION_OPTIONS = [
  { label: "Both", value: RuleDirection.Any },
  { label: "Money out", value: RuleDirection.Out },
  { label: "Money in", value: RuleDirection.In },
];

/** Category colours offered in the swatch row. */
export const CATEGORY_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#64748b",
];

/** A form number as the Decimal string the API wants, or null when empty. */
export const decimalOrNull = (value: unknown): string | null =>
  value === null || value === undefined || value === "" || Number.isNaN(Number(value)) ? null : String(value);
