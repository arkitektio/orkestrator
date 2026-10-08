import { portDescription, portLabel } from "@/core/ports/engine/portPresentation";
import { SliderField } from "@/core/forms/SliderField";
import { SliderAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const SliderWidget = (
  props: InputWidgetProps<SliderAssignWidgetFragment>,
) => {
  return (
    <SliderField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
      min={props.widget?.min || undefined}
      max={props.widget?.max || undefined}
      step={props.widget?.step || undefined}
    />
  );
};
