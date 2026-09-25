import { ReturnWidgetProps } from "@/lib/ports/types";
import React from "react";

const FloatReturnWidget: React.FC<ReturnWidgetProps> = ({
  value,
}) => {
  const display =
    value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return <div className="text-foreground items-center flex justify-center h-full w-full">{display}</div>
};

export { FloatReturnWidget };
