import React, { ReactNode, useEffect, useState } from "react";
import { ReturnWidgetProps } from "../../types";
import { CustomReturnWidgetFragment } from "../../../api/graphql";

const CustomReturnWidget: React.FC<
  ReturnWidgetProps<CustomReturnWidgetFragment>
> = ({ port, widget, value, ward_registry }) => {
  const [Node, setNode] = useState<React.ReactNode>();

  if (!widget?.ward) return <>Widget was not configured properly</>;

  useEffect(() => {
    if (port.identifier && widget.ward) {
      const ward = ward_registry.getWard(widget?.ward);
      const FC = ward.hook(widget?.hook);
      if (FC) {
        setNode(FC(value));
      }
    }
  }, [value]);

  return (
    <div>
      {Node}
      {port.description && (
        <div
          id={`${port.key}-help`}
          className="text-xs text-gray-600 mt-2 font-light"
        >
          {port.description}
        </div>
      )}
    </div>
  );
};

export { CustomReturnWidget };
