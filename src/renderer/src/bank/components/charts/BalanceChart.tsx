import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/ui/chart";
import { cn } from "@/core/util/utils";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { formatCompact, formatDay, formatMoney, formatShortDay, toNumber } from "../../format";

const config = {
  balance: { label: "Balance", color: "var(--chart-2)" },
  forecast: { label: "Forecast", color: "var(--chart-4)" },
} satisfies ChartConfig;

type Point = { date: string; amount: string };

/**
 * An account's end-of-day balance, and optionally where it is headed: the
 * forecast continues the line, dashed, from today.
 */
export const BalanceChart = ({
  history,
  forecast = [],
  currency,
  className,
}: {
  history: readonly Point[];
  forecast?: readonly Point[];
  currency: string;
  className?: string;
}) => {
  if (history.length === 0 && forecast.length === 0) {
    return (
      <div className={cn("flex h-40 items-center justify-center text-xs text-muted-foreground", className)}>
        No balance history yet
      </div>
    );
  }
  const byDate = new Map<string, { date: string; balance?: number; forecast?: number }>();
  for (const point of history) byDate.set(point.date, { date: point.date, balance: toNumber(point.amount) });
  // Join the dashed line to the last real point so the two read as one line.
  const last = history.at(-1);
  if (last && forecast.length) byDate.get(last.date)!.forecast = toNumber(last.amount);
  for (const point of forecast) {
    const row = byDate.get(point.date) ?? { date: point.date };
    row.forecast = toNumber(point.amount);
    byDate.set(point.date, row);
  }
  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ChartContainer config={config} className={cn("h-56 w-full", className)}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="bank-balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-balance)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-balance)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatShortDay} minTickGap={32} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} domain={["auto", "auto"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => formatDay(payload?.[0]?.payload?.date)}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-mono tabular-nums">{formatMoney(value as number, currency)}</span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="balance"
          type="stepAfter"
          stroke="var(--color-balance)"
          fill="url(#bank-balance-fill)"
          strokeWidth={1.5}
          connectNulls
        />
        <Line
          dataKey="forecast"
          type="stepAfter"
          stroke="var(--color-forecast)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
};
