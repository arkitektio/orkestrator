import React from "react";
import { TwoD } from "../../../../experimental/render/TwoD";
import { TwoDOffcanvas } from "../../../../experimental/render/TwoDOffcanvas";
import { GlobalLink } from "../../../../linker";
import { useDetailRepresentationQuery } from "../../../../mikro/api/graphql";
import { withMikro } from "../../../../mikro/MikroContext";
import { PositionWidget } from "../../../../widgets/PositionWidget";
import { RepresentationWidget } from "../../../../widgets/RepresentationWidget";
import { RoiWidget } from "../../../../widgets/RoiWidget";
import { useDetailRepositoryQuery } from "../../../api/graphql";

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

  return (
    <div>
      <label className="font-light" htmlFor={port.key}></label>
      {port.description && (
        <div id={`${port.key}-help`} className="text-xs mb-4 font-light">
          {port.description}
        </div>
      )}
      {port.identifier && (
        <GlobalLink
          model={port.identifier}
          object={value}
          className="font-light hover:bg-white"
        >
          {port.identifier === "@mikro/representation" && (
            <RepresentationWidget value={value} />
          )}
          {port.identifier === "@mikro/position" && (
            <PositionWidget value={value} />
          )}
          {port.identifier === "@mikro/roi" && <RoiWidget value={value} />}
        </GlobalLink>
      )}
    </div>
  );
};

export { StructureReturnWidget };
