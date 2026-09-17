import { ReturnWidgetProps } from "@/rekuest/widgets/types";
import React from "react";

/**
 * Read-only display for a QUANTITY return port. The value already carries its
 * unit as a wire string ("100 ms"), so it is rendered as-is. Mirrors
 * `FloatReturnWidget`.
 */
const QuantityReturnWidget: React.FC<ReturnWidgetProps> = ({ value }) => {
  return (
    <div className="text-foreground items-center flex justify-center h-full w-full">
      {value as React.ReactNode}
    </div>
  );
};

export { QuantityReturnWidget };
