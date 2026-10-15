import { PageLayout } from "@/core/layout/PageLayout";
import { HomeEmpty, HomeError, HomeSection, ModuleHome } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankAccount, BankRecurring } from "@/bank/linkers";
import {
  RecurringStatus,
  useListBankAccountsQuery,
  useListBankConnectionsQuery,
  useListRecurringPaymentsQuery,
  useMerchantCandidatesQuery,
  useTransactionsCountQuery,
} from "../api/graphql";
import AccountCard from "../components/cards/AccountCard";
import RecurringCard from "../components/cards/RecurringCard";
import { AttentionChips } from "../components/home/AttentionChips";
import TransactionList from "../components/lists/TransactionList";
import { firstOfMonth } from "../format";
import { BANK_HELP } from "../help";

const ALL_LINK = "text-[11px] font-normal normal-case tracking-normal hover:text-foreground";

/**
 * What changed since you last looked: what wants a look, the accounts, the
 * newest bookings and what is due. The charts and breakdowns are the
 * Overview's, one tile away.
 */
const Recent = () => {
  const uncategorized = useTransactionsCountQuery({
    variables: { filters: { uncategorized: true, isTransfer: false, dateFrom: firstOfMonth() } },
  });
  const candidates = useMerchantCandidatesQuery();
  const connections = useListBankConnectionsQuery({ variables: { pagination: { limit: 50 } } });
  const accounts = useListBankAccountsQuery({ variables: { pagination: { limit: 50 } } });
  const recurring = useListRecurringPaymentsQuery({
    variables: { filters: { status: RecurringStatus.Confirmed }, pagination: { limit: 5 } },
  });

  const accountRows = accounts.data?.bankAccounts ?? [];
  // Server-ordered by nextExpected (the query's default ordering).
  const upcoming = recurring.data?.recurringPayments ?? [];

  return (
    <>
      <AttentionChips
        uncategorized={uncategorized.data?.transactionsCount ?? 0}
        discover={candidates.data?.merchantCandidates.length ?? 0}
        reauth={(connections.data?.bankConnections ?? []).filter((c) => c.needsReauth).length}
      />

      {accountRows.length > 0 && (
        <HomeSection
          title={
            <span className="flex w-full items-center justify-between">
              Accounts
              <BankAccount.ListLink className={ALL_LINK}>All →</BankAccount.ListLink>
            </span>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {accountRows.map((account) => (
              <AccountCard key={account.id} item={account} />
            ))}
          </div>
        </HomeSection>
      )}

      <TransactionList title="Recent transactions" defaultLimit={8} />

      {upcoming.length > 0 && (
        <HomeSection
          title={
            <span className="flex w-full items-center justify-between">
              Coming up
              <BankRecurring.ListLink className={ALL_LINK}>All →</BankRecurring.ListLink>
            </span>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2">
            {upcoming.map((payment) => (
              <RecurringCard key={payment.id} item={payment} />
            ))}
          </div>
        </HomeSection>
      )}
    </>
  );
};

const DashboardPage = () => {
  const { data, error, refetch } = useListBankConnectionsQuery({ variables: { pagination: { limit: 1 } } });
  const empty = data && data.bankConnections.length === 0;

  return (
    <PageLayout
      help={BANK_HELP.dashboard}
      title="Bank"
      pageActions={
        <DialogButton name="banklink" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
          Link bank
        </DialogButton>
      }
    >
      <ModuleHome
        moduleKey="bank"
        title="Bank"
        description="Your accounts, bookings and budgets, synced read-only from your banks."
      >
        {error && !data ? (
          <HomeError what="your banks" error={error} onRetry={() => refetch()} />
        ) : empty ? (
          <HomeEmpty title="Link your first bank">
            Press <b>Link bank</b> and give read-only consent at your bank; its
            accounts, balances and transactions sync here.
          </HomeEmpty>
        ) : (
          data && <Recent />
        )}
      </ModuleHome>
    </PageLayout>
  );
};

export default DashboardPage;
