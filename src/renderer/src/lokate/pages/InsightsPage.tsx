import { PageLayout } from "@/core/layout/PageLayout";
import { PageAction } from "@/core/ui/page-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { LokatePlace } from "@/lokate/linkers";
import { useMemo, useState } from "react";
import { Granularity, useGetStatsQuery, usePlaceStatsQuery } from "../api/graphql";
import { StatsChart } from "../components/StatsChart";
import { formatDistance, formatDuration, localTimeZone } from "../format";

type Period = "30d" | "12w" | "12m";

const PERIODS: Record<Period, { label: string; days: number; granularity: Granularity }> = {
  "30d": { label: "Last 30 days", days: 30, granularity: Granularity.Day },
  "12w": { label: "Last 12 weeks", days: 84, granularity: Granularity.Week },
  "12m": { label: "Last 12 months", days: 365, granularity: Granularity.Month },
};

const TOP_PLACES = 10;

const Total = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-lg font-semibold tabular-nums">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

/** How much you moved, how, and where you spent your time, over a period. */
const InsightsPage = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { days, granularity } = PERIODS[period];
  // Whole local days, so the range does not creep with every render.
  const { since, until } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days);
    return { since: start.toISOString(), until: end.toISOString() };
  }, [days]);

  const { data, previousData } = useGetStatsQuery({
    variables: { since, until, granularity, timezone: localTimeZone() },
  });
  const { data: placeData } = usePlaceStatsQuery({ variables: { since, until, limit: TOP_PLACES } });
  const buckets = (data ?? previousData)?.stats ?? [];
  const places = placeData?.placeStats ?? [];

  const totals = buckets.reduce(
    (sum, bucket) => ({
      distance: sum.distance + bucket.distance,
      trips: sum.trips + bucket.tripCount,
      visits: sum.visits + bucket.visitCount,
    }),
    { distance: 0, trips: 0, visits: 0 },
  );
  const longest = places[0]?.seconds ?? 0;

  return (
    <PageLayout
      title="Insights"
      pageActions={
        <PageAction.Slot alwaysShow>
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIODS) as Period[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PERIODS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageAction.Slot>
      }
    >
      <div className="flex max-w-4xl flex-col gap-8 p-6">
        {buckets.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex gap-8">
              <Total label="travelled" value={formatDistance(totals.distance)} />
              <Total label="trips" value={String(totals.trips)} />
              <Total label="stays" value={String(totals.visits)} />
            </div>
            <StatsChart buckets={buckets} granularity={granularity} />
          </section>
        )}
        {places.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Where you spent your time</h2>
            {places.map((stat) => (
              <div key={stat.placeClientId} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">
                  {stat.place ? (
                    <LokatePlace.DetailLink object={stat.place} className="hover:underline">
                      {stat.place.name ?? "Unnamed place"}
                    </LokatePlace.DetailLink>
                  ) : (
                    <span className="text-muted-foreground">Deleted place</span>
                  )}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(stat.seconds / longest) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {formatDuration(stat.seconds)} · {stat.visitCount}×
                </span>
              </div>
            ))}
          </section>
        )}
        {buckets.length === 0 && places.length === 0 && data && (
          <p className="text-sm text-muted-foreground">Nothing recorded in this period.</p>
        )}
      </div>
    </PageLayout>
  );
};

export default InsightsPage;
