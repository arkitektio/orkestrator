import React, { useEffect, useState } from "react";
import { GlobalLink } from "../../../../linker";
import { MetricWidget } from "../../../../widgets/MetricWidget";
import { PositionWidget } from "../../../../widgets/PositionWidget";
import { RepresentationWidget } from "../../../../widgets/RepresentationWidget";
import { RoiWidget } from "../../../../widgets/RoiWidget";
import { StageWidget } from "../../../../widgets/StageWidget";
import { TableWidget } from "../../../../widgets/TableWidget";
import { ThumbnailWidget } from "../../../../widgets/ThumbnailWidget";

import { Option } from "../../../../components/forms/fields/SearchInput";
import { FileWidget } from "../../../../widgets/FileWidget";
import { SearchWidgetFragment } from "../../../api/graphql";
import { Port, ReturnWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

export type StructureDisplayProps = {
  value: string;
  minimal?: boolean;
  label?: boolean;
  link?: boolean;
};

export const DisplaySearchReturn = ({
  value,
  widget,
}: {
  port: Port;
  value: string;
  widget: SearchWidgetFragment;
}) => {
  if (!widget?.ward)
    return (
      <>This port is not usable with this widget {JSON.stringify(widget)}</>
    );
  const ward = useWidgetRegistry().registry?.ward_registry.getWard(widget.ward);

  if (!ward?.search)
    return (
      <div>
        {" "}
        No ward specified for this {widget.ward}. Please register a Ward that
        supports "search"
      </div>
    );

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
      </div>
    );

  const searchFunction = (initialValue?: string[]): Promise<Option[]> => {
    let query = widget.query;
    if (ward.search)
      try {
        return ward
          .search({
            query: query as string,
            variables: { values: initialValue },
          })
          .then((result) => (result.options || []) as Option[]);
      } catch (e) {
        return Promise.reject("Malformed Query" + e);
      }
    return Promise.reject("No search function availabl");
  };

  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    searchFunction([value]).then((result) => {
      setOptions(result);
    });
  }, [value]);

  return (
    <div className="text-white">{options.map((i) => i.label).join(",")}</div>
  );
};

export const DefaultStructureWidget = ({
  port,
  props,
}: {
  port: Port;
  props: StructureDisplayProps;
}) => {
  if (port.returnWidget) {
    return <>Not implemented yet</>;
  }

  if (port.assignWidget) {
    if (port.assignWidget.__typename === "SearchWidget") {
      return (
        <DisplaySearchReturn
          value={props.value}
          port={port}
          widget={port.assignWidget}
        />
      );
    }
  }

  return <></>;
};

export const structure_to_widget = (
  port: Port,
  props: StructureDisplayProps
) => {
  switch (port.identifier) {
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
      return <DefaultStructureWidget port={port} props={props} />;
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
          {structure_to_widget(port, {
            value: value,
            minimal: false,
          })}
        </GlobalLink>
      )}
    </>
  );
};

export { StructureReturnWidget };
