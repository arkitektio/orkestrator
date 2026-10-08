import { portDescription, portLabel, portSize } from "@/core/ports/engine/portPresentation";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";
import { notEmpty } from "@/core/util/utils";
import { PortKind } from "@/rekuest/api/graphql";
import React from "react";
import { ChildWidget } from "../ChildWidget";
import { PORT_GRID, PORT_HINT, portSpanClass } from "../gridColumns";

/**
 * A model is a small form of its own: a heading, then its fields in the same
 * size-aware grid as the top-level ports (four numbers are one row, not four).
 */
const ModelWidget: React.FC<InputWidgetProps> = ({ port, widget, path, bound, options }) => {
  const pathKey = pathToName(path);
  return (
    <div className="@container flex flex-col gap-2">
      <div>
        <div className="text-sm font-medium">{portLabel(port)}</div>
        <p className={PORT_HINT}>{portDescription(port, widget)}</p>
      </div>
      <div className={PORT_GRID}>
        {port.children?.filter(notEmpty).map((child) => (
          <ChildWidget
            key={child.key}
            child={child}
            pathKey={`${pathKey}.${child.key}`}
            parentKind={PortKind.Model}
            bound={bound}
            options={options}
            className={portSpanClass(portSize(child, child.widget))}
          />
        ))}
      </div>
    </div>
  );
};

export { ModelWidget };
