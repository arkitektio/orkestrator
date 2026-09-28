import { IntField } from "@/core/forms/IntField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const IntWidget = (props: InputWidgetProps) => {
  return (
    <IntField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
