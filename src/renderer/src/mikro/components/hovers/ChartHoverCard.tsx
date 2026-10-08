import { Object } from "@/core/types";
import { formatDistanceToNow } from "date-fns";
import { useGetListChartQuery } from "../../api/graphql";
import { chartAxisLabel } from "../../chartAxis";
import { HoverRow, HoverShell, HoverSkeleton } from "./HoverShell";

export const ChartHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetListChartQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load chart details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const chart = data.chart;

  return (
    <HoverShell title={chart.name} subtitle="Chart">
      {chart.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {chart.description}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <HoverRow label="Along" value={chartAxisLabel(chart.axis)} />
        <HoverRow
          label="Created"
          value={formatDistanceToNow(new Date(chart.createdAt), {
            addSuffix: true,
          })}
        />
      </div>
    </HoverShell>
  );
};

export default ChartHoverCard;
