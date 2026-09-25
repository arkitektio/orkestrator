import { FloatField } from "@/components/fields/FloatField";
import { InputWidgetProps } from "@/lib/ports/types";
import { pathToName } from "@/lib/ports/utils";

export const FloatWidget = (props: InputWidgetProps) => {

  return (
    <FloatField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
