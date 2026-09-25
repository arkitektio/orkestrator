import { FloatField } from "@/core/components/fields/FloatField";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

export const FloatWidget = (props: InputWidgetProps) => {

  return (
    <FloatField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
