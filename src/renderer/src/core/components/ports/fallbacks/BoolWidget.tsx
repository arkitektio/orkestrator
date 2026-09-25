import { SwitchField } from "@/core/components/fields/SwitchField";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

export const BoolWidget = (props: InputWidgetProps) => {
  return (
    <SwitchField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
