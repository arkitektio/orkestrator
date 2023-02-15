import { Maybe } from "graphql/jsutils/Maybe";
import { PortsFragment } from "../../api/graphql";
import { useWidgetRegistry } from "../widget-context";

export type ReturnWidgetContainerProps = {
  node: Maybe<PortsFragment>;
  returns: any[];
  className?: string;
};

export const ReturnWidgetsContainer: React.FC<ReturnWidgetContainerProps> = (
  props
) => {
  const { registry } = useWidgetRegistry();
  if (!registry) return <>No Widget Registry found</>;

  return (
    <div className="flex flex-grow flex-col">
      {props.returns.map((r: any, index) => {
        let port = (props.node?.returns || [])[index];
        if (!port) return <>No Port</>;

        const Widget = registry.getReturnWidgetForPort(port);

        return (
          <Widget
            key={index}
            port={port}
            widget={port.widget}
            value={r}
            ward_registry={registry.ward_registry}
            className={props.className}
          />
        );
      })}
    </div>
  );
};
