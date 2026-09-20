import { useSimilarActionsQuery } from "@/rekuest/api/graphql";
import ActionCard from "../cards/ActionCard";

/** Enough to suggest alternatives without becoming a second catalog. */
export const SIMILAR_LIMIT = 6;

/**
 * Actions whose name and description mean roughly what this one's do, nearest
 * first, as the server ranks them by embedding distance. The server answers
 * with nothing while the action has no vector yet or embeddings are off, and
 * an empty section says nothing — so this renders nothing at all then.
 */
export const SimilarActions = ({ id }: { id: string }) => {
  const { data } = useSimilarActionsQuery({
    variables: { id, limit: SIMILAR_LIMIT },
  });
  const actions = data?.similarActions ?? [];
  if (actions.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Similar actions</h2>
        <p className="text-sm text-muted-foreground">
          Actions whose name and description mean roughly the same.
        </p>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {actions.map((action) => (
          <ActionCard key={action.id} item={action} />
        ))}
      </div>
    </section>
  );
};

export default SimilarActions;
