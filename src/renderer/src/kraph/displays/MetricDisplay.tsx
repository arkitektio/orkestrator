import { DisplayWidgetProps } from "@/core/lib/display/registry";
import { KraphMetric } from "@/core/linkers";
import { useGetMetricQuery } from "../api/graphql";

export const MetricDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMetricQuery({
    variables: { id: props.id },
  });

  return (
    <KraphMetric.DetailLink object={{ id: props.id }}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-light text-muted-foreground">{data?.metric.kind?.label || data?.metric.kind?.key || data?.metric.key}</h1>
        <p className="text-sm text-muted-foreground">{data?.metric.kind?.description}</p>
        <p className="text-foreground text-2xl font-bold">
          {data?.metric.value || "No value available."}
        </p>
        {/* Additional components or content can be added here */}
      </div>
    </KraphMetric.DetailLink>
  );
};
