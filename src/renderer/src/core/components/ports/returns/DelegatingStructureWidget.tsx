import { useDisplayComponent } from "@/core/app/display";
import { ReturnWidgetProps } from "@/core/lib/ports/types";

export const DelegatingStructureWidget = (props: ReturnWidgetProps) => {


  const Widget = useDisplayComponent(props.port.identifier);

  if (!props.value) {
    return (
      <div className="text-xs"> No Value received {props.port.identifier}</div>
    );
  }

  const value = props.value;
  const object =
    value != null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).object
      : undefined;

  if (object == null) {
    return (
      <div className="text-xs"> No Value received {props.port.identifier}</div>
    );
  }

  return (
    <Widget
      id={String(object)}
      small={true}
      identifier={props.port.identifier}
    />
  );
};
