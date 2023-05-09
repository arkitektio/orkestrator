import React from "react";
import { GlobalLink } from "../../../../linker";
import { MetricWidget } from "../../../../widgets/MetricWidget";
import { PositionWidget } from "../../../../widgets/PositionWidget";
import { RepresentationWidget } from "../../../../widgets/RepresentationWidget";
import { RoiWidget } from "../../../../widgets/RoiWidget";
import { StageWidget } from "../../../../widgets/StageWidget";
import { TableWidget } from "../../../../widgets/TableWidget";
import { ThumbnailWidget } from "../../../../widgets/ThumbnailWidget";

import { FileWidget } from "../../../../widgets/FileWidget";
import { ReturnWidgetProps } from "../../types";

export type StructureDisplayProps = {
  value: string;
  minimal?: boolean;
  label?: boolean;
  link?: boolean;
};

export const structure_to_widget = (
  type: string,
  props: StructureDisplayProps
) => {
  switch (type) {
    case "@mikro/roi":
      return <RoiWidget {...props} />;
    case "@mikro/representation":
      return <RepresentationWidget {...props} />;
    case "@mikro/table":
      return <TableWidget {...props} />;
    case "@mikro/stage":
      return <StageWidget {...props} />;
    case "@mikro/position":
      return <PositionWidget {...props} />;
    case "@mikro/thumbnail":
      return <ThumbnailWidget {...props} />;
    case "@mikro/metric":
      return <MetricWidget {...props} />;
    case "@mikro/omerofile":
      return <FileWidget {...props} />;
    default:
      return <>{type}</>;
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
          {structure_to_widget(port.identifier, {
            value: value,
            minimal: false,
          })}
        </GlobalLink>
      )}
    </>
  );
};

export { StructureReturnWidget };
