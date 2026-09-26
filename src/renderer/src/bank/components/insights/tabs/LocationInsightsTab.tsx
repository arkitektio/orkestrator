import { useLocationInsightsQuery } from "../../../api/graphql";
import { CashflowChart } from "../../charts/CashflowChart";
import { usePeriod } from "../period";
import { InsightBlock, mainCurrency, Tickets, Visits, WeekdayBars } from "../parts";
import { TabShell, TotalsStats } from "./common";

/** A place's numbers over a period: totals, tickets, visits, rhythm. */
export const LocationInsightsTab = ({ location }: { location: string }) => {
  const { period, setPeriod, window } = usePeriod("year");
  const { data, loading } = useLocationInsightsQuery({ variables: { location, window } });
  const insights = data?.locationInsights;
  const currency = insights ? mainCurrency(insights.totals) : undefined;
  const hasMoney = !!insights?.totals.some((row) => row.count > 0);

  return (
    <TabShell period={period} onPeriod={setPeriod} loading={loading && !insights}>
      {insights && (
        <>
          <TotalsStats totals={insights.totals} currency={currency} />
          {hasMoney && (
            <>
              {insights.visits.visits > 0 && (
                <InsightBlock title="Visits">
                  <Visits visits={insights.visits} />
                </InsightBlock>
              )}
              <InsightBlock title="Payment size">
                <Tickets tickets={insights.tickets} currency={currency} />
              </InsightBlock>
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
            </>
          )}
        </>
      )}
    </TabShell>
  );
};
