import React from "react";
import { ReturnWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

const UnionReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
  className,
}) => {
  console.log(value);
  if (!port.variants) return <> No child specified not specified </>;


  const { registry } = useWidgetRegistry();
  if (!registry) return <>No Widget Registry found</>;

  if (value.use == undefined) return <>No used varient found {JSON.stringify(value)}</>;
  if (value.value == undefined) return <>No value found  {JSON.stringify(value)}</>;

  const realValue = value.value;
  const chosen = port.variants[value.use];

  if (!chosen) return <>No chosen variant found  {JSON.stringify(value)}</>;
  const realPort = {...chosen, key: port.key, nullable: false};
  const Widget = registry.getReturnWidgetForPort(realPort);


  return (
    <>
      <Widget
        port={realPort}
        widget={realPort.returnWidget}
        value={realValue}
      />
    </>
  );
};

export { UnionReturnWidget };
