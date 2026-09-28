import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { cn } from "@/core/util/utils";
import { BankAccount, BankBudget, BankCategory, BankRecurring, BankTransaction } from "@/bank/linkers";
import { Landmark } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AccountKind,
  Granularity,
  RecurringStatus,
  useBudgetStatusQuery,
  useCashflowQuery,
  useListBankAccountsQuery,
  useListBankConnectionsQuery,
  useListRecurringPaymentsQuery,
  useMerchantCandidatesQuery,
  useMerchantLocationsGeojsonQuery,
  useSpendingByCategoryQuery,
  useSpendingByMerchantQuery,
  useTransactionsCountQuery,
} from "../api/graphql";
import AccountCard from "../components/cards/AccountCard";
import BudgetStatusCard from "../components/cards/BudgetStatusCard";
import RecurringCard from "../components/cards/RecurringCard";
import { CashflowChart } from "../components/charts/CashflowChart";
import { dominantCurrency } from "../components/charts/currency";
import { SpendingBreakdown } from "../components/charts/SpendingBreakdown";
import { AttentionChips } from "../components/home/AttentionChips";
import { ExploreLinks } from "../components/home/ExploreLinks";
import TransactionList from "../components/lists/TransactionList";
import { MerchantMap } from "../components/map/MerchantMap";
import { MerchantSpending } from "../components/merchants/MerchantSpending";
import { daysAgo, firstOfMonth, formatMoney, toNumber } from "../format";

const Section = ({
  title,
  link,
  children,
  className,
}: {
  title: string;
  link?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("flex flex-col gap-3", className)}>
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {link}
    </div>
    {children}
  </section>
);

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "in" | "out" }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={cn(
        "text-2xl font-semibold tabular-nums",
        tone === "in" && "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {value}
    </span>
  </div>
);

/** Nothing linked yet: the one thing to do is link a bank. */
const FirstRun = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
    <Landmark className="h-10 w-10 text-muted-foreground" />
    <div>
      <h2 className="text-lg font-semibold">Link your first bank</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Give read-only consent at your bank and its accounts, balances and transactions sync here.
      </p>
    </div>
    <DialogButton name="banklink" dialogProps={{}} options={{ size: "medium" }}>
      Link a bank
    </DialogButton>
  </div>
);

const RECENT = { limit: 8 };

const Overview = () => {
  const [weekly, setWeekly] = useState(false);
  const monthStart = firstOfMonth();

  const uncategorized = useTransactionsCountQuery({
    variables: { filters: { uncategorized: true, isTransfer: false, dateFrom: monthStart } },
  });
  const accounts = useListBankAccountsQuery({ variables: { pagination: { limit: 50 } } });
  const cashflow = useCashflowQuery({
    variables: weekly
      ? { dateFrom: daysAgo(7 * 16), granularity: Granularity.Week }
      : { dateFrom: firstOfMonth(new Date(), 11), granularity: Granularity.Month },
  });
  const thisMonth = useCashflowQuery({ variables: { dateFrom: monthStart, granularity: Granularity.Month } });
  const spending = useSpendingByCategoryQuery({ variables: { dateFrom: monthStart } });
  const budgets = useBudgetStatusQuery();
  const merchants = useSpendingByMerchantQuery({ variables: { dateFrom: monthStart, limit: 12 } });
  const connections = useListBankConnectionsQuery({ variables: { pagination: { limit: 50 } } });
  const candidates = useMerchantCandidatesQuery();
  // Same variables as the map's own query, so the preview reuses this result.
  const places = useMerchantLocationsGeojsonQuery();
  const recurring = useListRecurringPaymentsQuery({
    variables: { filters: { status: RecurringStatus.Confirmed }, pagination: { limit: 5 } },
  });

  // Balances summed per currency, cash apart from depots (whose balance is a
  // market valuation); a household rarely has more than one currency.
  const totals = useMemo(() => {
    const sums = new Map<string, { label: string; currency: string; amount: number }>();
    const accountsList = accounts.data?.bankAccounts ?? [];
    const hasDepot = accountsList.some((account) => account.kind === AccountKind.Depot);
    for (const account of accountsList) {
      const balance = account.latestBalance;
      if (!balance) continue;
      const label = !hasDepot ? "Balance" : account.kind === AccountKind.Depot ? "Invested" : "Cash";
      const key = `${label}|${balance.currency}`;
      const row = sums.get(key) ?? { label, currency: balance.currency, amount: 0 };
      row.amount += toNumber(balance.amount);
      sums.set(key, row);
    }
    const rows = [...sums.values()].sort((a, b) => a.label.localeCompare(b.label));
    const currencies = new Set(rows.map((row) => row.currency));
    return rows.map((row) => ({ ...row, label: currencies.size > 1 ? `${row.label} (${row.currency})` : row.label }));
  }, [accounts.data]);

  const month = useMemo(() => {
    const buckets = thisMonth.data?.cashflow ?? [];
    const currency = dominantCurrency(buckets);
    return buckets.find((bucket) => bucket.currency === currency);
  }, [thisMonth.data]);

  // Server-ordered by nextExpected (the query's default ordering).
  const upcoming = recurring.data?.recurringPayments ?? [];

  const hasSpending = (spending.data?.spendingByCategory ?? []).some((total) => toNumber(total.expense) > 0);
  const budgetRows = budgets.data?.budgetStatus ?? [];
  const uncategorizedCount = uncategorized.data?.transactionsCount ?? 0;
  const discoverCount = candidates.data?.merchantCandidates.length ?? 0;
  const reauthCount = (connections.data?.bankConnections ?? []).filter((c) => c.needsReauth).length;
  const hasDepot = (accounts.data?.bankAccounts ?? []).some((account) => account.kind === AccountKind.Depot);
  const hasPlaces = (places.data?.merchantLocationsGeojson.features.length ?? 0) > 0;
  const topRows = (merchants.data?.spendingByMerchant ?? []).filter((row) => toNumber(row.expense) > 0);

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {totals.map((row) => (
          <Stat key={row.label} label={row.label} value={formatMoney(row.amount, row.currency)} />
        ))}
        {month && (
          <>
            <Stat label="In this month" value={formatMoney(month.income, month.currency)} tone="in" />
            <Stat label="Out this month" value={formatMoney(month.expense, month.currency)} />
            <Stat label="Net" value={formatMoney(month.net, month.currency, { signed: true })} />
          </>
        )}
      </div>

      <AttentionChips uncategorized={uncategorizedCount} discover={discoverCount} reauth={reauthCount} />

      <ExploreLinks uncategorized={uncategorizedCount} discover={discoverCount} hasDepot={hasDepot} />

      <Section
        title="Cashflow"
        link={
          <span className="flex items-center gap-3">
            <Link to="/bank/insights" className="text-xs text-muted-foreground hover:text-foreground">
              Insights
            </Link>
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={weekly ? "week" : "month"}
              onValueChange={(v) => v && setWeekly(v === "week")}
            >
              <ToggleGroupItem value="month">Months</ToggleGroupItem>
              <ToggleGroupItem value="week">Weeks</ToggleGroupItem>
            </ToggleGroup>
          </span>
        }
      >
        <CashflowChart buckets={cashflow.data?.cashflow ?? []} weekly={weekly} />
      </Section>

      {(hasSpending || budgetRows.length > 0) && (
        <div className="grid gap-8 lg:grid-cols-2">
          {hasSpending && (
            <Section
              title="Spending this month"
              link={
                <BankCategory.ListLink className="text-xs text-muted-foreground hover:text-foreground">
                  Categories
                </BankCategory.ListLink>
              }
            >
              <SpendingBreakdown totals={spending.data!.spendingByCategory} />
            </Section>
          )}
          {budgetRows.length > 0 && (
            <Section
              title="Budgets"
              link={
                <BankBudget.ListLink className="text-xs text-muted-foreground hover:text-foreground">
                  All
                </BankBudget.ListLink>
              }
            >
              <div className="flex flex-col gap-2">
                {budgetRows.map((status) => (
                  <BudgetStatusCard key={status.budget.id} item={status} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {(topRows.length > 0 || upcoming.length > 0) && (
        <div className="grid gap-8 lg:grid-cols-2">
          {topRows.length > 0 && (
            <Section
              title="Where it went this month"
              link={
                <span className="flex gap-3 text-xs text-muted-foreground">
                  <Link to="/bank/merchants" className="hover:text-foreground">
                    Merchants
                  </Link>
                  <Link to="/bank/merchants/top" className="hover:text-foreground">
                    Top
                  </Link>
                </span>
              }
            >
              <MerchantSpending totals={topRows} limit={6} />
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section
              title="Coming up"
              link={
                <BankRecurring.ListLink className="text-xs text-muted-foreground hover:text-foreground">
                  All
                </BankRecurring.ListLink>
              }
            >
              <div className="flex flex-col gap-2">
                {upcoming.map((payment) => (
                  <RecurringCard key={payment.id} item={payment} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {hasPlaces && (
        <Section
          title="Places"
          link={
            <span className="flex gap-3 text-xs text-muted-foreground">
              <Link to="/bank/places" className="hover:text-foreground">
                All places
              </Link>
              <Link to="/bank/merchants" className="hover:text-foreground">
                Open map
              </Link>
            </span>
          }
        >
          <MerchantMap className="h-72" />
        </Section>
      )}

      {!!accounts.data?.bankAccounts.length && (
        <Section
          title="Accounts"
          link={
            <BankAccount.ListLink className="text-xs text-muted-foreground hover:text-foreground">All</BankAccount.ListLink>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {accounts.data.bankAccounts.map((account) => (
              <AccountCard key={account.id} item={account} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Recent"
        link={
          <BankTransaction.ListLink className="text-xs text-muted-foreground hover:text-foreground">
            All transactions
          </BankTransaction.ListLink>
        }
      >
        <TransactionList title="" defaultLimit={RECENT.limit} />
      </Section>
    </div>
  );
};

const HomePage = () => {
  const { data } = useListBankConnectionsQuery({ variables: { pagination: { limit: 1 } } });
  const empty = data && data.bankConnections.length === 0;

  return (
    <PageLayout
      title="Bank"
      pageActions={
        <DialogButton name="banklink" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
          Link bank
        </DialogButton>
      }
    >
      {empty ? <FirstRun /> : <Overview />}
    </PageLayout>
  );
};

export default HomePage;

