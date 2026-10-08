import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { ChartSpline } from "lucide-react";
import { useGetListChartQuery } from "../api/graphql";
import { chartAxisLabel } from "../chartAxis";

/** `@mikro/chart` elsewhere: its name and the axis it is laid out along. */
export const ChartDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetListChartQuery({ variables: { id: props.id } });
  const chart = data?.chart;
  if (!chart) return <DisplayLinePlaceholder {...props} icon={ChartSpline} />;

  return (
    <DisplayLine
      {...props}
      icon={ChartSpline}
      title={chart.name}
      meta={[chartAxisLabel(chart.axis)]}
    />
  );
};
