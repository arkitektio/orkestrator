import { IntField } from "@/components/fields/IntField";
import { InputWidgetProps } from "@/lib/ports/types";
import { pathToName } from "@/lib/ports/utils";

export const IntWidget = (props: InputWidgetProps) => {
  return (
    <IntField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
