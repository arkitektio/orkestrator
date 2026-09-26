import { cn } from "@/core/util/utils";
import { usePortfolioInsightsQuery } from "../../../api/graphql";
import { formatMoney, toNumber } from "../../../format";
import { Money } from "../../Money";
import { inCurrency, InsightBlock, InsightStat, percent, RankedBars } from "../parts";
import { ValuationChart } from "./ValuationChart";

/**
 * The depot as a whole: value, what went in, the gain on it, the value over
 * time, the split by security type and the payouts (and fees) per year. Parts
 * without data are left out.
 */
export const PortfolioInsights = ({ accounts }: { accounts?: string[] }) => {
  const { data } = usePortfolioInsightsQuery({ variables: { accounts: accounts?.length ? accounts : null } });
  const insights = data?.portfolioInsights;
  if (!insights || insights.valuation.length === 0) return null;

  // The currency most of the depot is valued in.
  const currency = [...insights.valuation].sort((a, b) => toNumber(b.amount) - toNumber(a.amount))[0].currency;
  const valuation = inCurrency(insights.valuation, currency);
  const cost = inCurrency(insights.costBasis, currency);
  const gain = inCurrency(insights.unrealizedGain, currency);
  const gainValue = toNumber(gain?.amount);
  const gainShare = cost && toNumber(cost.amount) ? gainValue / toNumber(cost.amount) : null;

  const allocation = insights.allocation
    .filter((row) => row.currency === currency)
    .sort((a, b) => b.share - a.share);
  const years = [...new Set(insights.income.map((row) => row.year))].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {valuation && <InsightStat label="Value" value={formatMoney(valuation.amount, currency)} />}
        {cost && <InsightStat label="Cost basis" value={formatMoney(cost.amount, currency)} hint="FIFO price of current positions" />}
        {gain && (
          <InsightStat
            label="Unrealized gain"
            value={
              <span className={cn(gainValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {formatMoney(gain.amount, currency, { signed: true })}
              </span>
            }
            hint={gainShare != null ? `${gainShare >= 0 ? "+" : "−"}${percent(Math.abs(gainShare), 1)} on cost` : undefined}
          />
        )}
      </div>

      <ValuationChart history={insights.valuationHistory} currency={currency} />

      <div className="grid gap-6 lg:grid-cols-2">
        {allocation.length > 0 && (
          <InsightBlock title="Allocation">
            <RankedBars
              rows={allocation.map((row) => ({
                key: row.securityType,
                label: <span className="capitalize">{row.securityType.toLowerCase().replace(/_/g, " ")}</span>,
                amount: row.valuation,
                currency: row.currency,
                share: row.share,
              }))}
            />
          </InsightBlock>
        )}

        {years.length > 0 && (
          <InsightBlock title="Income and costs per year">
            <div className="flex flex-col gap-3 text-sm">
              {years.map((year) => {
                const rows = insights.income.filter((row) => row.year === year);
                return (
                  <div key={year} className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">{year}</span>
                    <div className="flex flex-col divide-y">
                      {rows.map((row) => (
                        <div key={`${row.kind}-${row.currency}`} className="flex items-center justify-between gap-3 py-1">
                          <span className="capitalize">
                            {row.kind.toLowerCase().replace(/_/g, " ")}
                            <span className="text-xs text-muted-foreground"> · {row.count}×</span>
                          </span>
                          <Money amount={row.amount} currency={row.currency} signed className="tabular-nums" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </InsightBlock>
        )}
      </div>
    </div>
  );
};
