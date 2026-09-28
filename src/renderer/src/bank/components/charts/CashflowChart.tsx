import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/ui/chart";
import { cn } from "@/core/util/utils";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { CashflowBucketFragment } from "../../api/graphql";
import { formatCompact, formatMonth, formatMoney, formatShortDay, toNumber } from "../../format";
import { dominantCurrency } from "./currency";

const config = {
  income: { label: "Income", color: "var(--chart-2)" },
  expense: { label: "Spent", color: "var(--chart-1)" },
  net: { label: "Net", color: "var(--foreground)" },
} satisfies ChartConfig;

/**
 * Money in and out per period, side by side, with the net as a line over them.
 * Transfers between own accounts are already left out by the query.
 */
export const CashflowChart = ({
  buckets,
  weekly = false,
  className,
}: {
  buckets: readonly CashflowBucketFragment[];
  weekly?: boolean;
  className?: string;
}) => {
  const currency = dominantCurrency(buckets);
  if (!currency) {
    return (
      <div className={cn("flex h-40 items-center justify-center text-xs text-muted-foreground", className)}>
        No money moved in this period
      </div>
    );
  }
  const data = buckets
    .filter((bucket) => bucket.currency === currency)
    .map((bucket) => ({
      period: bucket.periodStart,
      income: toNumber(bucket.income),
      expense: toNumber(bucket.expense),
      net: toNumber(bucket.net),
    }));
  const label = (period: string) => (weekly ? formatShortDay(period) : formatMonth(period));

  return (
    <ChartContainer config={config} className={cn("h-56 w-full", className)}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickFormatter={label} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => label(payload?.[0]?.payload?.period)}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-mono tabular-nums">{formatMoney(value as number, currency)}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Line dataKey="net" stroke="var(--color-net)" strokeWidth={1.5} dot={false} type="monotone" />
      </ComposedChart>
    </ChartContainer>
  );
};

