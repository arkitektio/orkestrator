import { portDescription, portLabel } from "@/core/ports/engine/portPresentation";
import { IntField } from "@/core/forms/IntField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const IntWidget = (props: InputWidgetProps) => {
  return (
    <IntField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
