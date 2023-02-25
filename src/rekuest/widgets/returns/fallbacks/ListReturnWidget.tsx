import React from "react";
import { ReturnWidgetsContainer } from "../../containers/ReturnWidgetsContainer";
import { ReturnWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

const ListReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
  className,
}) => {
  console.log(value);
  if (!port.child) return <> No child specified not specified </>;

  const { registry } = useWidgetRegistry();
  if (!registry) return <>No Widget Registry found</>;

  let len = value.length;

  return (
    <div
      className={`grid @lg:grid-cols-${len} @sm:grid-cols-2 w-full h-full gap-2 p-1`}
    >
      {value &&
        value.map((r: any, index: number) => {
          if (!port.child) return <> No child specified not specified </>;
          const Widget = registry.getReturnWidgetForPort(port.child);

          return (
            <div className="bg-gray-400 rounded rounded-md rounded-md">
              <Widget
                key={index}
                port={port.child}
                widget={port.child?.returnWidget}
                value={r}
              />
            </div>
          );
        })}
    </div>
  );
};

export { ListReturnWidget };
