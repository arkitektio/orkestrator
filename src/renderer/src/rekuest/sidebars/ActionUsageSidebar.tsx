import { TimeBucketChart } from "@/components/charts/TimeBucketChart";
import { useNearViewport } from "@/lib/datalayer/useNearViewport";
import { Granularity, useActionUsageStatsQuery } from "@/rekuest/api/graphql";
import { fillBuckets } from "@/rekuest/lib/actionBrowse";
import { useMemo, useRef } from "react";

const WINDOW_DAYS = 30;

const Figure = (props: { label: string; value: React.ReactNode }) => (
  <div className="p-3 rounded-lg border border-border">
    <p className="text-xs text-muted-foreground">{props.label}</p>
    <p className="text-xl font-semibold tracking-tight">{props.value}</p>
  </div>
);

/**
 * How much an action is used, and how often it works. Five aggregate queries
 * nobody needs to pay for unless they look: an inactive tab is not mounted at
 * all, and a mounted-but-collapsed rail is held back by the in-view check.
 */
export const ActionUsageSidebar = ({ id }: { id: string }) => {
  const root = useRef<HTMLDivElement>(null);
  const inView = useNearViewport(root);

  // Pinned to the day so the query variables stay stable across renders.
  const after = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - WINDOW_DAYS);
    return date;
  }, []);

  const { data, error } = useActionUsageStatsQuery({
    variables: { id, after, by: Granularity.Day },
    skip: !inView,
  });

  const series = useMemo(
    () => fillBuckets(data?.recent.series, Granularity.Day, new Date()),
    [data],
  );

  const completed = data?.completed.count ?? 0;
  const failed = data?.failed.count ?? 0;
  const finished = completed + failed;

  return (
    <div ref={root} className="p-4 space-y-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Usage</h2>
        <p className="text-sm text-muted-foreground">
          How much this action is run, and how often it works.
        </p>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
          <p className="text-sm text-destructive">
            Error loading usage: {error.message}
          </p>
        </div>
      ) : !data ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
      ) : data.total.count === 0 ? (
        <p className="text-sm text-muted-foreground">
          This action has not been run yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Runs, all time" value={data.total.count} />
            <Figure label="Running now" value={data.running.count} />
            <Figure label="Failed" value={failed} />
            <Figure
              label="Success rate"
              value={
                finished > 0
                  ? `${Math.round((completed / finished) * 100)}%`
                  : "–"
              }
            />
          </div>
          <div className="p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Runs per day · last {WINDOW_DAYS} days
            </p>
            <TimeBucketChart data={series} by="DAY" label="Runs" />
          </div>
        </>
      )}
    </div>
  );
};
