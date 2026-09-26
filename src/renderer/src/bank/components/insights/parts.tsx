import { cn } from "@/core/util/utils";
import { ReactNode } from "react";
import {
  ChangeFragment,
  MoneyTotalsFragment,
  StatMetric,
  TicketStatsFragment,
  VisitStatsFragment,
  WeekdayTotalsFragment,
} from "../../api/graphql";
import { formatDay, formatMoney, toNumber } from "../../format";
import { dominantCurrency } from "../charts/currency";

/** The currency most of the money is in, for per-currency stat lists. */
export const mainCurrency = (totals: readonly MoneyTotalsFragment[]) => dominantCurrency(totals);

export const inCurrency = <T extends { currency: string }>(rows: readonly T[], currency: string | undefined) =>
  rows.find((row) => row.currency === currency);

export const percent = (share: number, digits = 0) => `${(share * 100).toFixed(digits)}%`;

/**
 * A change against the comparison window, as "+12%". Coloured by whether it
 * is good news: spending up is red, income or net up is green.
 */
export const ChangeBadge = ({ change, className }: { change?: ChangeFragment | null; className?: string }) => {
  if (!change || toNumber(change.delta) === 0) return null;
  const up = toNumber(change.delta) > 0;
  const good = change.metric === StatMetric.Expense ? !up : up;
  const text =
    change.ratio != null
      ? `${up ? "+" : "−"}${Math.abs(change.ratio * 100).toFixed(0)}%`
      : `${up ? "+" : "−"}${formatMoney(Math.abs(toNumber(change.delta)), change.currency)}`;
  return (
    <span
      title={`Before: ${formatMoney(change.previous, change.currency)}`}
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        good ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
        className,
      )}
    >
      {text}
    </span>
  );
};

/** One number with its label (and optionally a change badge or hint). */
export const InsightStat = ({
  label,
  value,
  change,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  change?: ChangeFragment | null;
  hint?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col", className)}>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="flex items-baseline gap-2">
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <ChangeBadge change={change} />
    </span>
    {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
  </div>
);

/** The change of one metric in one currency. */
export const changeOf = (changes: readonly ChangeFragment[], metric: StatMetric, currency: string | undefined) =>
  changes.find((change) => change.metric === metric && change.currency === currency);

/** A small labelled block inside an insights view. */
export const InsightBlock = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
    {children}
  </div>
);

/** How big a typical payment is. */
export const Tickets = ({ tickets, currency }: { tickets: readonly TicketStatsFragment[]; currency?: string }) => {
  const row = inCurrency(tickets, currency) ?? tickets[0];
  if (!row) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <InsightStat label="Typical" value={formatMoney(row.median, row.currency)} hint="median" />
      <InsightStat label="Average" value={formatMoney(row.average, row.currency)} />
      <InsightStat label="Largest" value={formatMoney(row.largest, row.currency)} />
    </div>
  );
};

/** How often someone goes there. */
export const Visits = ({ visits }: { visits: VisitStatsFragment }) => {
  if (visits.visits === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <InsightStat label="Visits" value={visits.visits} />
      {visits.visitsPerMonth != null && (
        <InsightStat label="Per month" value={visits.visitsPerMonth.toFixed(1)} />
      )}
      {visits.averageDaysBetweenVisits != null && (
        <InsightStat label="Every" value={`${visits.averageDaysBetweenVisits.toFixed(0)} d`} hint="on average" />
      )}
      {visits.lastVisit && (
        <InsightStat
          label="Last visit"
          value={formatDay(visits.lastVisit)}
          hint={visits.daysSinceLastVisit != null ? `${visits.daysSinceLastVisit} days ago` : undefined}
          className="col-span-2"
        />
      )}
    </div>
  );
};

// ISO weekday order; the server counts Monday as 0 (Python's `weekday()`).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Money out per weekday, as seven bars. */
export const WeekdayBars = ({ weekdays, currency }: { weekdays: readonly WeekdayTotalsFragment[]; currency?: string }) => {
  const rows = weekdays.filter((row) => row.currency === (currency ?? weekdays[0]?.currency));
  if (!rows.some((row) => toNumber(row.expense) > 0)) return null;
  const byDay = WEEKDAYS.map((_, day) => rows.find((row) => row.weekday === day));
  const max = Math.max(...byDay.map((row) => toNumber(row?.expense)));
  return (
    <div className="flex h-24 items-end gap-1.5">
      {byDay.map((row, day) => (
        <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-sm bg-[var(--chart-1)]"
            style={{ height: `${max ? (toNumber(row?.expense) / max) * 100 : 0}%`, minHeight: row ? 2 : 0 }}
            title={row ? `${formatMoney(row.expense, row.currency)} · ${row.count}×` : "Nothing"}
          />
          <span className="text-[10px] text-muted-foreground">{WEEKDAYS[day]}</span>
        </div>
      ))}
    </div>
  );
};

export type RankedRow = {
  key: string;
  label: ReactNode;
  amount: string | number;
  currency: string;
  share?: number;
  color?: string | null;
  hint?: ReactNode;
};

/** Rows ranked by amount, as bars against the largest (the shape of the home page's breakdowns). */
export const RankedBars = ({ rows, className }: { rows: readonly RankedRow[]; className?: string }) => {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => Math.abs(toNumber(row.amount))));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              {row.hint}
              {row.share != null && <> {percent(row.share)} · </>}
              <span className="text-foreground">{formatMoney(Math.abs(toNumber(row.amount)), row.currency)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground"
              style={{
                width: `${max ? (Math.abs(toNumber(row.amount)) / max) * 100 : 0}%`,
                ...(row.color ? { backgroundColor: row.color } : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
