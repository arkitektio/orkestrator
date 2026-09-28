import { Button } from "@/core/ui/button";
import { toast } from "@/core/notify";
import {
  CategoryCandidatesDocument,
  useCategorizeTransactionsMutation,
  useCategoryCandidatesQuery,
} from "../api/graphql";
import { toastText } from "../errors";
import TransactionCard from "./cards/TransactionCard";

/**
 * Uncategorized (or guessed) transactions that look like they belong in a
 * category, closest first, with one click to move them all in.
 */
export const CategoryCandidates = ({ category, name }: { category: string; name: string }) => {
  const { data, loading } = useCategoryCandidatesQuery({ variables: { id: category } });
  const [categorize, { loading: saving }] = useCategorizeTransactionsMutation({
    refetchQueries: [CategoryCandidatesDocument],
  });
  const candidates = data?.category.candidates ?? [];

  if (loading && candidates.length === 0) return <p className="p-3 text-xs text-muted-foreground">Loading…</p>;
  if (candidates.length === 0)
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Nothing uncategorized looks like it belongs here. A description with the words your bank lines use helps.
      </p>
    );

  return (
    <div className="flex flex-col gap-2 p-3">
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() =>
          categorize({ variables: { ids: candidates.map((tx) => tx.id), category } })
            .then(() => toast.success(`${candidates.length} moved to ${name}`))
            .catch((e) => toast.error("Could not categorize: " + toastText(e)))
        }
      >
        Move all {candidates.length} here
      </Button>
      {candidates.map((tx) => (
        <TransactionCard key={tx.id} item={tx} />
      ))}
    </div>
  );
};
