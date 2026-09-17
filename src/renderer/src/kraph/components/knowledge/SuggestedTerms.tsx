import { TermKind, useSearchAssignableTermsQuery } from "@/kraph/api/graphql";
import { Plus } from "lucide-react";
import { LabelChip } from "./LabelChip";

export type SuggestedTermsProps = {
  onClaim: (term: string) => Promise<void> | void;
  excludeKeys?: readonly string[];
  limit?: number;
};

/**
 * One-click labels for a datum nobody has claimed anything about yet. Until
 * the backend exposes recency, these are simply the organization's words; the
 * order will become "what you used last" once it does.
 */
export const SuggestedTerms = ({ onClaim, excludeKeys = [], limit = 8 }: SuggestedTermsProps) => {
  const { data } = useSearchAssignableTermsQuery({
    variables: { kinds: [TermKind.Entity] },
  });
  const terms = (data?.terms ?? [])
    .filter((term) => !excludeKeys.includes(term.key))
    .slice(0, limit);

  if (terms.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Or pick a word:</span>
      <div className="flex flex-row flex-wrap gap-1.5">
        {terms.map((term) => (
          <LabelChip
            key={term.id}
            label={term.label || term.key}
            color={term.color}
            title={`Claim as ${term.key}`}
            className="border-dashed text-muted-foreground"
            onClick={() => onClaim(term.key)}
          />
        ))}
        <span className="sr-only">
          <Plus className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};

export default SuggestedTerms;
