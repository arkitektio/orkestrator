import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type TimeBucket = { ts: string; count: number };

/** Granularity of the buckets, which decides how a bucket's date is written. */
export type TimeBucketStep =
  | "HOUR"
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "QUARTER"
  | "YEAR";

const formatBucket = (ts: string, by: TimeBucketStep, long = false) => {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  if (by === "YEAR") return String(date.getFullYear());
  if (by === "MONTH" || by === "QUARTER") {
    return date.toLocaleDateString(undefined, {
      month: "short",
      year: long ? "numeric" : "2-digit",
    });
  }
  if (by === "HOUR") {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(long ? { year: "numeric" } : {}),
  });
};

/**
 * Counts per time bucket as thin columns. Columns rather than an area: a bucket
 * is a discrete count, and a smoothed line through counts dips below zero and
 * invents values between buckets. One series, so no legend — `label` names it
 * in the tooltip and the caller's heading names it on the page.
 */
export const TimeBucketChart = ({
  data,
  by,
  label,
  className,
}: {
  data: TimeBucket[];
  by: TimeBucketStep;
  label: string;
  className?: string;
}) => {
  const config = {
    count: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-24 items-center justify-center text-xs text-muted-foreground",
          className,
        )}
      >
        No activity in this period
      </div>
    );
  }

  return (
    <ChartContainer config={config} className={cn("h-32 w-full", className)}>
      <BarChart data={data} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis
          dataKey="ts"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={28}
          tickFormatter={(ts: string) => formatBucket(ts, by)}
        />
        <YAxis
          width={28}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tickCount={3}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_value, payload) =>
                formatBucket(payload?.[0]?.payload?.ts ?? "", by, true)
              }
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  );
};
