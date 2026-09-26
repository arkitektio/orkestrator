import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/ui/chart";
import { cn } from "@/core/util/utils";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { PortfolioInsightsFragment } from "../../../api/graphql";
import { formatCompact, formatDay, formatMoney, formatShortDay, toNumber } from "../../../format";

const config = {
  valuation: { label: "Value", color: "var(--chart-2)" },
  invested: { label: "Invested", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** The depot's value over time against the net money put in; the gap is the gain. */
export const ValuationChart = ({
  history,
  currency,
  className,
}: {
  history: PortfolioInsightsFragment["valuationHistory"];
  currency: string;
  className?: string;
}) => {
  const data = history
    .filter((point) => point.currency === currency)
    .map((point) => ({ date: point.date, valuation: toNumber(point.valuation), invested: toNumber(point.invested) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (data.length < 2) return null;

  return (
    <ChartContainer config={config} className={cn("h-56 w-full", className)}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="bank-valuation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-valuation)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-valuation)" stopOpacity={0} />
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
        <Area dataKey="valuation" type="monotone" stroke="var(--color-valuation)" fill="url(#bank-valuation-fill)" strokeWidth={1.5} />
        <Line dataKey="invested" type="stepAfter" stroke="var(--color-invested)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ChartContainer>
  );
};
