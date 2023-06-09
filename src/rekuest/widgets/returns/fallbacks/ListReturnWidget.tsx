import React from "react";
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

  let lg_size = len < 2 ? len : 2;
  let xl_size = len < 3 ? len : 3;
  let xxl_size = len < 4 ? len : 4;
  let xxxl_size = len < 5 ? len : 5;
  let xxxxl_size = len < 6 ? len : 6;

  return (
    <div
      className={`grid @lg:grid-cols-${lg_size} @xl-grid-cols-${xl_size} @2xl:grid-cols-${xxl_size}  @3xl:grid-cols-${xxxl_size}   @5xl:grid-cols-${xxxxl_size} gap-4 overflow-hidden`}
    >
      {value &&
        value.map((r: any, index: number) => {
          if (!port.child) return <> No child specified not specified </>;
          const Widget = registry.getReturnWidgetForPort(port.child);

          return (
            <div className="bg-gray-400 rounded rounded-md rounded-md ">
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
