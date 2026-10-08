import { portDescription, portLabel } from "@/core/ports/engine/portPresentation";
import { FloatField } from "@/core/forms/FloatField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const FloatWidget = (props: InputWidgetProps) => {

  return (
    <FloatField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
