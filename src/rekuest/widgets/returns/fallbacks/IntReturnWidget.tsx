import React from "react";
import { ReturnWidgetProps } from "../../types";

const IntReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
}) => {
  return <div className="text-white">{value}</div>;
};

export { IntReturnWidget };
