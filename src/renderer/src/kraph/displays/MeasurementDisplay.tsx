import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphMeasurement } from "@/core/linkers";
import { useGetMeasurementQuery } from "../api/graphql";

export const MeasurementDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMeasurementQuery({ variables: { id: props.id } });

  if (!data?.measurement) {
    return <div className="text-xs text-muted-foreground">Measurement not found</div>;
  }

  const measurement = data.measurement;

  if (props.context === "command") {
    return (
      <KraphMeasurement.DetailLink object={{ id: props.id }}>
        <span className="font-medium text-sm">{measurement.category?.label ?? measurement.label}</span>
      </KraphMeasurement.DetailLink>
    );
  }

  return (
    <KraphMeasurement.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3">
        <div className="font-semibold text-sm">{measurement.category?.label ?? measurement.label}</div>
      </div>
    </KraphMeasurement.DetailLink>
  );
};
