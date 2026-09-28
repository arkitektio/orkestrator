import { useAccountInsightsQuery } from "../../../api/graphql";
import { formatDay, formatMoney, toNumber } from "../../../format";
import TransactionCard from "../../cards/TransactionCard";
import { CashflowChart } from "../../charts/CashflowChart";
import { usePeriod } from "../period";
import { inCurrency, InsightBlock, InsightStat, mainCurrency } from "../parts";
import { RankedCategories, RankedMerchants } from "../ranked";
import { TabShell, TotalsStats } from "./common";

/** An account's numbers over a period: flows, balance range, where it went, largest lines. */
export const AccountInsightsTab = ({ account }: { account: string }) => {
  const { period, setPeriod, window } = usePeriod("year");
  const { data, loading } = useAccountInsightsQuery({ variables: { account, window } });
  const insights = data?.accountInsights;
  const currency = insights ? mainCurrency(insights.totals) : undefined;
  const average = insights ? (inCurrency(insights.averageBalance, currency) ?? insights.averageBalance[0]) : undefined;
  const { lowestBalance: lowest, highestBalance: highest } = insights ?? {};

  return (
    <TabShell period={period} onPeriod={setPeriod} loading={loading && !insights}>
      {insights && (
        <>
          <TotalsStats totals={insights.totals} currency={currency} />
          {(average || lowest || highest) && (
            <InsightBlock title="Balance">
              <div className="grid grid-cols-2 gap-3">
                {average && <InsightStat label="Average" value={formatMoney(average.amount, average.currency)} />}
                {lowest && (
                  <InsightStat label="Lowest" value={formatMoney(lowest.amount, lowest.currency)} hint={formatDay(lowest.date)} />
                )}
                {highest && (
                  <InsightStat label="Highest" value={formatMoney(highest.amount, highest.currency)} hint={formatDay(highest.date)} />
                )}
              </div>
            </InsightBlock>
          )}
          {insights.monthly.length > 1 && (
            <InsightBlock title="Per month">
              <CashflowChart buckets={insights.monthly} className="h-40" />
            </InsightBlock>
          )}
          {insights.topCategories.some((row) => toNumber(row.expense) > 0) && (
            <InsightBlock title="Top categories">
              <RankedCategories rows={insights.topCategories} currency={currency} />
            </InsightBlock>
          )}
          {insights.topMerchants.some((row) => toNumber(row.expense) > 0) && (
            <InsightBlock title="Top merchants">
              <RankedMerchants rows={insights.topMerchants} currency={currency} />
            </InsightBlock>
          )}
          {insights.largestOut.length > 0 && (
            <InsightBlock title="Largest out">
              <div className="flex flex-col gap-2">
                {insights.largestOut.map((tx) => (
                  <TransactionCard key={tx.id} item={tx} />
                ))}
              </div>
            </InsightBlock>
          )}
          {insights.largestIn.length > 0 && (
            <InsightBlock title="Largest in">
              <div className="flex flex-col gap-2">
                {insights.largestIn.map((tx) => (
                  <TransactionCard key={tx.id} item={tx} />
                ))}
              </div>
            </InsightBlock>
          )}
        </>
      )}
    </TabShell>
  );
};
