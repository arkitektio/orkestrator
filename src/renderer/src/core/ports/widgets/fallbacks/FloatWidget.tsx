import { FloatField } from "@/core/forms/FloatField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const FloatWidget = (props: InputWidgetProps) => {

  return (
    <FloatField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
