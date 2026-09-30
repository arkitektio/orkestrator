import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FlaskConical } from "lucide-react";
import { useGetExperimentSceneQuery } from "../api/graphql";

/** `@elektro/experiment` elsewhere: its name and how many layers it holds. */
export const ExperimentDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetExperimentSceneQuery({ variables: { id: props.id } });
  const experiment = data?.experiment;
  if (!experiment) return <DisplayLinePlaceholder {...props} icon={FlaskConical} />;

  return (
    <DisplayLine
      {...props}
      icon={FlaskConical}
      title={experiment.name}
      meta={[countOf(experiment.layers.length, "layer"), experiment.description]}
    />
  );
};
