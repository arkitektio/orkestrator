import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { BankAccount, BankConnection } from "@/bank/linkers";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AccountKind,
  ListTransactionsDocument,
  useHoldingsQuery,
  useAccountSyncsSubscription,
  useBalanceHistoryQuery,
  useForecastQuery,
  useGetBankAccountQuery,
  useSyncAccountMutation,
} from "../api/graphql";
import { useBank } from "../api/funcs";
import { ProblemBanner } from "../components/ProblemBanner";
import { toastText } from "../errors";
import { syncBudget } from "../sync";
import { BalanceChart } from "../components/charts/BalanceChart";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { InfoList } from "../components/InfoList";
import TransactionList from "../components/lists/TransactionList";
import { Money } from "../components/Money";
import { daysAgo, formatDay, formatIban, isoDay } from "../format";
import { PortfolioOverview } from "../components/holdings/PortfolioOverview";
import { Input } from "@/core/ui/input";

const RANGES = { "30": 30, "90": 90, "365": 365 } as const;
type Range = keyof typeof RANGES;

const AccountPage = asDetailQueryRoute(useGetBankAccountQuery, ({ data, refetch }) => {
  const account = data.bankAccount;
  const [range, setRange] = useState<Range>("90");
  const [showForecast, setShowForecast] = useState(false);
  const base = useMemo(() => ({ accounts: [account.id] }), [account.id]);
  const { filters, ordering, actions } = useTransactionFilterBar(base, {
    kinds: account.kind === AccountKind.Depot,
  });

  const history = useBalanceHistoryQuery({
    variables: { account: account.id, dateFrom: daysAgo(RANGES[range]) },
  });
  const forecast = useForecastQuery({
    variables: { account: account.id, horizonDays: 60, includeDetected: false, includeBudgets: true },
    skip: !showForecast,
  });

  const budget = syncBudget(account);
  const [sync, { loading: syncing }] = useSyncAccountMutation({
    variables: { id: account.id },
    refetchQueries: [ListTransactionsDocument],
  });

  // A background sweep finished this account: pull the new rows in.
  const client = useBank();
  useAccountSyncsSubscription({
    onData: ({ data: event }) => {
      if (event.data?.accountSyncs.accountId !== account.id) return;
      void refetch();
      void history.refetch();
      void client.refetchQueries({ include: [ListTransactionsDocument] });
    },
  });
  // A depot's holdings: today's by default, or those of a chosen day.
  const depot = account.kind === AccountKind.Depot;
  const [asOf, setAsOf] = useState("");
  const pastHoldings = useHoldingsQuery({
    variables: { account: account.id, date: asOf },
    skip: !depot || !asOf,
  });
  const holdings = asOf ? pastHoldings.data?.holdings ?? [] : account.currentHoldings;

  const name = account.name || account.product || formatIban(account.iban) || "Account";
  const balance = account.latestBalance;

  return (
    <BankAccount.ModelPage
      title={name}
      object={account}
      pageActions={
        <>
          {depot && (
            <PageAction.Slot collapse="hide" priority={-5}>
              <Input
                type="date"
                aria-label="Holdings as of"
                title="Holdings as of a past day"
                value={asOf}
                max={isoDay(new Date())}
                onChange={(e) => setAsOf(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </PageAction.Slot>
          )}
          {actions}
          <PageAction
            size="sm"
            collapse="icon"
            icon={<RefreshCw className={"h-4 w-4" + (syncing || account.isSyncing ? " animate-spin" : "")} />}
            disabled={syncing || account.isSyncing || budget.blocked}
            title={budget.title}
            onClick={() =>
              sync()
                .then((r) => {
                  const result = r.data?.syncAccount;
                  toast.success(
                    result
                      ? `Synced: ${result.created} new, ${result.updated} updated` +
                          (result.holdings ? `, ${result.holdings} positions` : "")
                      : "Synced",
                  );
                })
                .catch((e) => toast.error(toastText(e, account)))
            }
          >
            Sync now
          </PageAction>
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["IBAN", account.iban && <span className="font-mono text-xs">{formatIban(account.iban)}</span>],
              ["Kind", account.kind.toLowerCase()],
              ["Product", account.product],
              ["Currency", account.currency],
              [
                "Bank",
                account.connection && (
                  <BankConnection.DetailLink object={account.connection}>
                    {account.connection.aspspName}
                  </BankConnection.DetailLink>
                ),
              ],
              ["Linked", <Timestamp date={account.createdAt} relative />],
              ["Last sync", account.lastSyncedAt && <Timestamp date={account.lastSyncedAt} relative />],
              ["Syncs left today", budget.remaining],
              ["Next sync allowed", budget.until && <Timestamp date={budget.until} relative />],
              ["Balance as of", balance && `${formatDay(balance.date)} (${balance.balanceType})`],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-6">
        <ProblemBanner
          code={account.lastErrorCode}
          message={account.lastError}
          needsReauth={account.connection?.needsReauth}
          nextSyncAllowedAt={account.nextSyncAllowedAt}
          relink={account.connection}
        />

        {depot && (
          <>
            {asOf && (
              <div className="text-xs text-muted-foreground">
                Holdings as of {formatDay(asOf)} ·{" "}
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => setAsOf("")}>
                  back to today
                </button>
              </div>
            )}
            <PortfolioOverview holdings={holdings} />
          </>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{depot ? "Value over time" : "Balance"}</div>
            {!depot && (
              <div className="text-3xl font-semibold">
                {balance ? <Money amount={balance.amount} currency={balance.currency} /> : "—"}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={range}
              onValueChange={(v) => v && setRange(v as Range)}
            >
              <ToggleGroupItem value="30">30d</ToggleGroupItem>
              <ToggleGroupItem value="90">90d</ToggleGroupItem>
              <ToggleGroupItem value="365">1y</ToggleGroupItem>
            </ToggleGroup>
            {!depot && (
              <ToggleGroup
                type="multiple"
                size="sm"
                variant="outline"
                value={showForecast ? ["forecast"] : []}
                onValueChange={(v) => setShowForecast(v.includes("forecast"))}
              >
                <ToggleGroupItem value="forecast">Forecast</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </div>

        <BalanceChart
          history={history.data?.balanceHistory ?? []}
          forecast={showForecast ? forecast.data?.forecast ?? [] : []}
          currency={account.currency}
        />

        <TransactionList filters={filters} ordering={ordering} defaultLimit={30} title={depot ? "Activity" : "Transactions"} />
      </div>
    </BankAccount.ModelPage>
  );
});

export default AccountPage;
