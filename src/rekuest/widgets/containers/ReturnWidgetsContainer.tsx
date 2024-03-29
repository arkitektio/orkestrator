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

  let lg_size = len < 2 ? len : 2;
  let xl_size = len < 3 ? len : 3;
  let xxl_size = len < 4 ? len : 4;
  let xxxl_size = len < 5 ? len : 5;
  let xxxxl_size = len < 6 ? len : 6;

  return (
    <div
      className={`grid @lg:grid-cols-${lg_size} @xl-grid-cols-${xl_size} @2xl:grid-cols-${xxl_size}  @3xl:grid-cols-${xxxl_size}   @5xl:grid-cols-${xxxxl_size} gap-4`}
    >
      {props.values.map((r: any, index) => {
        let port = props.ports[index];
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
