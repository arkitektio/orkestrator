import { IntField } from "@/core/components/fields/IntField";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

export const IntWidget = (props: InputWidgetProps) => {
  return (
    <IntField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
