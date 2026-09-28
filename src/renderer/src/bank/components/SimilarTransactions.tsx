import { Button } from "@/core/ui/button";
import { toast } from "@/core/notify";
import {
  CategorySource,
  TransactionCategoryFragment,
  useCategorizeTransactionsMutation,
  useListTransactionsQuery,
} from "../api/graphql";
import { toastText } from "../errors";
import TransactionCard from "./cards/TransactionCard";

const NO_ORDERING: [] = [];

/**
 * The transactions most similar to one (same merchant, same kind of payment),
 * closest first. With a `category`, the ones that don't have it yet can take
 * it in one click; ones categorized by hand are left alone.
 */
export const SimilarTransactions = ({
  transaction,
  category,
  limit = 10,
}: {
  transaction: string;
  category?: TransactionCategoryFragment | null;
  limit?: number;
}) => {
  const { data, loading } = useListTransactionsQuery({
    variables: {
      filters: { similarTo: transaction, NOT: { ids: [transaction] } },
      // Any ordering replaces the similarity ranking.
      ordering: NO_ORDERING,
      pagination: { limit },
    },
  });
  const [categorize, { loading: saving }] = useCategorizeTransactionsMutation();
  const similar = data?.transactions ?? [];
  const movable = category
    ? similar.filter((tx) => tx.category?.id !== category.id && tx.categorySource !== CategorySource.Manual)
    : [];

  if (loading && similar.length === 0) return <p className="p-3 text-xs text-muted-foreground">Loading…</p>;
  if (similar.length === 0)
    return <p className="p-3 text-xs text-muted-foreground">Nothing similar yet.</p>;

  return (
    <div className="flex flex-col gap-2 p-3">
      {category && movable.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            categorize({ variables: { ids: movable.map((tx) => tx.id), category: category.id } })
              .then(() => toast.success(`${movable.length} moved to ${category.name}`))
              .catch((e) => toast.error("Could not categorize: " + toastText(e)))
          }
        >
          Move {movable.length} to {category.name}
        </Button>
      )}
      {similar.map((tx) => (
        <TransactionCard key={tx.id} item={tx} />
      ))}
    </div>
  );
};
