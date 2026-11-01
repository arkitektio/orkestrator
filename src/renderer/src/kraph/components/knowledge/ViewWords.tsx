import { KraphTerm } from "@/core/linkers";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { describeError } from "@/core/notify";
import { useViewWordsQuery } from "@/kraph/api/graphql";
import { termKindLabel, termTint } from "@/kraph/lib/terms";
import { TriangleAlert } from "lucide-react";

/**
 * The words a view speaks, and what it calls each one here: a category is how
 * this view draws a word, so the word is what links out. A category with no word
 * yet is listed by its own label; it can only hold what it derives.
 */
export const ViewWords = ({ graph }: { graph: string }) => {
  const { data, error } = useViewWordsQuery({ variables: { id: graph } });

  if (error && !data) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        title="Couldn't read this view's words"
        description={describeError(error).message}
      />
    );
  }

  const categories = [
    ...(data?.graph.nodeCategories ?? []),
    ...(data?.graph.edgeCategories ?? []),
  ];
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 p-3 text-sm">
      {categories.map((category) => (
        <div key={category.id} className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: termTint(category.term?.color) }}
            aria-hidden
          />
          {category.term ? (
            <KraphTerm.DetailLink object={category.term} className="truncate font-medium">
              {category.term.label || category.term.key}
            </KraphTerm.DetailLink>
          ) : (
            <span className="truncate font-medium">{category.label}</span>
          )}
          {category.term ? (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {termKindLabel(category.term.kind)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
