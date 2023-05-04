import { PortFragment } from "../../api/graphql";
import { useWidgetRegistry } from "../widget-context";

export type WidgetsContainerProps = {
  ports: PortFragment[];
  values: any[];
  className?: string;
};

export const WidgetsContainer: React.FC<WidgetsContainerProps> = (props) => {
  const { registry } = useWidgetRegistry();
  if (!registry) return <>No Widget Registry found</>;

  let len = props.ports.length;

  return (
    <div className={`grid @lg:grid-cols-${len} flex-1 gap-1`}>
      {props.values.map((r: any, index) => {
        let port = props.ports[index];
        console.log("Rerender");
        if (!port) return <>No Port</>;

        const Widget = registry.getReturnWidgetForPort(port);

        return (
          <div className="@container flex flex-col rounded rounded-md bg-gray-900 p-2 border-gray-800 border border-1">
            <label
              className="flex-initial font-light text-slate-200 mb-2"
              htmlFor={port.key}
            >
              {port.label || port.key}
            </label>
            <div className="flex-grow bg-gray-800 rounded rounded-md max-h-[300px]">
              <Widget
                key={index}
                port={port}
                widget={port.returnWidget}
                value={r}
                
              />
            </div>
            {port.description && (
              <div
                id={`${port.key}-help`}
                className="text-xs mb-4 font-light flex-initial text-slate-400"
              >
                {port.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
