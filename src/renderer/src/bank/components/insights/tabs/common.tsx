import { ReactNode } from "react";
import { ChangeFragment, MoneyTotalsFragment, StatMetric } from "../../../api/graphql";
import { formatMoney, toNumber } from "../../../format";
import { Period, PeriodTabs } from "../period";
import { changeOf, inCurrency, InsightStat } from "../parts";

/** A sidebar insights tab: the period row on top, then the blocks. */
export const TabShell = ({
  period,
  onPeriod,
  loading,
  children,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  loading: boolean;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-5 p-3">
    <PeriodTabs period={period} onPeriod={onPeriod} />
    {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : children}
  </div>
);

/** Spent and received in the window, each with its change when there is one. */
export const TotalsStats = ({
  totals,
  changes = [],
  currency,
}: {
  totals: readonly MoneyTotalsFragment[];
  changes?: readonly ChangeFragment[];
  currency?: string;
}) => {
  const row = inCurrency(totals, currency);
  if (!row || row.count === 0) return <p className="text-xs text-muted-foreground">No transactions in this period.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {toNumber(row.expense) > 0 && (
        <InsightStat
          label="Spent"
          value={formatMoney(row.expense, row.currency)}
          change={changeOf(changes, StatMetric.Expense, row.currency)}
          hint={`${row.count} transactions`}
        />
      )}
      {toNumber(row.income) > 0 && (
        <InsightStat
          label="Received"
          value={formatMoney(row.income, row.currency)}
          change={changeOf(changes, StatMetric.Income, row.currency)}
        />
      )}
    </div>
  );
};
