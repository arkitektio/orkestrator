import { AssignWidgetFragment, PortKind } from "@/rekuest/api/graphql";
import { EffectWrapper } from "@/rekuest/widgets/EffectWrapper";
import { InputWidgetProps, Port, PortOptions } from "@/rekuest/widgets/types";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import React, { useMemo } from "react";

// Child ports are Apollo-cache-stable objects; the "Port"-typed view of one is
// memoized so nested widgets get a stable `port` prop and can bail out of
// re-renders.
const portCache = new WeakMap<object, Port>();

export const asChildPort = (child: object): Port => {
  const cached = portCache.get(child);
  if (cached) return cached;
  const port = { ...child, __typename: "Port" } as unknown as Port;
  portCache.set(child, port);
  return port;
};

const EMPTY_EFFECTS: NonNullable<Port["effects"]> = [];

type ChildWidgetProps = {
  child: object;
  /** Dot-joined react-hook-form path of the child's field (stable string). */
  pathKey: string;
  parentKind: PortKind;
  bound?: string;
  options?: PortOptions;
};

/**
 * Renders a nested port (list item, dict value, union variant, model field)
 * the same way `ArgsContainer` renders a top-level one: through the registry
 * and wrapped in the port's effects, so hide rules and validators declared on
 * child ports apply at every depth.
 */
export const ChildWidget = React.memo(function ChildWidget({
  child,
  pathKey,
  parentKind,
  bound,
  options,
}: ChildWidgetProps) {
  const { registry } = useWidgetRegistry();
  const port = asChildPort(child);
  const path = useMemo(() => pathKey.split("."), [pathKey]);
  const Widget = registry.getInputWidgetForPort(port);
  const widgetProps: InputWidgetProps = {
    port,
    parentKind,
    widget: port.widget as unknown as AssignWidgetFragment,
    bound,
    options,
    path,
  };

  return (
    <div className="mt-2">
      <EffectWrapper
        effects={port.effects ?? EMPTY_EFFECTS}
        port={port}
        path={path}
        registry={registry}
      >
        <Widget {...widgetProps} />
      </EffectWrapper>
    </div>
  );
});
