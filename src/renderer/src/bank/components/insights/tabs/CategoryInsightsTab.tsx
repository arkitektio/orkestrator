import { formatMoney, toNumber } from "../../../format";
import { useCategoryInsightsQuery } from "../../../api/graphql";
import { CashflowChart } from "../../charts/CashflowChart";
import { usePeriod } from "../period";
import { inCurrency, InsightBlock, InsightStat, mainCurrency, percent, Tickets } from "../parts";
import { RankedCategories, RankedMerchants } from "../ranked";
import { TabShell, TotalsStats } from "./common";

/** A category's numbers over a period, children rolled up. */
export const CategoryInsightsTab = ({ category }: { category: string }) => {
  const { period, setPeriod, window } = usePeriod("year");
  const { data, loading } = useCategoryInsightsQuery({ variables: { category, window } });
  const insights = data?.categoryInsights;
  const currency = insights ? mainCurrency(insights.totals) : undefined;
  const average = insights ? inCurrency(insights.monthlyAverage, currency) : undefined;
  const share = insights ? inCurrency(insights.shareOfSpending, currency) : undefined;
  const hasMoney = !!insights?.totals.some((row) => row.count > 0);

  return (
    <TabShell period={period} onPeriod={setPeriod} loading={loading && !insights}>
      {insights && (
        <>
          <TotalsStats totals={insights.totals} changes={insights.changes} currency={currency} />
          {hasMoney && (
            <>
              {((average && toNumber(average.expense) > 0) || (share && share.share > 0)) && (
                <div className="grid grid-cols-2 gap-3">
                  {average && toNumber(average.expense) > 0 && (
                    <InsightStat
                      label="Per month"
                      value={formatMoney(average.expense, average.currency)}
                      hint={`average over ${average.count} months`}
                    />
                  )}
                  {share && share.share > 0 && (
                    <InsightStat label="Of all spending" value={percent(share.share)} />
                  )}
                </div>
              )}
              <InsightBlock title="Payment size">
                <Tickets tickets={insights.tickets} currency={currency} />
              </InsightBlock>
              {insights.monthly.length > 1 && (
                <InsightBlock title="Per month">
                  <CashflowChart buckets={insights.monthly} className="h-40" />
                </InsightBlock>
              )}
              {insights.children.some((row) => toNumber(row.expense) > 0) && (
                <InsightBlock title="Subcategories">
                  <RankedCategories rows={insights.children} currency={currency} />
                </InsightBlock>
              )}
              {insights.topMerchants.some((row) => toNumber(row.expense) > 0) && (
                <InsightBlock title="Top merchants">
                  <RankedMerchants rows={insights.topMerchants} currency={currency} />
                </InsightBlock>
              )}
            </>
          )}
        </>
      )}
    </TabShell>
  );
};
