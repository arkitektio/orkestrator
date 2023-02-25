import React from "react";
import { ReturnWidgetProps } from "../../types";

const StringReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
  className,
}) => {
  return <div className="text-white">{value}</div>;
};

export { StringReturnWidget };
