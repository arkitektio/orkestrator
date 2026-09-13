import { notEmpty } from "@/lib/utils";
import { PortKind } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
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
