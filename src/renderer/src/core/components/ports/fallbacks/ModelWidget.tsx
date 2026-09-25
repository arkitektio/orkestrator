import { notEmpty } from "@/core/lib/utils";
import { PortKind } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";
import React from "react";
import { ChildWidget } from "../ChildWidget";

const ModelWidget: React.FC<InputWidgetProps> = ({ port, path, bound, options }) => {
  const pathKey = pathToName(path);
  return (
    <>
      {port.children?.filter(notEmpty).map((child) => (
        <ChildWidget
          key={child.key}
          child={child}
          pathKey={`${pathKey}.${child.key}`}
          parentKind={PortKind.Model}
          bound={bound}
          options={options}
        />
      ))}
    </>
  );
};

export { ModelWidget };
