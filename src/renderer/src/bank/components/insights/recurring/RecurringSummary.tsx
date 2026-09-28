import { cn } from "@/core/util/utils";
import { BankRecurring } from "@/bank/linkers";
import { useRecurringInsightsQuery } from "../../../api/graphql";
import { formatDay, formatMoney, toNumber } from "../../../format";
import RecurringCard from "../../cards/RecurringCard";
import { CategoryBadge } from "../../CategoryBadge";
import { InsightBlock, InsightStat, mainCurrency, RankedBars } from "../parts";

/**
 * What the confirmed recurring payments add up to: the monthly commitment,
 * payments that did not come, price changes, where the commitment goes and
 * what is due soon. Each part renders only when it has something to show.
 */
export const RecurringSummary = () => {
  const { data } = useRecurringInsightsQuery();
  const insights = data?.recurringInsights;
  if (!insights) return null;

  const currency = mainCurrency(insights.monthlyCommitted);
  const committed = insights.monthlyCommitted.filter((row) => toNumber(row.expense) > 0 || toNumber(row.income) > 0);
  const byCategory = insights.byCategory.filter(
    (row) => row.currency === currency && toNumber(row.monthly) > 0,
  );
  const empty =
    committed.length === 0 &&
    insights.missed.length === 0 &&
    insights.priceChanges.length === 0 &&
    byCategory.length === 0 &&
    insights.dueSoon.length === 0;
  if (empty) return null;

  return (
    <div className="flex flex-col gap-6">
      {committed.length > 0 && (
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {committed.map((row) => (
            <InsightStat
              key={row.currency}
              label={committed.length > 1 ? `Committed per month (${row.currency})` : "Committed per month"}
              value={formatMoney(row.expense, row.currency)}
              hint={`${row.count} ${row.count === 1 ? "payment" : "payments"}`}
            />
          ))}
          {committed.map(
            (row) =>
              toNumber(row.income) > 0 && (
                <InsightStat
                  key={`in-${row.currency}`}
                  label={committed.length > 1 ? `Coming in per month (${row.currency})` : "Coming in per month"}
                  value={formatMoney(row.income, row.currency)}
                />
              ),
          )}
        </div>
      )}

      {insights.missed.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
            Missed · expected more than 3 days ago, not seen since
          </span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
            {insights.missed.map((payment) => (
              <RecurringCard key={payment.id} item={payment} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {insights.priceChanges.length > 0 && (
          <InsightBlock title="Price changes">
            <div className="flex flex-col divide-y text-sm">
              {insights.priceChanges.map((change) => {
                const up = Math.abs(toNumber(change.current)) > Math.abs(toNumber(change.previous));
                return (
                  <div key={change.recurring.id} className="flex items-center justify-between gap-3 py-1.5">
                    <BankRecurring.DetailLink object={change.recurring} className="truncate hover:underline">
                      {change.recurring.label}
                    </BankRecurring.DetailLink>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums text-xs">
                      <span className="text-muted-foreground line-through">
                        {formatMoney(Math.abs(toNumber(change.previous)), change.currency)}
                      </span>
                      <span>{formatMoney(Math.abs(toNumber(change.current)), change.currency)}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          up
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {up ? "+" : "−"}
                        {formatMoney(Math.abs(toNumber(change.delta)), change.currency)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </InsightBlock>
        )}

        {byCategory.length > 0 && (
          <InsightBlock title="Per month, by category">
            <RankedBars
              rows={byCategory
                .sort((a, b) => toNumber(b.monthly) - toNumber(a.monthly))
                .map((row) => ({
                  key: row.category?.id ?? "none",
                  label: row.category ? (
                    <CategoryBadge category={row.category} className="text-sm" />
                  ) : (
                    <span className="text-xs italic text-muted-foreground">Uncategorized</span>
                  ),
                  amount: row.monthly,
                  currency: row.currency,
                  color: row.category?.color,
                  hint: <>{row.count}× · </>,
                }))}
            />
          </InsightBlock>
        )}

        {insights.dueSoon.length > 0 && (
          <InsightBlock title="Due in the next 30 days">
            <div className="flex flex-col divide-y text-sm">
              {insights.dueSoon.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 py-1.5">
                  <BankRecurring.DetailLink object={payment} className="truncate hover:underline">
                    {payment.label}
                  </BankRecurring.DetailLink>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {payment.nextExpected && <>{formatDay(payment.nextExpected)} · </>}
                    <span className="text-foreground">{formatMoney(payment.amount, payment.currency, { signed: true })}</span>
                  </span>
                </div>
              ))}
            </div>
          </InsightBlock>
        )}
      </div>
    </div>
  );
};
