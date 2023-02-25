import React from "react";
import { GlobalLink } from "../../../../linker";
import { PositionWidget } from "../../../../widgets/PositionWidget";
import { RepresentationWidget } from "../../../../widgets/RepresentationWidget";
import { RoiWidget } from "../../../../widgets/RoiWidget";
import { StageWidget } from "../../../../widgets/StageWidget";
import { TableWidget } from "../../../../widgets/TableWidget";

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
  return (
    <>
      {port.identifier && (
        <GlobalLink
          model={port.identifier}
          object={value}
          className="font-light w-full h-full flex "
        >
          {port.identifier === "@mikro/representation" && (
            <RepresentationWidget value={value} />
          )}
          {port.identifier === "@mikro/position" && (
            <PositionWidget value={value} />
          )}
          {port.identifier === "@mikro/roi" && <RoiWidget value={value} />}
          {port.identifier === "@mikro/table" && <TableWidget value={value} />}
          {port.identifier === "@mikro/stage" && <StageWidget value={value} />}
        </GlobalLink>
      )}
    </>
  );
};

export { StructureReturnWidget };
