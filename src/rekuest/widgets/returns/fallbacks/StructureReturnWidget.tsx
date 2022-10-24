import React from "react";
import { GlobalLink } from "../../../../linker";
import { ReturnWidgetProps } from "../../types";

const structure_to_path = (type: string | undefined | null, object: string) => {
  switch (type) {
    case "@mikro/roi":
      return `/data/rois/${object}`;
    case "@mikro/representation":
      return `/data/representations/${object}`;
    case "@mikro/sample":
      return `/data/samples/${object}`;
    case "@arkitekt/node":
      return `/dashboard/nodes/${object}`;
    case "@arkitekt/template":
      return `/dashboard/templates/${object}`;
    default:
      return undefined;
  }
};

const StructureReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  widget,
  value,
}) => {
  if (!port.key) return <> Failure Key not specified </>;

  let path = structure_to_path(port.identifier, value);

  return (
    <div>
      <label className="font-light" htmlFor={port.key}>
        {port.label || port.key}
      </label>
      {value}
      {port.description && (
        <div id={`${port.key}-help`} className="text-xs mb-4 font-light">
          {port.description}
        </div>
      )}
      {port.identifier && path && (
        <GlobalLink
          model={port.identifier}
          object={value}
          className="font-light hover:bg-white"
        >
          {port.identifier}
        </GlobalLink>
      )}
    </div>
  );
};

export { StructureReturnWidget };
