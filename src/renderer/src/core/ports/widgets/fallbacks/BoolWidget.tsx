import { SwitchField } from "@/core/forms/SwitchField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const BoolWidget = (props: InputWidgetProps) => {
  return (
    <SwitchField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
