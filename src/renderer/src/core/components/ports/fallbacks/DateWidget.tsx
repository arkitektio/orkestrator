import { DateTimeField } from "@/core/components/fields/DateTimeField";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

export const DateWidget = (props: InputWidgetProps) => {
  return (
    <DateTimeField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
