import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Activity } from "lucide-react";
import { useGetArrayDatasetQuery } from "../api/graphql";

/**
 * `@elektro/arraydataset` elsewhere: its axes and, for a simulation's output,
 * the model it simulated. Same query as its hover card, so one cache entry.
 */
export const ArrayDatasetDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetArrayDatasetQuery({ variables: { id: props.id } });
  const dataset = data?.arrayDataset;
  if (!dataset) return <DisplayLinePlaceholder {...props} icon={Activity} />;

  const shape = dataset.axisNames.map((axis, index) => `${axis} ${dataset.shape[index]}`).join(" × ");
  return (
    <DisplayLine
      {...props}
      icon={Activity}
      title={dataset.name}
      meta={[
        shape,
        dataset.valueUnit,
        dataset.simulation && `simulated from ${dataset.simulation.model.name}`,
      ]}
    />
  );
};
