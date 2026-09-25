import { SliderField } from "@/core/components/fields/SliderField";
import { SliderAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

export const SliderWidget = (
  props: InputWidgetProps<SliderAssignWidgetFragment>,
) => {
  return (
    <SliderField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
      min={props.widget?.min || undefined}
      max={props.widget?.max || undefined}
      step={props.widget?.step || undefined}
    />
  );
};
