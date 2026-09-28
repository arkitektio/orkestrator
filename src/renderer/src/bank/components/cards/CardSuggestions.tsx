import { toast } from "@/core/notify";
import { CategorySource, SuggestionChipFragment, SuggestionReason, useCategorizeTransactionsMutation } from "../../api/graphql";
import { toastText } from "../../errors";
import { SuggestionChip } from "../CategorySuggestions";

const REASONS: Record<SuggestionReason, string> = {
  [SuggestionReason.Neighbours]: "similar transactions",
  [SuggestionReason.Terms]: "the category's terms",
  [SuggestionReason.Both]: "similar transactions and the category's terms",
};

/**
 * One-click categories on a list row that still needs one: uncategorized, or
 * only guessed. Picking one sets it by hand (rules and guesses leave it alone
 * after that). On a guessed row, the guess itself is offered first as "keep".
 */
export const CardSuggestions = ({
  transaction,
  source,
  current,
  suggestions,
}: {
  transaction: string;
  source: CategorySource;
  current?: string | null;
  suggestions: readonly SuggestionChipFragment[];
}) => {
  const [categorize, { loading }] = useCategorizeTransactionsMutation();
  if (suggestions.length === 0) return null;

  const pick = (category: { id: string; name: string }) =>
    categorize({ variables: { ids: [transaction], category: category.id } })
      .then(() => toast.success(`Categorized as ${category.name}`))
      .catch((e) => toast.error("Could not categorize: " + toastText(e)));

  // Guessed rows: the guess first, then the alternatives.
  const ordered =
    source === CategorySource.Semantic
      ? [...suggestions].sort((a, b) => Number(b.category.id === current) - Number(a.category.id === current))
      : suggestions;

  return (
    // Inside a draggable, selectable card: a chip click must not select or open it.
    <div
      className="flex flex-wrap items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {ordered.map((suggestion) => {
        const keep = source === CategorySource.Semantic && suggestion.category.id === current;
        return (
          <SuggestionChip
            key={suggestion.category.id}
            category={keep ? { ...suggestion.category, name: `Keep ${suggestion.category.name}` } : suggestion.category}
            score={suggestion.score}
            disabled={loading}
            title={
              `${Math.round(suggestion.score * 100)}% · from ${REASONS[suggestion.reason]}` +
              (suggestion.neighbours > 0 ? ` (${suggestion.neighbours})` : "")
            }
            onClick={() => pick(suggestion.category)}
          />
        );
      })}
    </div>
  );
};
