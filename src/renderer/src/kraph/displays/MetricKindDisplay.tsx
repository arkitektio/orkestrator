import { DisplayWidgetProps } from "@/lib/display/registry";
import { KraphMetricKind } from "@/linkers";
import { useGetMetricKindQuery } from "../api/graphql";

export const MetricKindDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMetricKindQuery({ variables: { id: props.id } });

  if (!data?.metricKind) {
    return <div className="text-xs text-muted-foreground">Not found</div>;
  }

  const cat = data.metricKind;

  if (props.context === "command") {
    return (
      <KraphMetricKind.DetailLink object={{ id: props.id }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{cat.label}</span>
          <span className="text-xs text-muted-foreground shrink-0">{cat.valueKind}</span>
        </div>
      </KraphMetricKind.DetailLink>
    );
  }

  return (
    <KraphMetricKind.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{cat.label || cat.key}</div>
        <div className="text-xs text-muted-foreground">{cat.valueKind}</div>
        {cat.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{cat.description}</div>
        )}
      </div>
    </KraphMetricKind.DetailLink>
  );
};
