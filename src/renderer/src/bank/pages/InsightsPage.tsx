import { PageLayout } from "@/core/layout/PageLayout";
import { BankMerchant, BankRecurring, BankTransaction } from "@/bank/linkers";
import { ReactNode, useMemo, useState } from "react";
import { Comparison, PeriodOverviewFragment, StatMetric, usePeriodOverviewQuery } from "../api/graphql";
import MerchantCard from "../components/cards/MerchantCard";
import RecurringCard from "../components/cards/RecurringCard";
import TransactionCard from "../components/cards/TransactionCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { CashflowChart } from "../components/charts/CashflowChart";
import { COMPARISONS, PeriodPicker, usePeriod } from "../components/insights/period";
import {
  ChangeBadge,
  changeOf,
  inCurrency,
  InsightStat,
  mainCurrency,
  percent,
  WeekdayBars,
} from "../components/insights/parts";
import { MerchantLogo } from "../components/MerchantLogo";
import { formatDay, formatMoney, toNumber } from "../format";
import { BANK_HELP } from "../help";

const Section = ({ title, link, children }: { title: string; link?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {link}
    </div>
    {children}
  </section>
);

const signedDelta = (delta: string, currency: string) =>
  `${toNumber(delta) > 0 ? "+" : "−"}${formatMoney(Math.abs(toNumber(delta)), currency)}`;

/** What moved most against the comparison window: one row per category or merchant. */
const Movers = ({ rows }: { rows: { key: string; label: ReactNode; change: PeriodOverviewFragment["changes"][number] }[] }) => (
  <div className="flex flex-col divide-y text-sm">
    {rows.map((row) => (
      <div key={row.key} className="flex items-center justify-between gap-3 py-1.5">
        <span className="min-w-0 truncate">{row.label}</span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          <span className="text-xs text-muted-foreground">
            {formatMoney(row.change.previous, row.change.currency)} → {formatMoney(row.change.current, row.change.currency)}
          </span>
          <span className="w-20 text-right text-xs">{signedDelta(row.change.delta, row.change.currency)}</span>
          <ChangeBadge change={row.change} className="w-12 text-center" />
        </span>
      </div>
    ))}
  </div>
);

const Overview = ({ data, compareTo }: { data: PeriodOverviewFragment; compareTo: Comparison }) => {
  const currency = mainCurrency(data.totals);
  const totals = inCurrency(data.totals, currency);
  const savings = inCurrency(data.savingsRate, currency);
  const change = (metric: StatMetric) => (compareTo === Comparison.None ? null : changeOf(data.changes, metric, currency));

  // Days as cashflow buckets, so the daily view reuses the cashflow chart.
  const daily = useMemo(
    () =>
      data.daily.map((day) => ({
        periodStart: day.date,
        currency: day.currency,
        income: day.income,
        expense: day.expense,
        net: String(toNumber(day.income) - toNumber(day.expense)),
        count: day.count,
      })),
    [data.daily],
  );

  const categoryMovers = data.categoryMovers.filter((move) => move.change.currency === currency);
  const merchantMovers = data.merchantMovers.filter((move) => move.change.currency === currency);

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {totals && (
            <>
              <InsightStat label="Spent" value={formatMoney(totals.expense, totals.currency)} change={change(StatMetric.Expense)} />
              <InsightStat label="Income" value={formatMoney(totals.income, totals.currency)} change={change(StatMetric.Income)} />
              <InsightStat
                label="Net"
                value={formatMoney(totals.net, totals.currency, { signed: true })}
                change={change(StatMetric.Net)}
              />
              <InsightStat label="Transactions" value={totals.count} />
            </>
          )}
          {savings && toNumber(totals?.income) > 0 && (
            <InsightStat label="Saved" value={percent(savings.share)} hint="of income" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDay(data.window.start)} – {formatDay(data.window.end)}
          {compareTo !== Comparison.None && data.window.previousStart && data.window.previousEnd && (
            <>
              {" "}
              {COMPARISONS[compareTo]} ({formatDay(data.window.previousStart)} – {formatDay(data.window.previousEnd)})
            </>
          )}
        </span>
      </div>

      {daily.length > 1 && (
        <Section title="Day by day">
          <CashflowChart buckets={daily} weekly className="h-48" />
        </Section>
      )}

      {(categoryMovers.length > 0 || merchantMovers.length > 0) && (
        <div className="grid gap-8 lg:grid-cols-2">
          {categoryMovers.length > 0 && (
            <Section title="Categories that moved">
              <Movers
                rows={categoryMovers.map((move) => ({
                  key: move.category?.id ?? "none",
                  label: move.category ? (
                    <CategoryBadge category={move.category} className="text-sm" />
                  ) : (
                    <span className="text-xs italic text-muted-foreground">Uncategorized</span>
                  ),
                  change: move.change,
                }))}
              />
            </Section>
          )}
          {merchantMovers.length > 0 && (
            <Section title="Merchants that moved">
              <Movers
                rows={merchantMovers.map((move) => ({
                  key: move.merchant?.id ?? "none",
                  label: move.merchant ? (
                    <BankMerchant.DetailLink object={move.merchant} className="flex min-w-0 items-center gap-2 hover:underline">
                      <MerchantLogo merchant={move.merchant} className="h-5 w-5" />
                      <span className="truncate">{move.merchant.name}</span>
                    </BankMerchant.DetailLink>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">No merchant</span>
                  ),
                  change: move.change,
                }))}
              />
            </Section>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {data.weekdays.some((day) => toNumber(day.expense) > 0) && (
          <Section title="Spending by weekday">
            <WeekdayBars weekdays={data.weekdays} currency={currency} />
          </Section>
        )}
        {data.recurringDue.length > 0 && (
          <Section
            title="Recurring payments due"
            link={
              <BankRecurring.ListLink className="text-xs text-muted-foreground hover:text-foreground">All</BankRecurring.ListLink>
            }
          >
            <div className="flex flex-col gap-2">
              {data.recurringDue.map((payment) => (
                <RecurringCard key={payment.id} item={payment} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {data.largestTransactions.length > 0 && (
        <Section
          title="Largest transactions"
          link={
            <BankTransaction.ListLink className="text-xs text-muted-foreground hover:text-foreground">
              All transactions
            </BankTransaction.ListLink>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-2">
            {data.largestTransactions.map((tx) => (
              <TransactionCard key={tx.id} item={tx} />
            ))}
          </div>
        </Section>
      )}

      {data.newMerchants.length > 0 && (
        <Section
          title="New merchants"
          link={
            <BankMerchant.ListLink className="text-xs text-muted-foreground hover:text-foreground">
              All merchants
            </BankMerchant.ListLink>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
            {data.newMerchants.map((merchant) => (
              <MerchantCard key={merchant.id} item={merchant} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

/**
 * A period at a glance against a comparison period: totals and their change,
 * savings rate, day-by-day money, the categories and merchants that moved
 * most, weekdays, the largest transactions, new merchants, recurring due.
 */
const InsightsPage = () => {
  const { period, setPeriod, window } = usePeriod("month");
  const [compareTo, setCompareTo] = useState<Comparison>(Comparison.PreviousPeriod);
  const { data, previousData, loading } = usePeriodOverviewQuery({ variables: { window, compareTo } });
  const overview = (data ?? previousData)?.periodOverview;

  return (
    <PageLayout
      help={BANK_HELP.insights}
      title="Insights"
      pageActions={
        <PeriodPicker period={period} onPeriod={setPeriod} compareTo={compareTo} onCompareTo={setCompareTo} />
      }
    >
      {overview ? (
        <Overview data={overview} compareTo={compareTo} />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">{loading ? "Loading…" : "Nothing to show for this period."}</p>
      )}
    </PageLayout>
  );
};

export default InsightsPage;
