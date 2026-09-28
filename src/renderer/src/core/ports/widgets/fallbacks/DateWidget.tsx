import { DateTimeField } from "@/core/forms/DateTimeField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const DateWidget = (props: InputWidgetProps) => {
  return (
    <DateTimeField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
