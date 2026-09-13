import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReturnWidgetFragment } from "@/rekuest/api/graphql";
import { MappablePort, ReturnWidgetProps, ValueKind } from "@/rekuest/widgets/types";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import React from "react";
import { portGridClass } from "../../gridColumns";

const ModelReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  value,
}) => {
  const { registry } = useWidgetRegistry();

  const childPorts = port.children;

  const values: Record<string, ValueKind> =
    value != null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, ValueKind>)
      : {};

  return (
    <div className={portGridClass(childPorts?.length || 1)}>
      {childPorts?.map((port) => {
        const Widget = registry.getReturnWidgetForPort(
          port as unknown as MappablePort,
        );

        return (
          <Card key={port.key}>
            <CardHeader>
              <CardTitle>{port.key}</CardTitle>
            </CardHeader>
            <CardContent>
              <Widget
                value={values[port.key]}
                port={port as unknown as ReturnWidgetProps["port"]}
                widget={port.widget as unknown as ReturnWidgetFragment}
                options={{ disable: false }}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export { ModelReturnWidget };
