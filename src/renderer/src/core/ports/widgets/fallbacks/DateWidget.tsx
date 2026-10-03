import { portDescription, portLabel } from "@/core/ports/engine/portPresentation";
import { DateTimeField } from "@/core/forms/DateTimeField";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";

export const DateWidget = (props: InputWidgetProps) => {
  return (
    <DateTimeField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
