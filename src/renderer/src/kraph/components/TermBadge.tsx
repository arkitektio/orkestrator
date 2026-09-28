import { ListTermFragment } from "@/kraph/api/graphql";
import { KraphTerm } from "@/core/linkers";
import { termKindLabel, termTint } from "../lib/terms";

/**
 * A category is what a word means in one graph; the term is the word itself.
 * Showing it on a category is the link back to every other graph that speaks
 * it — claims name the term, not the category row.
 */
export const TermBadge = ({
  term,
  className,
}: {
  term?: ListTermFragment | null;
  className?: string;
}) => {
  if (!term) return null;

  return (
    <KraphTerm.DetailLink object={{ id: term.id }}>
      <span
        className={
          "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors " +
          (className ?? "")
        }
        title={`${term.key} · ${termKindLabel(term.kind)}`}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: termTint(term.color) }}
        />
        {term.key}
      </span>
    </KraphTerm.DetailLink>
  );
};
