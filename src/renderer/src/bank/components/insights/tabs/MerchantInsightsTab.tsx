import { useMerchantInsightsQuery } from "../../../api/graphql";
import { CashflowChart } from "../../charts/CashflowChart";
import { usePeriod } from "../period";
import { inCurrency, InsightBlock, InsightStat, mainCurrency, percent, Tickets, Visits, WeekdayBars } from "../parts";
import { RankedLocations } from "../ranked";
import { TabShell, TotalsStats } from "./common";

/** A merchant's numbers over a period: totals, tickets, visits, rhythm, places. */
export const MerchantInsightsTab = ({ merchant }: { merchant: string }) => {
  const { period, setPeriod, window } = usePeriod("year");
  const { data, loading } = useMerchantInsightsQuery({ variables: { merchant: { id: merchant }, window } });
  const insights = data?.merchantInsights;
  const currency = insights ? mainCurrency(insights.totals) : undefined;
  const share = insights ? inCurrency(insights.shareOfCategory, currency) : undefined;
  const hasMoney = !!insights?.totals.some((row) => row.count > 0);

  return (
    <TabShell period={period} onPeriod={setPeriod} loading={loading && !insights}>
      {insights && (
        <>
          <TotalsStats totals={insights.totals} changes={insights.changes} currency={currency} />
          {hasMoney && (
            <>
              {share && share.share > 0 && (
                <InsightStat label="Of its category" value={percent(share.share)} hint="of the spending there" />
              )}
              <InsightBlock title="Payment size">
                <Tickets tickets={insights.tickets} currency={currency} />
              </InsightBlock>
              {insights.visits.visits > 0 && (
                <InsightBlock title="Visits">
                  <Visits visits={insights.visits} />
                </InsightBlock>
              )}
              {insights.monthly.length > 1 && (
                <InsightBlock title="Per month">
                  <CashflowChart buckets={insights.monthly} className="h-40" />
                </InsightBlock>
              )}
              {insights.weekdays.length > 0 && (
                <InsightBlock title="By weekday">
                  <WeekdayBars weekdays={insights.weekdays} currency={currency} />
                </InsightBlock>
              )}
              {insights.locations.length > 1 && (
                <InsightBlock title="Places">
                  <RankedLocations rows={insights.locations} currency={currency} />
                </InsightBlock>
              )}
            </>
          )}
        </>
      )}
    </TabShell>
  );
};
