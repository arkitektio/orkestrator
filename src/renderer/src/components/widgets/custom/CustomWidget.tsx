import { AssignWidgetFragment, CustomAssignWidgetFragment } from "@/rekuest/api/graphql";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { useMemo } from "react";

/**
 * A CUSTOM assign widget names a component from the UI catalog. This client
 * does not (yet) render catalog components inside forms, so it degrades the
 * way the server intends: through the widget's `fallback` when one is given,
 * else through the port-kind fallback. Either way the port stays editable.
 */
export const CustomWidget = (props: InputWidgetProps<CustomAssignWidgetFragment>) => {
  const { registry } = useWidgetRegistry();
  const fallback = (props.widget?.fallback ?? null) as AssignWidgetFragment | null;

  const { port, Widget } = useMemo(() => {
    const port = { ...props.port, widget: fallback } as typeof props.port;
    return { port, Widget: registry.getInputWidgetForPort(port) };
  }, [props.port, fallback, registry]);

  return <Widget {...props} port={port} widget={fallback as AssignWidgetFragment} />;
};
