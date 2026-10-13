import { AssignWidgetFragment, CustomAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { useMemo } from "react";
import { CatalogWidget } from "./CatalogWidget";

/**
 * A CUSTOM assign widget names a component from the UI catalog, with props
 * that may read the port's value and its dependencies. It is rendered as the
 * port's input (`CatalogWidget`).
 *
 * When this client's catalog cannot render it (a component it does not have,
 * props it refuses), the port degrades the way the server intends: through
 * the widget's `fallback` when one is given, else through what the port would
 * get without a widget. Either way the port stays editable.
 */
export const CustomWidget = (props: InputWidgetProps<CustomAssignWidgetFragment>) => {
  const { registry } = useWidgetRegistry();
  const fallback = (props.widget?.fallback ?? null) as AssignWidgetFragment | null;

  const { port, Widget } = useMemo(() => {
    const port = { ...props.port, widget: fallback } as typeof props.port;
    return { port, Widget: registry.getInputWidgetForPort(port) };
  }, [props.port, fallback, registry]);

  const degraded = <Widget {...props} port={port} widget={fallback as AssignWidgetFragment} />;
  if (!props.widget?.component) return degraded;

  return (
    <CatalogWidget
      {...props}
      component={props.widget.component}
      componentProps={props.widget.props ?? []}
      dependencies={props.widget.dependencies}
      fallback={degraded}
    />
  );
};
