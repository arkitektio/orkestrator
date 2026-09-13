import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReturnWidgetFragment } from "@/rekuest/api/graphql";
import { MappablePort, ReturnWidgetProps } from "@/rekuest/widgets/types";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import React from "react";

const ListReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  value,
}) => {
  const { registry } = useWidgetRegistry();

  const childPorts = port.children;

  if (!childPorts) {
    return <div>No Child found for listport</div>;
  }

  if (!Array.isArray(value)) {
    return <div>Value is not an array</div>;
  }

  if (value.length === 0) {
    return <div>No items found</div>;
  }

  if (childPorts.length !== 1) {
    return <div>Only one child port is allowed</div>;
  }

  const childPort = childPorts[0];

  const Widget = registry.getReturnWidgetForPort(
    childPort as unknown as MappablePort,
  );

  return (
    <div className={`flex flex-col gap-5`}>
      <CardHeader>
        <CardTitle>{port.label || port.key}</CardTitle>
      </CardHeader>
      {value?.map((va, index) => {
        return (
          <Card key={index}>
            <CardContent>
              <Widget
                value={va}
                port={childPort as unknown as ReturnWidgetProps["port"]}
                widget={childPort.widget as unknown as ReturnWidgetFragment}
                options={{ disable: false }}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export { ListReturnWidget };
