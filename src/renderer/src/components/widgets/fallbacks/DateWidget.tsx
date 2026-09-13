import { DateTimeField } from "@/components/fields/DateTimeField";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";

export const DateWidget = (props: InputWidgetProps) => {
  return (
    <DateTimeField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
    />
  );
};
