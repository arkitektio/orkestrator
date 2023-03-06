import React from "react";
import { ReturnWidgetProps } from "../../types";

const FloatReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
}) => {
  return <div className="text-white">{value}</div>;
};

export { FloatReturnWidget };
