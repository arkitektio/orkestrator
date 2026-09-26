import { useDialog } from "@/core/dialogs/registry";
import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  MerchantCandidateFragment,
  useCategorizeTransactionsMutation,
  useMerchantCandidatesQuery,
} from "../api/graphql";
import { SuggestionChip } from "../components/CategorySuggestions";
import { toastText } from "../errors";
import { MerchantSectionNav } from "../components/merchants/MerchantSectionNav";
import { Money } from "../components/Money";

/** "SPAR DANKT 3418" → "Spar Dankt 3418": a starting name, edited in the dialog. */
const titleCase = (text: string) => text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const CandidateCard = ({ candidate }: { candidate: MerchantCandidateFragment }) => {
  const { openDialog } = useDialog();
  const [categorize, { loading: categorizing }] = useCategorizeTransactionsMutation();
  const name = titleCase(candidate.key);
  const suggested = candidate.suggestedCategory;
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{name}</span>
        {candidate.totals.map((total) => (
          <Money key={total.currency} amount={total.amount} currency={total.currency} signed className="shrink-0 text-sm" />
        ))}
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {candidate.samples.map((sample) => (
          <span key={sample} className="truncate font-mono">
            {sample}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {candidate.count} transactions
          {candidate.storeCodes > 0 && <> · {candidate.storeCodes} {candidate.storeCodes === 1 ? "store" : "stores"}</>}
        </span>
        {suggested && (
          <SuggestionChip
            category={suggested}
            disabled={categorizing}
            title={`Categorize all ${candidate.count} as ${suggested.name}`}
            onClick={() =>
              categorize({ variables: { ids: candidate.transactionIds, category: suggested.id } })
                .then(() => toast.success(`${candidate.count} categorized as ${suggested.name}`))
                .catch((e) => toast.error("Could not categorize: " + toastText(e)))
            }
          />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link to={`/bank/transactions?search=${encodeURIComponent(candidate.key)}`}>Transactions</Link>
        </Button>
        <Button
          size="sm"
          onClick={() =>
            openDialog(
              "bankcreatemerchant",
              {
                name,
                category: candidate.suggestedCategory?.id ?? null,
                fromTransactions: candidate.transactionIds,
              },
              { size: "medium" },
            )
          }
        >
          Create merchant
        </Button>
      </div>
    </Card>
  );
};

/**
 * Counterparties that keep coming back without a merchant, most frequent
 * first: each is a merchant waiting to be created from its transactions.
 */
const DiscoverMerchantsPage = () => {
  const { data, loading } = useMerchantCandidatesQuery({ variables: { limit: 50 } });
  const candidates = data?.merchantCandidates ?? [];

  return (
    <PageLayout title="Discover merchants">
      <MerchantSectionNav className="mb-3" />
      {candidates.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2 p-3">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.key} candidate={candidate} />
          ))}
        </div>
      ) : (
        <p className="p-3 text-sm text-muted-foreground">
          {loading ? "Loading…" : "Every recurring counterparty already has a merchant."}
        </p>
      )}
    </PageLayout>
  );
};

export default DiscoverMerchantsPage;
