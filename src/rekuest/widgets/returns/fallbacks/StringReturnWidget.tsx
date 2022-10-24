import React from "react";
import { ReturnWidgetProps } from "../../types";

const StringReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
  className,
}) => {
  if (!port.key) return <> Failure Key not specified </>;

  return (
    <div className={className}>
      <label className="font-light" htmlFor={port.key}>
        {port.label || port.key}
      </label>
      {value}
      {port.description && (
        <div id={`${port.key}-help`} className="text-xs mb-4 font-light">
          {port.description}
        </div>
      )}
    </div>
  );
};

export { StringReturnWidget };
