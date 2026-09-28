import { cn } from "@/core/util/utils";
import { CategorySuggestionFragment, SuggestionReason, useTransactionSuggestionsQuery } from "../api/graphql";

const REASONS: Record<SuggestionReason, string> = {
  [SuggestionReason.Neighbours]: "similar transactions",
  [SuggestionReason.Terms]: "its terms",
  [SuggestionReason.Both]: "similar transactions and its terms",
};

/** Why a category was suggested, for the chip's tooltip. */
export const suggestionTitle = (suggestion: CategorySuggestionFragment) => {
  const evidence = suggestion.evidence
    .map((tx) => tx.counterparty || tx.remittance)
    .filter(Boolean)
    .join(", ");
  return (
    `${Math.round(suggestion.score * 100)}% · from ${REASONS[suggestion.reason]}` +
    (suggestion.neighbours > 0 ? ` (${suggestion.neighbours})` : "") +
    (evidence ? `\nLike: ${evidence}` : "")
  );
};

/** One suggested category as a clickable chip: its colour, its name, and optionally a score. */
export const SuggestionChip = ({
  category,
  score,
  title,
  onClick,
  disabled,
}: {
  category: { name: string; color?: string | null };
  score?: number;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
  >
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
      style={category.color ? { backgroundColor: category.color } : undefined}
    />
    {category.name}
    {score !== undefined && <span className="text-muted-foreground">{Math.round(score * 100)}%</span>}
  </button>
);

/**
 * The categories a transaction most likely belongs to, as one-click chips.
 * Renders nothing until the server has suggestions (no embedding yet → none).
 */
export const CategorySuggestions = ({
  transaction,
  exclude,
  onPick,
  disabled,
  className,
}: {
  transaction: string;
  /** A category not worth suggesting, typically the current one. */
  exclude?: string | null;
  onPick: (category: string) => void;
  disabled?: boolean;
  className?: string;
}) => {
  const { data } = useTransactionSuggestionsQuery({ variables: { id: transaction } });
  const suggestions = (data?.transaction.suggestedCategories ?? []).filter((s) => s.category.id !== exclude);
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-xs text-muted-foreground">Suggested</span>
      {suggestions.map((suggestion) => (
        <SuggestionChip
          key={suggestion.category.id}
          category={suggestion.category}
          score={suggestion.score}
          title={suggestionTitle(suggestion)}
          disabled={disabled}
          onClick={() => onPick(suggestion.category.id)}
        />
      ))}
    </div>
  );
};
