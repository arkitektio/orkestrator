import React from "react";
import { ReturnWidgetProps } from "../../types";

const BoolReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
}) => {
  return <div className="text-white">{value}</div>;
};

export { BoolReturnWidget };
