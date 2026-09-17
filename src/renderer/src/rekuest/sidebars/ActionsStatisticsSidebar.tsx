import { TimeBucketChart } from "@/components/charts/TimeBucketChart";
import { useNearViewport } from "@/lib/datalayer/useNearViewport";
import { Activity, Zap } from "lucide-react";
import { useMemo, useRef } from "react";
import {
  ActionFilter,
  Granularity,
  useActionsPageStatsQuery,
} from "../api/graphql";
import { fillBuckets } from "../lib/actionBrowse";

const TASK_WINDOW_DAYS = 90;
const WEEKS_SHOWN = 26;

/**
 * Statistics for the actions catalog. The action numbers follow the page's
 * filters; the task numbers cannot (TaskFilter takes no ActionFilter), so they
 * are labelled as org-wide rather than passed off as "tasks of these actions".
 */
export const ActionsStatisticsSidebar = ({
  filters,
}: {
  filters: ActionFilter;
}) => {
  // Aggregates over the whole org: only fetched once the rail is actually
  // showing, not while it sits collapsed.
  const root = useRef<HTMLDivElement>(null);
  const inView = useNearViewport(root);

  // Pinned to the day so the variables — and with them the query — stay stable
  // across renders.
  const tasksAfter = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - TASK_WINDOW_DAYS);
    return date;
  }, []);

  const { data, error, loading } = useActionsPageStatsQuery({
    variables: {
      filters,
      taskFilters: { createdAfter: tasksAfter, rootIsnull: true },
      by: Granularity.Week,
    },
    skip: !inView,
  });

  // Quiet weeks come back as missing buckets; fill them up to this week.
  const { actionSeries, taskSeries } = useMemo(() => {
    const now = new Date();
    return {
      actionSeries: fillBuckets(
        data?.actionStats.series,
        Granularity.Week,
        now,
      ).slice(-WEEKS_SHOWN),
      taskSeries: fillBuckets(data?.taskStats.series, Granularity.Week, now),
    };
  }, [data]);

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
          <p className="text-sm text-destructive">
            Error loading statistics: {error.message}
          </p>
        </div>
      </div>
    );
  }

  const hasFilter = Object.keys(filters).length > 0;
  const pending = loading || !data;

  // Same palette as every other statistics sidebar (see mikro's
  // `StatisticsSidebar`): the brand colour first, then the chart offsets,
  // each icon on a tint of ITS OWN colour.
  const statsCards = [
    {
      title: hasFilter ? "Matching Actions" : "Total Actions",
      value: pending ? "..." : (data?.actionStats.count ?? 0),
      description: hasFilter
        ? "Actions matching the current filters"
        : "Actions registered in your organization",
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10",
      chartTitle: `New actions per week · last ${WEEKS_SHOWN} weeks`,
      chartLabel: "New actions",
      series: actionSeries,
    },
    {
      title: "All Tasks",
      value: pending ? "..." : (data?.taskStats.count ?? 0),
      description: `Org-wide, last ${TASK_WINDOW_DAYS} days — not narrowed by the filters`,
      icon: Activity,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
      chartTitle: "Tasks per week",
      chartLabel: "Tasks",
      series: taskSeries,
    },
  ];

  return (
    <div ref={root} className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Actions Overview</h2>
        <p className="text-sm text-muted-foreground">
          What your apps can do, and how much of it is being used.
        </p>
      </div>
      {statsCards.map((card) => (
        <div
          key={card.title}
          className="p-4 rounded-lg border border-border space-y-4"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-semibold tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </div>
          </div>
          {!pending && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {card.chartTitle}
              </p>
              <TimeBucketChart
                data={card.series}
                by="WEEK"
                label={card.chartLabel}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
