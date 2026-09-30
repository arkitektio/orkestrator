import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/ui/chart";
import { cn } from "@/core/util/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Granularity, StatsBucketFragment, TripMode } from "../api/graphql";
import { MODE_LABELS, formatDistance } from "../format";

const MODES = [TripMode.Walk, TripMode.Bike, TripMode.Vehicle, TripMode.Unknown] as const;

const config = {
  [TripMode.Walk]: { label: MODE_LABELS[TripMode.Walk], color: "var(--chart-2)" },
  [TripMode.Bike]: { label: MODE_LABELS[TripMode.Bike], color: "var(--chart-3)" },
  [TripMode.Vehicle]: { label: MODE_LABELS[TripMode.Vehicle], color: "var(--chart-1)" },
  [TripMode.Unknown]: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig;

const bucketLabel = (iso: string, granularity: Granularity) =>
  new Date(iso).toLocaleDateString(
    undefined,
    granularity === Granularity.Month ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" },
  );

/** Distance travelled per day, week or month, stacked by how. */
export const StatsChart = ({
  buckets,
  granularity,
  className,
}: {
  buckets: readonly StatsBucketFragment[];
  granularity: Granularity;
  className?: string;
}) => {
  const data = buckets.map((bucket) => ({
    start: bucket.start,
    ...Object.fromEntries(
      MODES.map((mode) => [mode, (bucket.byMode.find((stat) => stat.mode === mode)?.distance ?? 0) / 1000]),
    ),
  }));

  return (
    <ChartContainer config={config} className={cn("h-56 w-full", className)}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="start"
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tickFormatter={(value) => bucketLabel(value, granularity)}
        />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(km) => `${Math.round(km)}`} unit=" km" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => bucketLabel(payload?.[0]?.payload?.start, granularity)}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as TripMode]?.label}</span>
                  <span className="font-mono tabular-nums">{formatDistance((value as number) * 1000)}</span>
                </div>
              )}
            />
          }
        />
        {MODES.map((mode) => (
          <Bar key={mode} dataKey={mode} stackId="distance" fill={`var(--color-${mode})`} />
        ))}
      </BarChart>
    </ChartContainer>
  );
};
