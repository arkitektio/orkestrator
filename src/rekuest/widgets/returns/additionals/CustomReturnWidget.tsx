import React, { ReactNode, useEffect, useState } from "react";
import { ReturnWidgetProps } from "../../types";
import { CustomReturnWidgetFragment } from "../../../api/graphql";
import { useWidgetRegistry } from "../../widget-context";

const CustomReturnWidget: React.FC<
  ReturnWidgetProps<CustomReturnWidgetFragment>
> = ({ port, widget, value }) => {
  const [Node, setNode] = useState<React.ReactNode>();
  const { registry } = useWidgetRegistry();

  if (!widget?.ward) return <>Widget was not configured properly</>;

  useEffect(() => {
    if (port.identifier && widget.ward) {
      const ward = registry?.ward_registry?.getWard(widget?.ward);
      if (!ward) return;
      const FC = ward.hook(widget?.hook);
      if (FC) {
        setNode(FC(value));
      }
    }
  }, [value]);

  return <div>{Node}</div>;
};

export { CustomReturnWidget };
